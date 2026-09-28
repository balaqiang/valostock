// Midtrans payments for every purpose (docs/ARCHITECTURE.md §4): record a
// PENDING payment inside the business transaction, open Snap (or the built-in
// simulator) after commit, then apply the final result exactly once.
import { env } from '../../config/env.js';
import type { GatewayMethod } from '../../config/money.js';
import { json, one, pool, run, withTransaction, type Db } from '../../db/pool.js';
import { audit } from '../../lib/audit.js';
import { notFound } from '../../lib/errors.js';
import * as midtrans from './midtrans.js';
import { settle } from './settlement.js';

export type PaymentPurpose = 'TOPUP' | 'BALANCE_FILL' | 'ORDER' | 'STORE_DEPOSIT' | 'SUBSCRIPTION' | 'AD' | 'LOCK';
export type PaymentStatus = 'PENDING' | 'PAID' | 'EXPIRED' | 'FAILED';

export interface PaymentRow {
  id: string;
  midtrans_order_id: string;
  purpose: PaymentPurpose;
  ref_id: string;
  user_id: string | null;
  amount: number;
  payment_method: GatewayMethod;
  meta: Record<string, unknown>;
  snap_token: string | null;
  redirect_url: string | null;
  status: PaymentStatus;
  midtrans_transaction_id: string | null;
  payment_type: string | null;
  created_at: string;
  paid_at: string | null;
}

/** What the web app needs to send the payer to the payment page. */
export type PaymentSession = { mode: 'MIDTRANS_SNAP'; snapToken: string; redirectUrl: string } | { mode: 'BALANCE' };

export interface NewPayment {
  invoice: string;
  purpose: PaymentPurpose;
  refId: string;
  userId: string | null;
  amount: number;
  method: GatewayMethod;
  meta?: Record<string, unknown>;
}

export const findByInvoice = (db: Db, invoice: string, forUpdate = false) =>
  one<PaymentRow>(db, `select * from payments where midtrans_order_id = $1${forUpdate ? ' for update' : ''}`, [invoice]);

export const findPendingFor = (db: Db, purpose: PaymentPurpose, refId: string) =>
  one<PaymentRow>(
    db,
    `select * from payments where purpose = $1 and ref_id = $2 and status = 'PENDING' order by created_at desc limit 1`,
    [purpose, refId],
  );

/** Step 1 (inside the caller's transaction): the PENDING payment row. */
export async function recordPayment(db: Db, p: NewPayment): Promise<void> {
  await run(
    db,
    `insert into payments (midtrans_order_id, purpose, ref_id, user_id, amount, payment_method, meta)
     values ($1, $2, $3, $4, $5, $6, $7)`,
    [p.invoice, p.purpose, p.refId, p.userId, p.amount, p.method, json(p.meta ?? {})],
  );
}

/**
 * Step 2 (after commit): create the Snap transaction — or, in simulation mode,
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
 * Applies a final result exactly once: the payment row is locked and only
 * moves out of PENDING; the business record changes in the same transaction.
 * A payment we already closed locally (FAILED/EXPIRED — e.g. its order was
 * cancelled) that Midtrans still reports as PAID is recorded as PAID and put
 * straight into the refund queue (MONEY_RULES §12b) — money is never kept silently.
 */
export async function applyResult(
  invoice: string,
  result: midtrans.GatewayResult,
  info: { grossAmount: number | null; transactionId: string | null; paymentType: string | null },
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
         payment_type = coalesce($3, payment_type), paid_at = case when $1::payment_status = 'PAID' then now() else paid_at end
       where id = $4`,
      [result, info.transactionId, info.paymentType, payment.id],
    );
    if (late) {
      await run(
        tx,
        `insert into refunds (payment_id, user_id, amount, source, reference) values ($1, $2, $3, 'PAID_AFTER_CANCEL', $4)
         on conflict (payment_id) do nothing`,
        [payment.id, payment.user_id, payment.amount, payment.midtrans_order_id],
      );
      await audit(tx, { actorId: null, action: 'payment.late_paid', targetType: 'payment', targetId: payment.id, detail: { previous: payment.status } });
      return { ...payment, status: result };
    }
    await settle(tx, payment, result);
    return { ...payment, status: result };
  });
}

/**
 * Ask Midtrans for the real status and apply it. Normally only PENDING payments;
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
  switch (payment.purpose) {
    case 'TOPUP':
      return `/topup/invoice?q=${encodeURIComponent(payment.midtrans_order_id)}`;
    case 'BALANCE_FILL':
      return '/balance/history';
    case 'ORDER':
      return `/orders/${payment.ref_id}`;
    case 'STORE_DEPOSIT':
      return '/store-dashboard';
    case 'SUBSCRIPTION':
      return '/store-dashboard/subscription';
    case 'AD':
      return '/store-dashboard/ads';
    case 'LOCK': {
      const catalogId = typeof payment.meta.catalogId === 'string' ? payment.meta.catalogId : '';
      return catalogId ? `/catalog/${catalogId}` : '/';
    }
  }
}

/** Cancels the PENDING payments of a business record (e.g. an order cancelled before payment). */
export const failPendingFor = (db: Db, purpose: PaymentPurpose, refId: string) =>
  run(db, `update payments set status = 'FAILED' where purpose = $1 and ref_id = $2 and status = 'PENDING'`, [purpose, refId]);

/** POST /webhooks/midtrans — signed notification, stored once, then re-verified via the Status API. */
export async function handleNotification(body: Record<string, unknown>): Promise<void> {
  const fields = body as {
    order_id?: string;
    status_code?: string;
    gross_amount?: string;
    signature_key?: string;
    transaction_id?: string;
    transaction_status?: string;
  };
  const signatureValid = env.PAYMENT_MODE === 'midtrans' && midtrans.verifySignature(fields);
  const payment = fields.order_id ? await findByInvoice(pool, fields.order_id) : null;
  const externalId = `${fields.transaction_id ?? fields.order_id ?? 'unknown'}:${fields.transaction_status ?? 'unknown'}`.slice(0, 120);

  const inserted = await run(
    pool,
    `insert into webhook_events (source, external_id, payment_id, payload, signature_valid)
     values ('MIDTRANS', $1, $2, $3, $4) on conflict (source, external_id) do nothing`,
    [externalId, payment?.id ?? null, json(body), signatureValid],
  );
  // Duplicate notification or forged/unknown one → nothing to do.
  if (inserted === 0 || !signatureValid || !payment) return;

  await syncPayment(payment.midtrans_order_id, true);
  await run(pool, `update webhook_events set processed = true where source = 'MIDTRANS' and external_id = $1`, [externalId]);
}
