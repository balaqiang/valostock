// The only functions allowed to change a balance. Each call locks the balance
// row (SELECT … FOR UPDATE), applies the movements, and writes one ledger row
// per movement with `balance_after` — all inside the caller's transaction.
import { REFERRAL_REWARD, pointsFor } from '../config/money.js';
import { one, run, type Tx } from '../db/pool.js';
import { conflict } from './errors.js';
import { notify } from './notify.js';

export type StoreBucket = 'ESCROW' | 'AVAILABLE';
export type StoreLedgerType =
  | 'ESCROW_HOLD'
  | 'ESCROW_RELEASE'
  | 'COMMISSION'
  | 'REFUND'
  | 'COMPENSATION'
  | 'WITHDRAW'
  | 'WITHDRAW_FEE'
  | 'TRANSFER'
  | 'TRANSFER_FEE'
  | 'PAYOUT_REVERSAL'
  | 'ADJUSTMENT';

export interface StoreMovement {
  bucket: StoreBucket;
  type: StoreLedgerType;
  /** Signed Rupiah: + in, − out. */
  amount: number;
  refType: 'order' | 'withdrawal' | 'transfer' | 'dispute' | 'adjustment';
  refId: string | null;
  note?: string;
}

export async function moveStoreBalance(tx: Tx, storeId: string, movements: StoreMovement[]) {
  const row = await one<{ escrow: number; available: number }>(
    tx,
    'select escrow, available from store_balances where store_id = $1 for update',
    [storeId],
  );
  if (!row) throw conflict('Saldo toko belum dibuat (toko belum disetujui admin).', 'NO_STORE_BALANCE');

  const balance = { ESCROW: row.escrow, AVAILABLE: row.available };
  for (const m of movements) {
    balance[m.bucket] += m.amount;
    if (balance[m.bucket] < 0) throw conflict('Saldo toko tidak mencukupi.', 'INSUFFICIENT_STORE_BALANCE');
    await run(
      tx,
      `insert into store_ledger (store_id, bucket, type, amount, balance_after, ref_type, ref_id, note)
       values ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [storeId, m.bucket, m.type, m.amount, balance[m.bucket], m.refType, m.refId, m.note ?? null],
    );
  }
  await run(tx, 'update store_balances set escrow = $1, available = $2 where store_id = $3', [
    balance.ESCROW,
    balance.AVAILABLE,
    storeId,
  ]);
  return { escrow: balance.ESCROW, available: balance.AVAILABLE };
}

export type BalanceLedgerType =
  | 'TOPUP_CREDIT'
  | 'SPEND_TOPUP'
  | 'REFUND_CREDIT'
  | 'LOYALTY_CREDIT'
  | 'REFERRAL_CREDIT'
  | 'ADJUSTMENT';

/** Closed-loop Balance (BLC) of a user. Returns the new balance. */
export async function moveUserBalance(
  tx: Tx,
  userId: string,
  movement: { type: BalanceLedgerType; amount: number; reference: string },
): Promise<number> {
  const row = await one<{ balance: number }>(tx, 'select balance from profiles where id = $1 for update', [userId]);
  if (!row) throw conflict('Pengguna tidak ditemukan.', 'NO_USER');
  const next = row.balance + movement.amount;
  if (next < 0) throw conflict('Balance tidak mencukupi.', 'INSUFFICIENT_BALANCE');
  await run(tx, 'update profiles set balance = $1 where id = $2', [next, userId]);
  await run(tx, 'insert into balance_ledger (user_id, type, amount, balance_after, reference) values ($1, $2, $3, $4, $5)', [
    userId,
    movement.type,
    movement.amount,
    next,
    movement.reference,
  ]);
  return next;
}

/** Loyalty points (MONEY_RULES §13b). Returns the new points balance. */
export async function movePoints(
  tx: Tx,
  userId: string,
  movement: { type: 'EARN' | 'REDEEM' | 'ADJUSTMENT'; points: number; reference: string },
): Promise<number> {
  const row = await one<{ loyalty_points: number }>(tx, 'select loyalty_points from profiles where id = $1 for update', [userId]);
  if (!row) throw conflict('Pengguna tidak ditemukan.', 'NO_USER');
  const next = row.loyalty_points + movement.points;
  if (next < 0) throw conflict('Poin tidak mencukupi.', 'INSUFFICIENT_POINTS');
  await run(tx, 'update profiles set loyalty_points = $1 where id = $2', [next, userId]);
  await run(tx, 'insert into loyalty_ledger (user_id, type, points, balance_after, reference) values ($1, $2, $3, $4, $5)', [
    userId,
    movement.type,
    movement.points,
    next,
    movement.reference,
  ]);
  return next;
}

/** Points for a completed purchase / successful top-up (1 point per Rp1.000). */
export async function earnPoints(tx: Tx, userId: string, amount: number, reference: string): Promise<void> {
  const points = pointsFor(amount);
  if (points > 0) await movePoints(tx, userId, { type: 'EARN', points, reference });
}

/**
 * Referral reward (MONEY_RULES §13b): the first completed order or successful
 * top-up of a referred user credits Rp10.000 Balance to the referrer — once.
 */
export async function rewardReferral(tx: Tx, userId: string, reference: string): Promise<void> {
  const user = await one<{ referred_by: string | null }>(tx, 'select referred_by from profiles where id = $1', [userId]);
  if (!user?.referred_by) return;
  const inserted = await run(
    tx,
    `insert into referral_rewards (referrer_id, referred_id, reward, status, reference, rewarded_at)
     values ($1, $2, $3, 'REWARDED', $4, now()) on conflict (referred_id) do nothing`,
    [user.referred_by, userId, REFERRAL_REWARD, reference],
  );
  if (inserted === 0) return;
  await moveUserBalance(tx, user.referred_by, { type: 'REFERRAL_CREDIT', amount: REFERRAL_REWARD, reference });
  await notify(tx, user.referred_by, {
    kind: 'SYSTEM',
    title: 'Hadiah referral masuk',
    body: `Teman yang kamu ajak menyelesaikan transaksi pertamanya. Rp${REFERRAL_REWARD.toLocaleString('id-ID')} masuk ke Balance.`,
    link: '/account/affiliate',
  });
}
