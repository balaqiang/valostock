import { one, run, type Db } from '../../db/pool.js';
import type { GatewayMethod } from '../../config/money.js';

export type PaymentPurpose = 'TOPUP' | 'BALANCE_FILL' | 'ORDER' | 'STORE_DEPOSIT';
export type PaymentStatus = 'PENDING' | 'PAID' | 'EXPIRED' | 'FAILED';

export interface PaymentRow {
  id: string;
  midtrans_order_id: string;
  purpose: PaymentPurpose;
  ref_id: string;
  user_id: string | null;
  amount: number;
  payment_method: GatewayMethod;
  snap_token: string | null;
  redirect_url: string | null;
  status: PaymentStatus;
  midtrans_transaction_id: string | null;
  payment_type: string | null;
  created_at: string;
  paid_at: string | null;
}

export async function insertPayment(
  db: Db,
  p: Pick<PaymentRow, 'id' | 'midtrans_order_id' | 'purpose' | 'ref_id' | 'user_id' | 'amount' | 'payment_method'>,
) {
  await run(
    db,
    `INSERT INTO payments (id, midtrans_order_id, purpose, ref_id, user_id, amount, payment_method)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [p.id, p.midtrans_order_id, p.purpose, p.ref_id, p.user_id, p.amount, p.payment_method],
  );
}

export const findByInvoice = (db: Db, invoice: string, forUpdate = false) =>
  one<PaymentRow>(db, `SELECT * FROM payments WHERE midtrans_order_id = ?${forUpdate ? ' FOR UPDATE' : ''}`, [invoice]);

export const findPendingFor = (db: Db, purpose: PaymentPurpose, refId: string) =>
  one<PaymentRow>(
    db,
    "SELECT * FROM payments WHERE purpose = ? AND ref_id = ? AND status = 'PENDING' ORDER BY created_at DESC LIMIT 1",
    [purpose, refId],
  );

export const setSnap = (db: Db, id: string, token: string, redirectUrl: string) =>
  run(db, 'UPDATE payments SET snap_token = ?, redirect_url = ? WHERE id = ?', [token, redirectUrl, id]);

export const setResult = (
  db: Db,
  id: string,
  status: Exclude<PaymentStatus, 'PENDING'>,
  info: { transactionId: string | null; paymentType: string | null },
) =>
  run(
    db,
    `UPDATE payments SET status = ?, midtrans_transaction_id = COALESCE(?, midtrans_transaction_id),
       payment_type = COALESCE(?, payment_type), paid_at = IF(? = 'PAID', UTC_TIMESTAMP(), paid_at)
     WHERE id = ?`,
    [status, info.transactionId, info.paymentType, status, id],
  );
