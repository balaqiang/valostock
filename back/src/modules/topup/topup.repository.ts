import { all, one, run, type Db } from '../../db/pool.js';
import { METHOD_LABEL, type TopupMethod } from '../../config/money.js';

export interface PromoRow {
  id: number;
  code: string;
  kind: 'PERCENT' | 'FIXED';
  value: number;
  min_spend: number;
  label: string;
}

/** Active, not expired, quota left. */
export const findUsablePromo = (db: Db, code: string) =>
  one<PromoRow>(
    db,
    `SELECT id, code, kind, value, min_spend, label FROM promo_codes
     WHERE code = ? AND is_active = 1 AND (expires_at IS NULL OR expires_at > UTC_TIMESTAMP())
       AND (quota IS NULL OR used_count < quota)`,
    [code.trim().toUpperCase()],
  );

export interface ProductWithGame {
  id: string;
  name: string;
  amount_label: string;
  retail_price: number;
  game_name: string;
  uid_extra_label: string | null;
}

export const findProduct = (db: Db, id: string) =>
  one<ProductWithGame>(
    db,
    `SELECT p.id, p.name, p.amount_label, p.retail_price, g.name AS game_name, g.uid_extra_label
     FROM topup_products p JOIN games g ON g.id = p.game_id WHERE p.id = ?`,
    [id],
  );

export async function insertTopupOrder(
  db: Db,
  o: {
    id: string;
    invoice: string;
    userId: string | null;
    productId: string;
    promoId: number | null;
    userGameId: string;
    gameZoneId: string | null;
    email: string | null;
    whatsapp: string | null;
    basePrice: number;
    discount: number;
    surcharge: number;
    amount: number;
    method: TopupMethod;
    status: 'PENDING' | 'SUCCESS';
    providerRef: string | null;
  },
) {
  await run(
    db,
    `INSERT INTO topup_orders (id, invoice_number, user_id, product_id, promo_code_id, user_game_id, game_zone_id,
       contact_email, contact_whatsapp, base_price, discount, surcharge, amount, pay_source, payment_method, status,
       provider_ref, paid_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ${o.status === 'SUCCESS' ? 'UTC_TIMESTAMP()' : 'NULL'})`,
    [
      o.id, o.invoice, o.userId, o.productId, o.promoId, o.userGameId, o.gameZoneId, o.email, o.whatsapp,
      o.basePrice, o.discount, o.surcharge, o.amount, o.method === 'BALANCE' ? 'BALANCE' : 'MIDTRANS', o.method,
      o.status, o.providerRef,
    ],
  );
}

// ── TransactionRecord (front/src/types/api.ts) ──

export interface TransactionRecord {
  id: string;
  invoice_number: string;
  user_game_id: string;
  game_zone_id: string | null;
  item_id: string;
  item_name: string;
  amount: number;
  payment_method: string;
  status: string;
  gateway_ref: string | null;
  user_id: string | null;
  kind: 'GAME_TOPUP' | 'BALANCE_TOPUP';
  created_at: string;
}

interface TopupTxRow {
  id: string;
  invoice_number: string;
  user_game_id: string;
  game_zone_id: string | null;
  product_id: string;
  item_name: string;
  amount: number;
  payment_method: TopupMethod;
  status: string;
  gateway_ref: string | null;
  user_id: string | null;
  created_at: string;
}

const TOPUP_TX_SELECT = `
  SELECT t.id, t.invoice_number, t.user_game_id, t.game_zone_id, t.product_id,
         CONCAT(g.name, ' - ', p.amount_label) AS item_name, t.amount, t.payment_method, t.status,
         pay.midtrans_transaction_id AS gateway_ref, t.user_id, t.created_at
  FROM topup_orders t
  JOIN topup_products p ON p.id = t.product_id
  JOIN games g ON g.id = p.game_id
  LEFT JOIN payments pay ON pay.purpose = 'TOPUP' AND pay.ref_id = t.id`;

const toTopupTx = (r: TopupTxRow): TransactionRecord => ({
  id: r.id,
  invoice_number: r.invoice_number,
  user_game_id: r.user_game_id,
  game_zone_id: r.game_zone_id,
  item_id: r.product_id,
  item_name: r.item_name,
  amount: r.amount,
  payment_method: METHOD_LABEL[r.payment_method],
  status: r.status,
  gateway_ref: r.gateway_ref,
  user_id: r.user_id,
  kind: 'GAME_TOPUP',
  created_at: r.created_at,
});

export async function findTopupTx(db: Db, where: 'id' | 'invoice_number', value: string) {
  const row = await one<TopupTxRow>(db, `${TOPUP_TX_SELECT} WHERE t.${where} = ?`, [value]);
  return row ? toTopupTx(row) : null;
}

export const listUserTopupTx = async (db: Db, userId: string) =>
  (await all<TopupTxRow>(db, `${TOPUP_TX_SELECT} WHERE t.user_id = ? ORDER BY t.created_at DESC LIMIT 100`, [userId])).map(toTopupTx);

interface BalanceTxRow {
  id: string;
  invoice_number: string;
  nominal: number;
  qty: number;
  amount: number;
  payment_method: TopupMethod;
  status: string;
  gateway_ref: string | null;
  user_id: string;
  created_at: string;
}

const BALANCE_TX_SELECT = `
  SELECT b.id, b.invoice_number, b.nominal, b.qty, b.amount, b.payment_method, b.status,
         pay.midtrans_transaction_id AS gateway_ref, b.user_id, b.created_at
  FROM balance_topups b
  LEFT JOIN payments pay ON pay.purpose = 'BALANCE_FILL' AND pay.ref_id = b.id`;

const toBalanceTx = (r: BalanceTxRow): TransactionRecord => ({
  id: r.id,
  invoice_number: r.invoice_number,
  user_game_id: '-',
  game_zone_id: null,
  item_id: `BLC-${r.nominal}`,
  item_name: `Voucher Balance ${r.nominal.toLocaleString('id-ID')} BLC × ${r.qty}`,
  amount: r.amount,
  payment_method: METHOD_LABEL[r.payment_method],
  status: r.status,
  gateway_ref: r.gateway_ref,
  user_id: r.user_id,
  kind: 'BALANCE_TOPUP',
  created_at: r.created_at,
});

export async function findBalanceTx(db: Db, id: string) {
  const row = await one<BalanceTxRow>(db, `${BALANCE_TX_SELECT} WHERE b.id = ?`, [id]);
  return row ? toBalanceTx(row) : null;
}

export const listUserBalanceTx = async (db: Db, userId: string) =>
  (await all<BalanceTxRow>(db, `${BALANCE_TX_SELECT} WHERE b.user_id = ? ORDER BY b.created_at DESC LIMIT 100`, [userId])).map(toBalanceTx);
