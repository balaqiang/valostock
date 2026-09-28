// Light background jobs (node-cron, every minute): the timers of MONEY_RULES §9
// and docs/modeling/02-dfd.md §2.3. Each job is idempotent and safe to re-run.
import cron from 'node-cron';
import { env } from '../config/env.js';
import { AUTO_COMPLETE_HOURS, ORDER_PAYMENT_MINUTES, SUBSCRIPTION_PLANS } from '../config/money.js';
import { all, pool, run, withTransaction } from '../db/pool.js';
import { notifyStore } from '../lib/notify.js';
import { cancelUnpaidOrder } from '../modules/orders/order-state.js';
import { completeOrderTx } from '../modules/orders/orders.service.js';
import { applyResult, syncPayment } from '../modules/payments/payments.service.js';

/** Payments still PENDING after the Snap window: ask Midtrans once, otherwise EXPIRED (settles the record). */
async function expirePayments() {
  const stale = await all<{ midtrans_order_id: string }>(
    pool,
    `select midtrans_order_id from payments where status = 'PENDING' and created_at < now() - make_interval(mins => $1) limit 50`,
    [ORDER_PAYMENT_MINUTES + 5],
  );
  for (const p of stale) {
    try {
      const synced = env.PAYMENT_MODE === 'midtrans' ? await syncPayment(p.midtrans_order_id) : null;
      if (!synced || synced.status === 'PENDING') {
        await applyResult(p.midtrans_order_id, 'EXPIRED', { grossAmount: null, transactionId: null, paymentType: null });
      }
    } catch (error) {
      console.error('[jobs] expire payment', p.midtrans_order_id, error);
    }
  }
}

/** Orders never paid within 60 minutes → CANCELLED, accounts back on sale. */
async function cancelUnpaidOrders() {
  const orders = await all<{ id: string }>(
    pool,
    `select id from orders where status = 'PENDING_PAYMENT' and created_at < now() - make_interval(mins => $1) limit 50`,
    [ORDER_PAYMENT_MINUTES],
  );
  for (const o of orders) {
    await withTransaction((tx) => cancelUnpaidOrder(tx, o.id, `Tidak dibayar dalam ${ORDER_PAYMENT_MINUTES} menit — pesanan dibatalkan otomatis.`));
  }
}

/** 5 hours after "Akun aman" with no dispute → COMPLETED + escrow released. */
async function autoComplete() {
  const orders = await all<{ id: string }>(
    pool,
    `select id from orders where status = 'SAFE' and safe_at < now() - make_interval(hours => $1) limit 50`,
    [AUTO_COMPLETE_HOURS],
  );
  for (const o of orders) {
    try {
      await withTransaction((tx) => completeOrderTx(tx, o.id, 'SYSTEM'));
    } catch (error) {
      console.error('[jobs] auto-complete', o.id, error);
    }
  }
}

async function expireWindows() {
  await run(pool, `update offers set status = 'EXPIRED' where status in ('PENDING', 'COUNTERED', 'ACCEPTED') and expires_at < now()`);
  await run(pool, `update catalog_locks set status = 'EXPIRED' where status = 'ACTIVE' and expires_at < now()`);
  await run(pool, `update featured_listings set status = 'EXPIRED' where status = 'ACTIVE' and ends_at < now()`);
  // Paid plans that ran out fall back to FREE (commission 5%, 15 listings).
  const ended = await all<{ store_id: string; tier: string }>(
    pool,
    `update store_subscriptions set tier = 'FREE', commission_rate = $1, max_listings = $2, free_featured_slots = 0, used_featured_slots = 0,
       current_period_end = null
     where tier <> 'FREE' and current_period_end < now()
     returning store_id, 'ended' as tier`,
    [SUBSCRIPTION_PLANS.FREE.commissionRate, SUBSCRIPTION_PLANS.FREE.maxListings],
  );
  for (const s of ended) {
    await notifyStore(pool, s.store_id, { title: 'Langganan berakhir', body: 'Paket toko kembali ke Free. Perpanjang untuk komisi lebih rendah.', link: '/store-dashboard/subscription' });
  }
}

let running = false;

export async function runJobsOnce() {
  if (running) return;
  running = true;
  try {
    await expirePayments();
    await cancelUnpaidOrders();
    await autoComplete();
    await expireWindows();
  } catch (error) {
    console.error('[jobs]', error);
  } finally {
    running = false;
  }
}

export function startScheduler() {
  if (!env.JOBS_ENABLED) return;
  cron.schedule('* * * * *', () => void runJobsOnce());
  console.log('[jobs] scheduler aktif (tiap menit): pembayaran, pesanan belum dibayar, selesai otomatis, masa berlaku');
}
