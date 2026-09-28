// Thin Midtrans client (Snap + Core Status API) over fetch. Sandbox only in the
// prototype. Docs: https://docs.midtrans.com/reference/backend-integration
import { createHash, timingSafeEqual } from 'node:crypto';
import { env } from '../../config/env.js';
import type { GatewayMethod } from '../../config/money.js';
import { AppError } from '../../lib/errors.js';

const SNAP_URL = 'https://app.sandbox.midtrans.com/snap/v1/transactions';
const CORE_URL = 'https://api.sandbox.midtrans.com/v2';

const authHeader = () => `Basic ${Buffer.from(`${env.MIDTRANS_SERVER_KEY}:`).toString('base64')}`;

/** Our method → the Snap payment channels shown to the buyer. */
const ENABLED_PAYMENTS: Record<GatewayMethod, string[]> = {
  QRIS: ['other_qris'],
  VA: ['bca_va', 'bni_va', 'bri_va', 'permata_va', 'echannel', 'cimb_va', 'other_va'],
  RETAIL: ['indomaret', 'alfamart'],
  EWALLET: ['gopay', 'shopeepay'],
  CC: ['credit_card'],
};

export async function createSnapTransaction(input: {
  orderId: string;
  amount: number;
  method: GatewayMethod;
  customer: { name?: string; email?: string | null; phone?: string | null };
}): Promise<{ token: string; redirectUrl: string }> {
  const response = await fetch(SNAP_URL, {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json', Authorization: authHeader() },
    body: JSON.stringify({
      transaction_details: { order_id: input.orderId, gross_amount: input.amount },
      customer_details: {
        first_name: input.customer.name ?? 'Pelanggan',
        email: input.customer.email ?? undefined,
        phone: input.customer.phone ?? undefined,
      },
      enabled_payments: ENABLED_PAYMENTS[input.method],
      callbacks: { finish: `${env.FRONTEND_URL}/payment/finish` },
      expiry: { unit: 'minutes', duration: 60 },
    }),
  });
  const body = (await response.json().catch(() => ({}))) as { token?: string; redirect_url?: string; error_messages?: string[] };
  if (!response.ok || !body.token || !body.redirect_url) {
    console.error('Midtrans Snap error', response.status, body);
    throw new AppError(502, 'MIDTRANS_ERROR', `Gagal membuat pembayaran Midtrans${body.error_messages ? `: ${body.error_messages.join(', ')}` : '.'}`);
  }
  return { token: body.token, redirectUrl: body.redirect_url };
}

export type GatewayResult = 'PENDING' | 'PAID' | 'FAILED' | 'EXPIRED';

export interface MidtransStatus {
  result: GatewayResult;
  grossAmount: number | null;
  transactionId: string | null;
  paymentType: string | null;
}

/** Midtrans transaction_status (+ fraud_status) → our payment result. */
export function mapStatus(transactionStatus: string | undefined, fraudStatus?: string): GatewayResult {
  switch (transactionStatus) {
    case 'settlement':
      return 'PAID';
    case 'capture':
      return fraudStatus === 'accept' || fraudStatus === undefined ? 'PAID' : 'PENDING';
    case 'expire':
      return 'EXPIRED';
    case 'deny':
    case 'cancel':
    case 'failure':
      return 'FAILED';
    default:
      return 'PENDING';
  }
}

/** Authoritative status straight from Midtrans (never trust the browser). */
export async function getTransactionStatus(orderId: string): Promise<MidtransStatus> {
  const response = await fetch(`${CORE_URL}/${encodeURIComponent(orderId)}/status`, {
    headers: { Accept: 'application/json', Authorization: authHeader() },
  });
  const body = (await response.json().catch(() => ({}))) as {
    status_code?: string;
    transaction_status?: string;
    fraud_status?: string;
    gross_amount?: string;
    transaction_id?: string;
    payment_type?: string;
  };
  // 404 = the buyer has not picked a channel on the Snap page yet.
  if (body.status_code === '404' || !body.transaction_status) {
    return { result: 'PENDING', grossAmount: null, transactionId: null, paymentType: null };
  }
  return {
    result: mapStatus(body.transaction_status, body.fraud_status),
    grossAmount: body.gross_amount ? Math.round(Number(body.gross_amount)) : null,
    transactionId: body.transaction_id ?? null,
    paymentType: body.payment_type ?? null,
  };
}

/** Webhook signature: SHA512(order_id + status_code + gross_amount + server_key). */
export function verifySignature(body: { order_id?: string; status_code?: string; gross_amount?: string; signature_key?: string }): boolean {
  if (!body.order_id || !body.status_code || !body.gross_amount || !body.signature_key) return false;
  const expected = createHash('sha512')
    .update(`${body.order_id}${body.status_code}${body.gross_amount}${env.MIDTRANS_SERVER_KEY}`)
    .digest('hex');
  const given = Buffer.from(body.signature_key);
  const wanted = Buffer.from(expected);
  return given.length === wanted.length && timingSafeEqual(given, wanted);
}
