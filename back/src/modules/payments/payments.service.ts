// Midtrans payments for top-up and Balance invoices (docs/ARCHITECTURE.md §5.2): record a
// PENDING payment inside the invoice's transaction, open Snap (or the built-in simulator)
// after commit, then apply the final result exactly once.
import { env } from '../../config/env.js';
import type { GatewayMethod } from '../../config/money.js';
import { one, pool, run, withTransaction, type Db } from '../../db/pool.js';
import { audit } from '../../lib/audit.js';
import { notFound } from '../../lib/errors.js';
import * as midtrans from './midtrans.js';
import { settle } from './settlement.js';

export type PaymentPurpose = 'TOPUP' | 'BALANCE_FILL';
export type PaymentStatus = 'PENDING' | 'PAID' | 'EXPIRED' | 'FAILED';

export interface PaymentRow {
  id: string;
  midtrans_order_id: string;
  purpose: PaymentPurpose;
  ref_id: string;
  amount: number;
  payment_method: GatewayMethod;
  snap_token: string | null;
  redirect_url: string | null;
  status: PaymentStatus;
  midtrans_transaction_id: string | null;
  created_at: string;
  paid_at: string | null;
}

/** What the web app needs to send the payer to the payment page. */
export type PaymentSession = { mode: 'MIDTRANS_SNAP'; snapToken: string; redirectUrl: string } | { mode: 'BALANCE' };

export interface NewPayment {
  invoice: string;
  purpose: PaymentPurpose;
  refId: string;
  amount: number;
  method: GatewayMethod;
}

export const findByInvoice = (db: Db, invoice: string, forUpdate = false) =>
  one<PaymentRow>(db, `select * from payments where midtrans_order_id = $1${forUpdate ? ' for update' : ''}`, [invoice]);

/** DFD 4.1, step 1 (inside the caller's transaction): the PENDING payment row. */
export async function recordPayment(db: Db, p: NewPayment): Promise<void> {
  await run(db, 'insert into payments (midtrans_order_id, purpose, ref_id, amount, payment_method) values ($1, $2, $3, $4, $5)', [
    p.invoice,
    p.purpose,
    p.refId,
    p.amount,
    p.method,
  ]);
}

/**
 * DFD 4.1, step 2 (after commit): create the Snap transaction — or, in simulation mode,
 * point at the built-in payment simulator page. Re-uses an existing redirect.
 */
export async function openPaymentPage(
  invoice: string,
  customer: { name?: string; email?: string | null; phone?: string | null } = {},
): Promise<PaymentSession> {
  const payment = await findByInvoice(pool, invoice);
  if (!payment) throw notFound('Pembayaran');
  if (payment.snap_token && payment.redirect_url) {
    return { mode: 'MIDTRANS_SNAP', snapToken: payment.snap_token, redirectUrl: payment.redirect_url };
  }
  const snap =
    env.PAYMENT_MODE === 'simulation'
      ? { token: `SIM-${payment.id}`, redirectUrl: `${env.FRONTEND_URL}/payment/simulate?invoice=${encodeURIComponent(invoice)}` }
      : await midtrans.createSnapTransaction({ orderId: invoice, amount: payment.amount, method: payment.payment_method, customer });
  await run(pool, 'update payments set snap_token = $1, redirect_url = $2 where id = $3', [snap.token, snap.redirectUrl, payment.id]);
  return { mode: 'MIDTRANS_SNAP', snapToken: snap.token, redirectUrl: snap.redirectUrl };
}

/**
 * DFD 4.4: applies a final result exactly once. The payment row is locked and only moves
 * out of PENDING; the invoice changes in the same transaction. A payment we already closed
 * (FAILED/EXPIRED) that Midtrans still reports as PAID is recorded as PAID and written to
 * the audit log for the admin — the money is never kept silently.
 */
export async function applyResult(
  invoice: string,
  result: midtrans.GatewayResult,
  info: { grossAmount: number | null; transactionId: string | null },
): Promise<PaymentRow> {
  return withTransaction(async (tx) => {
    const payment = await findByInvoice(tx, invoice, true);
    if (!payment) throw notFound('Pembayaran');
    if (payment.status === 'PAID' || result === 'PENDING') return payment;
    const late = payment.status !== 'PENDING';
    if (late && result !== 'PAID') return payment;

    if (result === 'PAID' && info.grossAmount !== null && info.grossAmount !== payment.amount) {
      await audit(tx, {
        actorId: null,
        action: 'payment.amount_mismatch',
        targetType: 'payment',
        targetId: payment.id,
        detail: { expected: payment.amount, got: info.grossAmount },
      });
      return payment; // never settle a payment whose amount doesn't match
    }

    await run(
      tx,
      `update payments set status = $1::payment_status, midtrans_transaction_id = coalesce($2, midtrans_transaction_id),
         paid_at = case when $1::payment_status = 'PAID' then now() else paid_at end
       where id = $3`,
      [result, info.transactionId, payment.id],
    );
    if (late) {
      await audit(tx, { actorId: null, action: 'payment.late_paid', targetType: 'payment', targetId: payment.id, detail: { previous: payment.status } });
    } else {
      await settle(tx, payment, result);
    }
    return { ...payment, status: result };
  });
}

/**
 * DFD 4.3: ask Midtrans for the real status and apply it. Normally only PENDING payments;
 * `includeClosed` (signed webhooks) also checks locally closed ones for late payments.
 */
export async function syncPayment(invoice: string, includeClosed = false): Promise<PaymentRow> {
  const payment = await findByInvoice(pool, invoice);
  if (!payment) throw notFound('Pembayaran');
  if (env.PAYMENT_MODE !== 'midtrans' || payment.status === 'PAID') return payment;
  if (payment.status !== 'PENDING' && !includeClosed) return payment;
  const status = await midtrans.getTransactionStatus(invoice);
  return applyResult(invoice, status.result, status);
}

/** Where the web app sends the user after the payment page. */
export function nextPathFor(payment: PaymentRow): string {
  return payment.purpose === 'TOPUP' ? `/topup/invoice?q=${encodeURIComponent(payment.midtrans_order_id)}` : '/balance';
}

/**
 * DFD 4.2: POST /webhooks/midtrans. Only a notification with a valid SHA512 signature for a known
 * invoice is acted on, and even then the status is re-read from the Status API (applyResult is idempotent).
 */
export async function handleNotification(body: Record<string, unknown>): Promise<void> {
  const fields = body as { order_id?: string; status_code?: string; gross_amount?: string; signature_key?: string };
  if (env.PAYMENT_MODE !== 'midtrans' || !midtrans.verifySignature(fields) || !fields.order_id) return;
  if (!(await findByInvoice(pool, fields.order_id))) return;
  await syncPayment(fields.order_id, true);
}
