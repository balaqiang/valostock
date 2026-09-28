import { env } from '../../config/env.js';
import type { GatewayMethod } from '../../config/money.js';
import { pool, run, withTransaction, type Db } from '../../db/pool.js';
import { audit } from '../../lib/audit.js';
import { notFound } from '../../lib/errors.js';
import { uuid } from '../../lib/ids.js';
import * as midtrans from './midtrans.js';
import * as repo from './payments.repository.js';
import { settle } from './settlement.js';

/** What the web app needs to send the buyer to the payment page. */
export type PaymentSession =
  | { mode: 'MIDTRANS_SNAP'; snapToken: string; redirectUrl: string }
  | { mode: 'BALANCE' };

export interface NewPayment {
  invoice: string;
  purpose: repo.PaymentPurpose;
  refId: string;
  userId: string | null;
  amount: number;
  method: GatewayMethod;
  customer: { name?: string; email?: string | null; phone?: string | null };
}

/** Step 1 (inside the caller's transaction): record the PENDING payment. */
export async function recordPayment(db: Db, p: NewPayment): Promise<void> {
  await repo.insertPayment(db, {
    id: uuid(),
    midtrans_order_id: p.invoice,
    purpose: p.purpose,
    ref_id: p.refId,
    user_id: p.userId,
    amount: p.amount,
    payment_method: p.method,
  });
}

/**
 * Step 2 (after commit): create the Snap transaction — or, in simulation mode,
 * point at the built-in fake payment page. Re-uses an existing redirect.
 */
export async function openPaymentPage(invoice: string, customer: NewPayment['customer']): Promise<PaymentSession> {
  const payment = await repo.findByInvoice(pool, invoice);
  if (!payment) throw notFound('Pembayaran');
  if (payment.snap_token && payment.redirect_url) {
    return { mode: 'MIDTRANS_SNAP', snapToken: payment.snap_token, redirectUrl: payment.redirect_url };
  }
  const snap =
    env.PAYMENT_MODE === 'simulation'
      ? { token: `SIM-${payment.id}`, redirectUrl: `${env.FRONTEND_URL}/payment/simulate?invoice=${encodeURIComponent(invoice)}` }
      : await midtrans.createSnapTransaction({ orderId: invoice, amount: payment.amount, method: payment.payment_method, customer });
  await repo.setSnap(pool, payment.id, snap.token, snap.redirectUrl);
  return { mode: 'MIDTRANS_SNAP', snapToken: snap.token, redirectUrl: snap.redirectUrl };
}

/**
 * Applies a final result exactly once: the payment row is locked and only
 * moves out of PENDING; the business record changes in the same transaction.
 */
export async function applyResult(
  invoice: string,
  result: midtrans.GatewayResult,
  info: { grossAmount: number | null; transactionId: string | null; paymentType: string | null },
): Promise<repo.PaymentRow> {
  return withTransaction(async (conn) => {
    const payment = await repo.findByInvoice(conn, invoice, true);
    if (!payment) throw notFound('Pembayaran');
    if (payment.status !== 'PENDING' || result === 'PENDING') return payment;

    if (result === 'PAID' && info.grossAmount !== null && info.grossAmount !== payment.amount) {
      await audit(conn, {
        actorId: null,
        action: 'payment.amount_mismatch',
        targetType: 'payment',
        targetId: payment.id,
        detail: { expected: payment.amount, got: info.grossAmount },
      });
      return payment; // never settle a payment whose amount doesn't match
    }

    await repo.setResult(conn, payment.id, result, info);
    await settle(conn, payment, result);
    return { ...payment, status: result };
  });
}

/** Ask Midtrans for the real status of a PENDING payment and apply it. */
export async function syncPayment(invoice: string): Promise<repo.PaymentRow> {
  const payment = await repo.findByInvoice(pool, invoice);
  if (!payment) throw notFound('Pembayaran');
  if (payment.status !== 'PENDING' || env.PAYMENT_MODE !== 'midtrans') return payment;
  const status = await midtrans.getTransactionStatus(invoice);
  return applyResult(invoice, status.result, status);
}

/** Where the web app sends the user after the payment page. */
export function nextPathFor(payment: repo.PaymentRow): string {
  switch (payment.purpose) {
    case 'TOPUP':
      return `/topup/invoice?q=${encodeURIComponent(payment.midtrans_order_id)}`;
    case 'BALANCE_FILL':
      return '/balance/history';
    case 'ORDER':
      return `/orders/${payment.ref_id}`;
    case 'STORE_DEPOSIT':
      return '/sell';
  }
}

/** POST /webhooks/midtrans — signed notification, stored once, then re-verified via the Status API. */
export async function handleNotification(body: Record<string, unknown>): Promise<void> {
  const fields = body as { order_id?: string; status_code?: string; gross_amount?: string; signature_key?: string; transaction_id?: string; transaction_status?: string };
  const signatureValid = env.PAYMENT_MODE === 'midtrans' && midtrans.verifySignature(fields);
  const payment = fields.order_id ? await repo.findByInvoice(pool, fields.order_id) : null;
  const externalId = `${fields.transaction_id ?? fields.order_id ?? 'unknown'}:${fields.transaction_status ?? 'unknown'}`;

  const inserted = await run(
    pool,
    `INSERT IGNORE INTO webhook_events (source, external_id, payment_id, payload, signature_valid)
     VALUES ('MIDTRANS', ?, ?, ?, ?)`,
    [externalId.slice(0, 120), payment?.id ?? null, JSON.stringify(body), signatureValid],
  );
  // Duplicate notification or forged/unknown one → nothing to do.
  if (inserted.affectedRows === 0 || !signatureValid || !payment) return;

  await syncPayment(payment.midtrans_order_id);
  await run(pool, 'UPDATE webhook_events SET processed = 1 WHERE source = ? AND external_id = ?', ['MIDTRANS', externalId.slice(0, 120)]);
}
