import { METHOD_LABEL, type TopupMethod } from '../../config/money.js';
import { all, one, run, type Db } from '../../db/pool.js';

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
    `select id, code, kind, value, min_spend, label from promo_codes
     where code = $1 and is_active and (expires_at is null or expires_at > now())
       and (quota is null or used_count < quota)`,
    [code.trim().toUpperCase()],
  );

export interface ProductWithGame {
  id: string;
  name: string;
  amount_label: string;
  retail_price: number;
  game_name: string;
  uid_extra_label: string | null;
  uid_extra_options: string[] | null;
}

export const findProduct = (db: Db, id: string) =>
  one<ProductWithGame>(
    db,
    `select p.id, p.name, p.amount_label, p.retail_price, g.name as game_name, g.uid_extra_label, g.uid_extra_options
     from topup_products p join games g on g.id = p.game_id
     where p.id = $1 and p.is_active and g.is_active and g.supports_topup`,
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
    `insert into topup_orders (id, invoice_number, user_id, product_id, promo_code_id, user_game_id, game_zone_id,
       contact_email, contact_whatsapp, base_price, discount, surcharge, amount, pay_source, payment_method, status,
       provider_ref, paid_at)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17,
             case when $16::topup_status = 'SUCCESS' then now() end)`,
    [
      o.id,
      o.invoice,
      o.userId,
      o.productId,
      o.promoId,
      o.userGameId,
      o.gameZoneId,
      o.email,
      o.whatsapp,
      o.basePrice,
      o.discount,
      o.surcharge,
      o.amount,
      o.method === 'BALANCE' ? 'BALANCE' : 'MIDTRANS',
      o.method,
      o.status,
      o.providerRef,
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

export const TOPUP_TX_SELECT = `
  select t.id, t.invoice_number, t.user_game_id, t.game_zone_id, t.product_id,
         g.name || ' - ' || p.amount_label as item_name, t.amount, t.payment_method, t.status,
         pay.midtrans_transaction_id as gateway_ref, t.user_id, t.created_at
  from topup_orders t
  join topup_products p on p.id = t.product_id
  join games g on g.id = p.game_id
  left join payments pay on pay.purpose = 'TOPUP' and pay.ref_id = t.id`;

export const toTopupTx = (r: TopupTxRow): TransactionRecord => ({
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
  const column = where === 'id' ? 't.id' : 't.invoice_number';
  const row = await one<TopupTxRow>(db, `${TOPUP_TX_SELECT} where ${column} = $1`, [value]);
  return row ? toTopupTx(row) : null;
}

export const listUserTopupTx = async (db: Db, userId: string) =>
  (await all<TopupTxRow>(db, `${TOPUP_TX_SELECT} where t.user_id = $1 order by t.created_at desc limit 100`, [userId])).map(toTopupTx);

export const listAllTopupTx = async (db: Db, q: string | undefined, status: string | undefined, limit = 200) =>
  (
    await all<TopupTxRow>(
      db,
      `${TOPUP_TX_SELECT}
       where ($1::text is null or t.invoice_number ilike $1 or t.user_game_id ilike $1 or t.contact_email ilike $1)
         and ($2::topup_status is null or t.status = $2)
       order by t.created_at desc limit ${limit}`,
      [q ? `%${q}%` : null, status ?? null],
    )
  ).map(toTopupTx);

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
  select b.id, b.invoice_number, b.nominal, b.qty, b.amount, b.payment_method, b.status,
         pay.midtrans_transaction_id as gateway_ref, b.user_id, b.created_at
  from balance_topups b
  left join payments pay on pay.purpose = 'BALANCE_FILL' and pay.ref_id = b.id`;

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
  const row = await one<BalanceTxRow>(db, `${BALANCE_TX_SELECT} where b.id = $1`, [id]);
  return row ? toBalanceTx(row) : null;
}

export const listUserBalanceTx = async (db: Db, userId: string) =>
  (await all<BalanceTxRow>(db, `${BALANCE_TX_SELECT} where b.user_id = $1 order by b.created_at desc limit 100`, [userId])).map(toBalanceTx);

export const listAllBalanceTx = async (db: Db, q: string | undefined, limit = 200) =>
  (
    await all<BalanceTxRow>(
      db,
      `${BALANCE_TX_SELECT} where ($1::text is null or b.invoice_number ilike $1) order by b.created_at desc limit ${limit}`,
      [q ? `%${q}%` : null],
    )
  ).map(toBalanceTx);
