// What a final payment result does to the business record it pays for
// (docs/ARCHITECTURE.md §5, DFD 4.0 / 6.0). Always runs inside the payment's
// transaction, after the payments row was locked and moved out of PENDING.
import { LOCK_MINUTES, SUBSCRIPTION_DAYS, SUBSCRIPTION_PLANS, type SubscriptionTier } from '../../config/money.js';
import { one, run, type Tx } from '../../db/pool.js';
import { audit } from '../../lib/audit.js';
import { randomCode } from '../../lib/ids.js';
import { earnPoints, moveStoreBalance, moveUserBalance, rewardReferral } from '../../lib/ledger.js';
import { notify, notifyStore } from '../../lib/notify.js';
import { cancelUnpaidOrder, setOrderCatalogs, systemMessage } from '../orders/order-state.js';
import type { PaymentRow } from './payments.service.js';

type Final = 'PAID' | 'FAILED' | 'EXPIRED';

/** Money received for something that no longer exists → refund queue (idempotent per payment). */
async function queueRefund(tx: Tx, payment: PaymentRow, source: 'PAID_AFTER_CANCEL' | 'LOCK_UNAVAILABLE', reference: string) {
  await run(
    tx,
    `insert into refunds (payment_id, user_id, amount, source, reference) values ($1, $2, $3, $4, $5) on conflict (payment_id) do nothing`,
    [payment.id, payment.user_id, payment.amount, source, reference],
  );
}

export async function settle(tx: Tx, payment: PaymentRow, result: Final) {
  switch (payment.purpose) {
    case 'TOPUP':
      return settleTopup(tx, payment, result);
    case 'BALANCE_FILL':
      return settleBalanceFill(tx, payment, result);
    case 'ORDER':
      return settleOrder(tx, payment, result);
    case 'STORE_DEPOSIT':
      return settleDeposit(tx, payment, result);
    case 'SUBSCRIPTION':
      return settleSubscription(tx, payment, result);
    case 'AD':
      return settleAd(tx, payment, result);
    case 'LOCK':
      return settleLock(tx, payment, result);
  }
}

async function settleTopup(tx: Tx, payment: PaymentRow, result: Final) {
  const order = await one<{ id: string; status: string; promo_code_id: number | null; user_id: string | null; amount: number; invoice_number: string }>(
    tx,
    'select id, status, promo_code_id, user_id, amount, invoice_number from topup_orders where id = $1 for update',
    [payment.ref_id],
  );
  if (!order || order.status !== 'PENDING') return;
  if (result !== 'PAID') {
    await run(tx, 'update topup_orders set status = $1 where id = $2', [result, order.id]);
    return;
  }
  // Game-currency delivery is SIMULATED in the prototype (Digiflazz in the full design).
  await run(tx, `update topup_orders set status = 'SUCCESS', paid_at = now(), provider_ref = $1 where id = $2`, [
    `SIM-${randomCode(8)}`,
    order.id,
  ]);
  if (order.promo_code_id) await run(tx, 'update promo_codes set used_count = used_count + 1 where id = $1', [order.promo_code_id]);
  if (order.user_id) {
    await earnPoints(tx, order.user_id, order.amount, order.invoice_number);
    await rewardReferral(tx, order.user_id, order.invoice_number);
  }
}

async function settleBalanceFill(tx: Tx, payment: PaymentRow, result: Final) {
  const fill = await one<{ id: string; user_id: string; credit: number; status: string; invoice_number: string }>(
    tx,
    'select id, user_id, credit, status, invoice_number from balance_topups where id = $1 for update',
    [payment.ref_id],
  );
  if (!fill || fill.status !== 'PENDING') return;
  if (result !== 'PAID') {
    await run(tx, 'update balance_topups set status = $1 where id = $2', [result, fill.id]);
    return;
  }
  await run(tx, `update balance_topups set status = 'PAID', paid_at = now() where id = $1`, [fill.id]);
  await moveUserBalance(tx, fill.user_id, { type: 'TOPUP_CREDIT', amount: fill.credit, reference: fill.invoice_number });
}

interface OrderForSettle {
  id: string;
  order_number: string;
  status: string;
  buyer_id: string;
  store_id: string;
  offer_id: string | null;
  bundle_id: string | null;
  voucher_id: string | null;
  voucher_discount: number;
  lock_id: string | null;
  item_price: number;
  room_code: string;
}

async function settleOrder(tx: Tx, payment: PaymentRow, result: Final) {
  const order = await one<OrderForSettle>(tx, 'select * from orders where id = $1 for update', [payment.ref_id]);
  if (!order) return;
  if (order.status !== 'PENDING_PAYMENT') {
    if (result === 'PAID') {
      // Paid after the order was cancelled: queued for an admin refund (MONEY_RULES §12b).
      await queueRefund(tx, payment, 'PAID_AFTER_CANCEL', order.order_number);
      await audit(tx, {
        actorId: null,
        action: 'payment.paid_after_cancel',
        targetType: 'order',
        targetId: order.id,
        detail: { invoice: payment.midtrans_order_id },
      });
    }
    return;
  }
  if (result !== 'PAID') {
    await cancelUnpaidOrder(tx, order.id, 'Pembayaran gagal atau kedaluwarsa. Pesanan dibatalkan dan akun kembali dijual.');
    return;
  }

  await run(tx, `update orders set status = 'PAID', paid_at = now(), payment_method = $1 where id = $2`, [payment.payment_method, order.id]);
  await setOrderCatalogs(tx, order.id, ['LOCKED'], 'IN_ORDER');
  await moveStoreBalance(tx, order.store_id, [
    { bucket: 'ESCROW', type: 'ESCROW_HOLD', amount: order.item_price, refType: 'order', refId: order.id, note: order.order_number },
  ]);
  if (order.offer_id) await run(tx, `update offers set status = 'USED' where id = $1`, [order.offer_id]);
  if (order.lock_id) await run(tx, `update catalog_locks set status = 'USED' where id = $1`, [order.lock_id]);
  if (order.bundle_id) await run(tx, `update bundles set status = 'SOLD' where id = $1`, [order.bundle_id]);
  if (order.voucher_id && order.voucher_discount > 0) {
    await run(tx, 'insert into voucher_redemptions (voucher_id, user_id, order_id, discount) values ($1, $2, $3, $4)', [
      order.voucher_id,
      order.buyer_id,
      order.id,
      order.voucher_discount,
    ]);
    await run(tx, 'update store_vouchers set used = used + 1 where id = $1', [order.voucher_id]);
  }
  // Other buyers' open offers on these catalogs can no longer be honoured.
  await run(
    tx,
    `update offers set status = 'EXPIRED' where status in ('PENDING', 'COUNTERED', 'ACCEPTED')
       and catalog_id in (select catalog_id from order_items where order_id = $1)`,
    [order.id],
  );
  await systemMessage(
    tx,
    order.id,
    `Pembayaran diterima. Rekber Room ${order.room_code} dibuka, dana ditahan (escrow) sampai pesanan selesai. Toko, silakan kirim data akun di sini.`,
  );
  await notify(tx, order.buyer_id, {
    kind: 'ORDER',
    title: 'Pembayaran diterima',
    body: `Pesanan ${order.order_number} sudah dibayar. Tunggu toko mengirim data akun di Rekber Room.`,
    link: `/orders/${order.id}`,
  });
  await notifyStore(tx, order.store_id, {
    kind: 'ORDER',
    title: 'Pesanan baru dibayar',
    body: `Pesanan ${order.order_number} sudah dibayar. Kirim data akun lewat Rekber Room.`,
    link: `/store-dashboard/orders/${order.id}`,
  });
}

async function settleDeposit(tx: Tx, payment: PaymentRow, result: Final) {
  if (result !== 'PAID') return; // the store can simply try again
  if (payment.meta.topUp === true) {
    // An active store paying back a deposit shortfall (after fines) — MONEY_RULES §12.
    await moveStoreBalance(tx, payment.ref_id, [
      { bucket: 'DEPOSIT', type: 'DEPOSIT_HOLD', amount: payment.amount, refType: 'deposit', refId: payment.id, note: 'Top-up deposit' },
    ]);
    await notifyStore(tx, payment.ref_id, { title: 'Deposit dilengkapi', body: `Deposit bertambah Rp${payment.amount.toLocaleString('id-ID')}.`, link: '/store-dashboard/settings' });
    return;
  }
  const changed = await run(
    tx,
    `update stores set deposit_status = 'HELD', status = 'PENDING_REVIEW' where id = $1 and status = 'PENDING_DEPOSIT'`,
    [payment.ref_id],
  );
  if (changed > 0) {
    await notifyStore(tx, payment.ref_id, {
      title: 'Deposit diterima',
      body: 'Deposit Rp500.000 sudah diterima. Toko kamu sedang ditinjau admin.',
      link: '/store-dashboard',
    });
  }
}

async function settleSubscription(tx: Tx, payment: PaymentRow, result: Final) {
  if (result !== 'PAID') return;
  const tier = payment.meta.tier as SubscriptionTier | undefined;
  if (!tier || tier === 'FREE' || !(tier in SUBSCRIPTION_PLANS)) return;
  const plan = SUBSCRIPTION_PLANS[tier];
  // Same tier again = extend from the current end; a new tier starts today.
  await run(
    tx,
    `update store_subscriptions set
       current_period_end = case when tier = $1::subscription_tier and current_period_end > now()
                                 then current_period_end else now() end + make_interval(days => $2),
       used_featured_slots = case when tier = $1::subscription_tier then used_featured_slots else 0 end,
       tier = $1, commission_rate = $3, max_listings = $4, free_featured_slots = $5
     where store_id = $6`,
    [tier, SUBSCRIPTION_DAYS, plan.commissionRate, plan.maxListings, plan.freeFeaturedSlots, payment.ref_id],
  );
  await notifyStore(tx, payment.ref_id, {
    title: `Langganan ${tier} aktif`,
    body: `Komisi ${(plan.commissionRate * 100).toLocaleString('id-ID')}%, ${plan.maxListings ?? 'tanpa batas'} katalog aktif, ${plan.freeFeaturedSlots} slot iklan gratis.`,
    link: '/store-dashboard/subscription',
  });
}

async function settleAd(tx: Tx, payment: PaymentRow, result: Final) {
  const ad = await one<{ id: string; store_id: string; duration_days: number; status: string }>(
    tx,
    'select id, store_id, duration_days, status from featured_listings where id = $1 for update',
    [payment.ref_id],
  );
  if (!ad || ad.status !== 'PENDING_PAYMENT') return;
  if (result !== 'PAID') {
    await run(tx, `update featured_listings set status = 'STOPPED', stop_reason = 'Pembayaran gagal' where id = $1`, [ad.id]);
    return;
  }
  await run(
    tx,
    `update featured_listings set status = 'ACTIVE', starts_at = now(), ends_at = now() + make_interval(days => $1) where id = $2`,
    [ad.duration_days, ad.id],
  );
  await notifyStore(tx, ad.store_id, { title: 'Iklan aktif', body: `Featured listing aktif selama ${ad.duration_days} hari.`, link: '/store-dashboard/ads' });
}

async function settleLock(tx: Tx, payment: PaymentRow, result: Final) {
  const lock = await one<{ id: string; catalog_id: string; buyer_id: string; status: string }>(
    tx,
    'select id, catalog_id, buyer_id, status from catalog_locks where id = $1 for update',
    [payment.ref_id],
  );
  if (!lock || lock.status !== 'PENDING_PAYMENT') return;
  if (result !== 'PAID') {
    await run(tx, `update catalog_locks set status = 'EXPIRED' where id = $1`, [lock.id]);
    return;
  }
  const catalog = await one<{ status: string }>(tx, 'select status from catalogs where id = $1 for update', [lock.catalog_id]);
  const taken = await one(tx, `select 1 from catalog_locks where catalog_id = $1 and status = 'ACTIVE' and expires_at > now()`, [lock.catalog_id]);
  if (catalog?.status !== 'LISTED' || taken) {
    await run(tx, `update catalog_locks set status = 'EXPIRED' where id = $1`, [lock.id]);
    await queueRefund(tx, payment, 'LOCK_UNAVAILABLE', payment.midtrans_order_id);
    await audit(tx, { actorId: null, action: 'lock.paid_unavailable', targetType: 'catalog_lock', targetId: lock.id, detail: { invoice: payment.midtrans_order_id } });
    await notify(tx, lock.buyer_id, {
      kind: 'ORDER',
      title: 'Lock gagal',
      body: 'Akun sudah tidak tersedia saat pembayaran lock diterima. Biaya lock masuk antrean refund admin.',
      link: `/catalog/${lock.catalog_id}`,
    });
    return;
  }
  // Expire any stale ACTIVE lock first (unique index: one ACTIVE lock per catalog).
  await run(tx, `update catalog_locks set status = 'EXPIRED' where catalog_id = $1 and status = 'ACTIVE'`, [lock.catalog_id]);
  await run(tx, `update catalog_locks set status = 'ACTIVE', expires_at = now() + make_interval(mins => $1) where id = $2`, [LOCK_MINUTES, lock.id]);
  await notify(tx, lock.buyer_id, {
    kind: 'ORDER',
    title: 'Akun dikunci untukmu',
    body: `Akun dikunci ${LOCK_MINUTES} menit. Selesaikan pembelian sebelum waktu habis.`,
    link: `/catalog/${lock.catalog_id}`,
  });
}
