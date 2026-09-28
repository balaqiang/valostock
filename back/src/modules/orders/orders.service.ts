// Account purchase with escrow and rekber (DFD 6.0; docs/ARCHITECTURE.md §5.2):
// PENDING_PAYMENT → PAID → IN_REKBER → SAFE → COMPLETED (buyer, or 5 h after SAFE),
// or → CANCELLED before payment, → DISPUTED / REFUNDED through a dispute.
import {
  PROTECTION_FEE,
  commissionFor,
  discountFor,
  handlingFeeFor,
  protectionDaysFor,
  type GatewayMethod,
} from '../../config/money.js';
import { all, one, pool, run, withTransaction, type Db, type Tx } from '../../db/pool.js';
import { badRequest, conflict, forbidden, notFound } from '../../lib/errors.js';
import { documentNumber, randomCode } from '../../lib/ids.js';
import { earnPoints, moveStoreBalance, rewardReferral } from '../../lib/ledger.js';
import { notify, notifyStore } from '../../lib/notify.js';
import type { AuthUser } from '../../middlewares/auth.js';
import { catalogImageUrl } from '../../supabase/storage.js';
import { activeLock } from '../offers/offers.routes.js';
import * as payments from '../payments/payments.service.js';
import { USABLE_VOUCHER } from '../public/public.repository.js';
import { cancelUnpaidOrder, setOrderCatalogs, systemMessage } from './order-state.js';

export type ViewerRole = 'BUYER' | 'STORE' | 'ADMIN';
export type OrderStatus = 'PENDING_PAYMENT' | 'PAID' | 'IN_REKBER' | 'SAFE' | 'COMPLETED' | 'CANCELLED' | 'DISPUTED' | 'REFUNDED';

export interface OrderRow {
  id: string;
  order_number: string;
  buyer_id: string;
  store_id: string;
  offer_id: string | null;
  bundle_id: string | null;
  voucher_id: string | null;
  lock_id: string | null;
  items_subtotal: number;
  voucher_discount: number;
  item_price: number;
  handling_fee: number;
  protection_fee: number;
  total_paid: number;
  commission_rate: number;
  commission: number;
  store_receives: number;
  payment_method: string | null;
  status: OrderStatus;
  room_code: string;
  protection_until: string | null;
  created_at: string;
  paid_at: string | null;
  delivered_at: string | null;
  safe_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  store_slug: string;
  store_name: string;
  store_owner_id: string;
  store_type: string;
  buyer_name: string;
  buyer_email: string;
  items: { catalogId: string; vsCode: string; title: string; price: number; game: string; image: string | null }[];
  payment_invoice: string | null;
  payment_status: string | null;
  payment_redirect: string | null;
  dispute_id: string | null;
  dispute_status: string | null;
  rating_id: string | null;
  voucher_code: string | null;
  bundle_title: string | null;
}

export const ORDER_SELECT = `
  select o.*, s.slug as store_slug, s.name as store_name, s.owner_id as store_owner_id, s.type as store_type,
         p.name as buyer_name, p.email as buyer_email,
         (select coalesce(json_agg(json_build_object(
             'catalogId', oi.catalog_id, 'vsCode', oi.vs_code, 'title', oi.title, 'price', oi.price, 'game', g.slug,
             'image', (select ci.storage_path from catalog_images ci where ci.catalog_id = oi.catalog_id order by ci.sort_order limit 1)
           ) order by oi.title), '[]'::json)
          from order_items oi join catalogs c on c.id = oi.catalog_id join games g on g.id = c.game_id
          where oi.order_id = o.id) as items,
         pay.midtrans_order_id as payment_invoice, pay.status as payment_status, pay.redirect_url as payment_redirect,
         d.id as dispute_id, d.status as dispute_status, r.id as rating_id,
         v.code as voucher_code, b.title as bundle_title
  from orders o
  join stores s on s.id = o.store_id
  join profiles p on p.id = o.buyer_id
  left join lateral (select * from payments x where x.purpose = 'ORDER' and x.ref_id = o.id order by x.created_at desc limit 1) pay on true
  left join disputes d on d.order_id = o.id
  left join ratings r on r.order_id = o.id
  left join store_vouchers v on v.id = o.voucher_id
  left join bundles b on b.id = o.bundle_id`;

const AUTO_COMPLETE_MS = 5 * 3600 * 1000;

export function toOrderView(o: OrderRow, viewer: ViewerRole) {
  const first = o.items[0];
  const protectionActive = o.protection_until !== null && new Date(o.protection_until).getTime() > Date.now();
  return {
    id: o.id,
    orderNumber: o.order_number,
    status: o.status,
    viewerRole: viewer,
    catalog: {
      id: first?.catalogId ?? '',
      title: o.bundle_title ?? first?.title ?? '-',
      image: first?.image ? catalogImageUrl(first.image) : '/images/Valorant_Points.png',
      game: first?.game ?? '',
    },
    items: o.items.map((i) => ({ ...i, image: i.image ? catalogImageUrl(i.image) : '/images/Valorant_Points.png' })),
    isBundle: o.bundle_id !== null,
    store: { slug: o.store_slug, name: o.store_name, type: o.store_type },
    buyer: { name: o.buyer_name, ...(viewer === 'ADMIN' ? { email: o.buyer_email } : {}) },
    roomCode: o.room_code,
    itemsSubtotal: o.items_subtotal,
    voucherCode: o.voucher_code,
    voucherDiscount: o.voucher_discount,
    viaOffer: o.offer_id !== null,
    itemPrice: o.item_price,
    handlingFee: o.handling_fee,
    protectionFee: o.protection_fee,
    totalPaid: o.total_paid,
    commissionRate: o.commission_rate,
    commission: o.commission,
    storeReceives: o.store_receives,
    paymentMethod: o.payment_method,
    payment: o.payment_invoice ? { invoice: o.payment_invoice, status: o.payment_status, redirectUrl: o.payment_redirect } : null,
    dispute: o.dispute_id ? { id: o.dispute_id, status: o.dispute_status } : null,
    rated: o.rating_id !== null,
    protectionUntil: o.protection_until,
    canDispute:
      viewer === 'BUYER' &&
      !o.dispute_id &&
      (['PAID', 'IN_REKBER', 'SAFE'].includes(o.status) || (o.status === 'COMPLETED' && protectionActive)),
    canRate: viewer === 'BUYER' && o.status === 'COMPLETED' && o.rating_id === null,
    autoCompleteAt: o.status === 'SAFE' && o.safe_at ? new Date(new Date(o.safe_at).getTime() + AUTO_COMPLETE_MS).toISOString() : null,
    createdAt: o.created_at,
    paidAt: o.paid_at,
    deliveredAt: o.delivered_at,
    safeAt: o.safe_at,
    completedAt: o.completed_at,
    cancelledAt: o.cancelled_at,
  };
}
export type OrderView = ReturnType<typeof toOrderView>;

export const findOrder = (db: Db, id: string) => one<OrderRow>(db, `${ORDER_SELECT} where o.id = $1`, [id]);

function roleOf(user: AuthUser, order: OrderRow): ViewerRole | null {
  if (order.buyer_id === user.id) return 'BUYER';
  if (order.store_owner_id === user.id) return 'STORE';
  if (user.role === 'ADMIN') return 'ADMIN';
  return null;
}

/** Loads an order the user may see (buyer, owner of its store, or admin) — anti-IDOR. */
export async function getOrderFor(user: AuthUser, orderId: string) {
  const order = await findOrder(pool, orderId);
  const role = order ? roleOf(user, order) : null;
  if (!order || !role) throw notFound('Pesanan'); // don't reveal that the id exists
  return { order, role };
}

export async function listBuyerOrders(userId: string) {
  return (await all<OrderRow>(pool, `${ORDER_SELECT} where o.buyer_id = $1 order by o.created_at desc limit 200`, [userId])).map((o) =>
    toOrderView(o, 'BUYER'),
  );
}

export async function listStoreOrders(storeId: string, status?: string) {
  return (
    await all<OrderRow>(
      pool,
      `${ORDER_SELECT} where o.store_id = $1 and ($2::order_status is null or o.status = $2) order by o.created_at desc limit 200`,
      [storeId, status ?? null],
    )
  ).map((o) => toOrderView(o, 'STORE'));
}

// ── Checkout ──

export interface CreateOrderInput {
  catalogId?: string;
  bundleId?: string;
  offerId?: string;
  voucherCode?: string;
}

interface SaleItem {
  id: string;
  vs_code: string | null;
  title: string;
  price: number;
  status: string;
  store_id: string;
  store_status: string;
  owner_id: string;
  sale_price: number | null;
}

const ITEM_SELECT = `select c.id, c.vs_code, c.title, c.price, c.status, c.store_id, s.status as store_status, s.owner_id,
    (select min(f.sale_price) from flash_sales f where f.catalog_id = c.id and now() between f.starts_at and f.ends_at) as sale_price
  from catalogs c join stores s on s.id = c.store_id`;

/** Splits a bundle price over its items, proportional to their list prices (sums exactly). */
function allocate(total: number, prices: number[]): number[] {
  const sum = prices.reduce((a, b) => a + b, 0);
  const parts = prices.map((p) => Math.max(1, Math.floor((total * p) / sum)));
  parts[parts.length - 1]! += total - parts.reduce((a, b) => a + b, 0);
  return parts;
}

/** DFD 6.1: price the order server-side, reserve the catalogs (LOCKED), create PENDING_PAYMENT. */
export async function createOrder(user: AuthUser, input: CreateOrderInput): Promise<string> {
  if (!input.catalogId && !input.bundleId) throw badRequest('Pilih katalog atau bundle.');
  return withTransaction(async (tx) => {
    let items: SaleItem[];
    let prices: number[];
    let bundleId: string | null = null;
    let offerId: string | null = null;

    if (input.bundleId) {
      const bundle = await one<{ id: string; bundle_price: number; status: string; store_id: string }>(
        tx,
        'select id, bundle_price, status, store_id from bundles where id = $1 for update',
        [input.bundleId],
      );
      if (!bundle || bundle.status !== 'ACTIVE') throw notFound('Bundle');
      items = await all<SaleItem>(
        tx,
        `${ITEM_SELECT} where c.id in (select catalog_id from bundle_items where bundle_id = $1) order by c.id for update of c`,
        [bundle.id],
      );
      prices = allocate(bundle.bundle_price, items.map((i) => i.price));
      bundleId = bundle.id;
    } else {
      items = await all<SaleItem>(tx, `${ITEM_SELECT} where c.id = $1 for update of c`, [input.catalogId!]);
      const item = items[0];
      if (!item) throw notFound('Katalog');
      let price = item.sale_price !== null && item.sale_price < item.price ? item.sale_price : item.price;
      if (input.offerId) {
        const offer = await one<{ id: string; amount: number; counter_amount: number | null }>(
          tx,
          `select id, amount, counter_amount from offers
           where id = $1 and buyer_id = $2 and catalog_id = $3 and status = 'ACCEPTED' and expires_at > now() for update`,
          [input.offerId, user.id, item.id],
        );
        if (!offer) throw conflict('Tawaran sudah tidak berlaku.', 'OFFER_INVALID');
        price = offer.counter_amount ?? offer.amount;
        offerId = offer.id;
      }
      prices = [price];
    }

    if (items.length === 0) throw notFound('Katalog');
    const storeId = items[0]!.store_id;
    if (items.some((i) => i.store_status !== 'ACTIVE' || i.store_id !== storeId)) throw notFound('Katalog');
    if (items[0]!.owner_id === user.id) throw badRequest('Tidak bisa membeli katalog tokomu sendiri.');

    // The same buyer clicking "Beli" again gets their open order back.
    const open = await one<{ id: string }>(
      tx,
      `select o.id from orders o join order_items oi on oi.order_id = o.id
       where o.buyer_id = $1 and o.status = 'PENDING_PAYMENT' and oi.catalog_id = any($2::uuid[]) limit 1`,
      [user.id, items.map((i) => i.id)],
    );
    if (open) return open.id;
    if (items.some((i) => i.status !== 'LISTED')) throw conflict('Akun ini sedang dalam transaksi lain atau sudah terjual.', 'CATALOG_UNAVAILABLE');

    let lockId: string | null = null;
    for (const item of items) {
      const lock = await activeLock(tx, item.id);
      if (lock && lock.buyer_id !== user.id) throw conflict('Akun ini sedang dikunci pembeli lain. Coba lagi nanti.', 'LOCKED');
      if (lock) lockId = lock.id;
    }

    const subtotal = prices.reduce((a, b) => a + b, 0);
    let voucherId: string | null = null;
    let discount = 0;
    if (input.voucherCode) {
      const v = await one<{ id: string; kind: 'PERCENT' | 'FIXED'; value: number; min_spend: number }>(
        tx,
        `select v.id, v.kind, v.value, v.min_spend from store_vouchers v where v.store_id = $1 and v.code = $2 and ${USABLE_VOUCHER}`,
        [storeId, input.voucherCode.trim().toUpperCase()],
      );
      if (!v) throw badRequest('Voucher toko tidak ditemukan atau sudah tidak berlaku.', 'VOUCHER_INVALID');
      if (subtotal < v.min_spend) throw badRequest(`Minimal belanja untuk voucher ini Rp${v.min_spend.toLocaleString('id-ID')}.`, 'VOUCHER_MIN');
      discount = Math.min(discountFor(v, subtotal), subtotal - 10_000);
      if (discount <= 0) throw badRequest('Voucher tidak bisa dipakai untuk harga ini.', 'VOUCHER_INVALID');
      voucherId = v.id;
    }

    const itemPrice = subtotal - discount;
    const rate = (await one<{ commission_rate: number }>(tx, 'select commission_rate from store_subscriptions where store_id = $1', [storeId]))?.commission_rate ?? 0.05;
    const handling = handlingFeeFor(itemPrice);
    const commission = commissionFor(itemPrice, rate);
    const roomCode = `${items[0]!.vs_code ?? 'VS'}-${randomCode(4)}`;

    const order = await one<{ id: string }>(
      tx,
      `insert into orders (order_number, buyer_id, store_id, offer_id, bundle_id, voucher_id, lock_id, items_subtotal, voucher_discount,
         item_price, handling_fee, protection_fee, total_paid, commission_rate, commission, store_receives, room_code)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17) returning id`,
      [
        documentNumber('ORD'),
        user.id,
        storeId,
        offerId,
        bundleId,
        voucherId,
        lockId,
        subtotal,
        discount,
        itemPrice,
        handling,
        PROTECTION_FEE,
        itemPrice + handling + PROTECTION_FEE,
        rate,
        commission,
        itemPrice - commission,
        roomCode,
      ],
    );
    for (const [i, item] of items.entries()) {
      await run(tx, 'insert into order_items (order_id, catalog_id, vs_code, title, price) values ($1, $2, $3, $4, $5)', [
        order!.id,
        item.id,
        item.vs_code ?? '-',
        item.title,
        prices[i]!,
      ]);
    }
    await run(tx, `update catalogs set status = 'LOCKED' where id = any($1::uuid[])`, [items.map((i) => i.id)]);
    return order!.id;
  });
}

/** Start (or resume) the Midtrans payment of an order. */
export async function payOrder(user: AuthUser, orderId: string, method: GatewayMethod) {
  const { order, role } = await getOrderFor(user, orderId);
  if (role !== 'BUYER') throw forbidden();
  if (order.status !== 'PENDING_PAYMENT') throw conflict('Pesanan ini tidak menunggu pembayaran.', 'BAD_STATE');
  const pending = await payments.findPendingFor(pool, 'ORDER', order.id);
  const invoice = pending?.midtrans_order_id ?? order.order_number;
  if (!pending) {
    if (await one(pool, 'select 1 from payments where midtrans_order_id = $1', [invoice])) throw conflict('Pembayaran pesanan ini sudah diproses.', 'BAD_STATE');
    await payments.recordPayment(pool, { invoice, purpose: 'ORDER', refId: order.id, userId: user.id, amount: order.total_paid, method });
  }
  const payment = await payments.openPaymentPage(invoice, { name: user.name, email: user.email });
  return { invoice, payment };
}

export async function cancelOrder(user: AuthUser, orderId: string) {
  const { order, role } = await getOrderFor(user, orderId);
  if (role !== 'BUYER' && role !== 'ADMIN') throw forbidden();
  await withTransaction(async (tx) => {
    const ok = await cancelUnpaidOrder(tx, order.id, role === 'ADMIN' ? 'Pesanan dibatalkan admin sebelum dibayar.' : 'Pesanan dibatalkan pembeli.');
    if (!ok) throw conflict('Pesanan yang sudah dibayar tidak bisa dibatalkan (gunakan sengketa).', 'BAD_STATE');
  });
}

// ── Rekber room (DFD 6.3) ──

export async function markSafe(user: AuthUser, orderId: string) {
  const { order, role } = await getOrderFor(user, orderId);
  if (role !== 'BUYER') throw forbidden();
  await withTransaction(async (tx) => {
    const changed = await run(tx, `update orders set status = 'SAFE', safe_at = now() where id = $1 and status = 'IN_REKBER'`, [order.id]);
    if (changed === 0) throw conflict('Tunggu toko mengirim data akun di Rekber Room dulu.', 'BAD_STATE');
    await systemMessage(tx, order.id, 'Pembeli mengonfirmasi akun sudah aman (email & password diganti). Pesanan selesai otomatis 5 jam lagi jika tidak ada sengketa.');
    await notifyStore(tx, order.store_id, {
      kind: 'ORDER',
      title: 'Akun dikonfirmasi aman',
      body: `${order.order_number}: dana dilepas maksimal 5 jam lagi.`,
      link: `/store-dashboard/orders/${order.id}`,
    });
  });
}

/**
 * DFD 6.5: complete + release escrow in ONE transaction:
 * escrow −item_price, available +item_price, available −commission (3 ledger rows),
 * catalogs SOLD, protection window starts, buyer earns points (+ referral reward).
 */
export async function completeOrderTx(tx: Tx, orderId: string, by: 'BUYER' | 'SYSTEM' | 'ADMIN', allowFrom: OrderStatus[] = ['SAFE']) {
  const o = await one<{ id: string; order_number: string; status: OrderStatus; buyer_id: string; store_id: string; item_price: number; commission: number; commission_rate: number; total_paid: number }>(
    tx,
    'select id, order_number, status, buyer_id, store_id, item_price, commission, commission_rate, total_paid from orders where id = $1 for update',
    [orderId],
  );
  if (!o || !allowFrom.includes(o.status)) return false;
  const days = protectionDaysFor(o.item_price);
  await run(
    tx,
    `update orders set status = 'COMPLETED', completed_at = now(), protection_until = now() + make_interval(days => $1) where id = $2`,
    [days, o.id],
  );
  const sold = await setOrderCatalogs(tx, o.id, ['IN_ORDER', 'LOCKED'], 'SOLD');
  await run(tx, 'update stores set sold = sold + $1 where id = $2', [sold, o.store_id]);
  await moveStoreBalance(tx, o.store_id, [
    { bucket: 'ESCROW', type: 'ESCROW_RELEASE', amount: -o.item_price, refType: 'order', refId: o.id, note: o.order_number },
    { bucket: 'AVAILABLE', type: 'ESCROW_RELEASE', amount: o.item_price, refType: 'order', refId: o.id, note: o.order_number },
    {
      bucket: 'AVAILABLE',
      type: 'COMMISSION',
      amount: -o.commission,
      refType: 'order',
      refId: o.id,
      note: `Komisi ${(o.commission_rate * 100).toLocaleString('id-ID')}%`,
    },
  ]);
  await earnPoints(tx, o.buyer_id, o.item_price, o.order_number);
  await rewardReferral(tx, o.buyer_id, o.order_number);
  const who = { BUYER: 'Pembeli menekan Selesai', SYSTEM: 'Selesai otomatis 5 jam setelah akun aman', ADMIN: 'Diselesaikan lewat putusan admin' }[by];
  await systemMessage(tx, o.id, `${who}. Dana (dikurangi komisi) diteruskan ke saldo toko. Proteksi aktif ${days} hari.`);
  await notify(tx, o.buyer_id, {
    kind: 'ORDER',
    title: 'Pesanan selesai',
    body: `${o.order_number} selesai. Beri penilaian untuk toko — proteksi aktif ${days} hari.`,
    link: `/orders/${o.id}`,
  });
  await notifyStore(tx, o.store_id, {
    kind: 'ORDER',
    title: 'Dana dilepas',
    body: `${o.order_number} selesai. Rp${(o.item_price - o.commission).toLocaleString('id-ID')} masuk ke saldo tersedia.`,
    link: '/store-dashboard/balance',
  });
  return true;
}

export async function completeOrder(user: AuthUser, orderId: string) {
  const { order, role } = await getOrderFor(user, orderId);
  if (role !== 'BUYER') throw forbidden();
  await withTransaction(async (tx) => {
    if (!(await completeOrderTx(tx, order.id, 'BUYER'))) throw conflict('Konfirmasi "Akun aman" dulu sebelum menyelesaikan pesanan.', 'BAD_STATE');
  });
}

// ── Rating (after completion) ──

export async function rateOrder(
  user: AuthUser,
  orderId: string,
  input: { overall: -1 | 0 | 1; descAccuracy: number; attitude: number; deliverySpeed: number; comment?: string },
) {
  const { order, role } = await getOrderFor(user, orderId);
  if (role !== 'BUYER') throw forbidden();
  if (order.status !== 'COMPLETED') throw conflict('Penilaian bisa diberikan setelah pesanan selesai.', 'BAD_STATE');
  await withTransaction(async (tx) => {
    const inserted = await run(
      tx,
      `insert into ratings (order_id, store_id, buyer_id, overall, desc_accuracy, attitude, delivery_speed, comment)
       values ($1, $2, $3, $4, $5, $6, $7, $8) on conflict (order_id) do nothing`,
      [order.id, order.store_id, user.id, input.overall, input.descAccuracy, input.attitude, input.deliverySpeed, input.comment ?? null],
    );
    if (inserted === 0) throw conflict('Pesanan ini sudah dinilai.', 'RATED');
    // Running averages (1–5). Overall rating = mean of the three service scores.
    const avg = (input.descAccuracy + input.attitude + input.deliverySpeed) / 3;
    await run(
      tx,
      `update stores set
         rating = round(((rating * reviews + $1) / (reviews + 1))::numeric, 2),
         score_desc = round(((score_desc * reviews + $2) / (reviews + 1))::numeric, 2),
         score_attitude = round(((score_attitude * reviews + $3) / (reviews + 1))::numeric, 2),
         score_delivery = round(((score_delivery * reviews + $4) / (reviews + 1))::numeric, 2),
         reviews = reviews + 1
       where id = $5`,
      [avg, input.descAccuracy, input.attitude, input.deliverySpeed, order.store_id],
    );
    await notifyStore(tx, order.store_id, { title: 'Ulasan baru', body: `${order.order_number}: ${input.comment ?? 'tanpa komentar'}`, link: '/store-dashboard/ratings' });
  });
}
