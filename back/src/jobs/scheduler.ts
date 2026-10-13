// Light background job (node-cron, every minute): expire unpaid invoices (MONEY_RULES §1).
// Idempotent and safe to re-run.
import cron from 'node-cron';
import { env } from '../config/env.js';
import { PAYMENT_EXPIRY_GRACE_MINUTES, PAYMENT_MINUTES } from '../config/money.js';
import { all, pool } from '../db/pool.js';
import { applyResult, syncPayment } from '../modules/payments/payments.service.js';

/** Payments still PENDING after the Snap window: ask Midtrans once, otherwise EXPIRED (settles the invoice). */
async function expirePayments() {
  const stale = await all<{ midtrans_order_id: string }>(
    pool,
    `select midtrans_order_id from payments where status = 'PENDING' and created_at < now() - make_interval(mins => $1) limit 50`,
    [PAYMENT_MINUTES + PAYMENT_EXPIRY_GRACE_MINUTES],
  );
  for (const p of stale) {
    try {
      const synced = env.PAYMENT_MODE === 'midtrans' ? await syncPayment(p.midtrans_order_id) : null;
      if (!synced || synced.status === 'PENDING') {
        await applyResult(p.midtrans_order_id, 'EXPIRED', { grossAmount: null, transactionId: null });
      }
    } catch (error) {
      console.error('[jobs] expire payment', p.midtrans_order_id, error);
    }
  }
}

let running = false;

export async function runJobsOnce() {
  if (running) return;
  running = true;
  try {
    await expirePayments();
  } catch (error) {
    console.error('[jobs]', error);
  } finally {
    running = false;
  }
}

export function startScheduler() {
  if (!env.JOBS_ENABLED) return;
  cron.schedule('* * * * *', () => void runJobsOnce());
  console.log('[jobs] scheduler aktif (tiap menit): invoice yang tidak dibayar → kedaluwarsa');
}
