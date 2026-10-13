// The only functions allowed to change a Balance. Each call locks the profile row
// (SELECT … FOR UPDATE), applies the movement, and writes one balance_ledger row
// with `balance_after` — all inside the caller's transaction.
import { REFERRAL_REWARD } from '../config/money.js';
import { one, run, type Tx } from '../db/pool.js';
import { conflict } from './errors.js';

export type BalanceLedgerType = 'TOPUP_CREDIT' | 'SPEND_TOPUP' | 'REFERRAL_CREDIT';

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

/**
 * Referral reward (MONEY_RULES §6): the referred user's FIRST successful top-up credits Rp10.000 Balance to
 * the referrer. Call after the invoice was set to SUCCESS. Locking the referred profile serialises concurrent
 * settlements of the same user, so the "any earlier success?" check cannot pass twice.
 */
export async function rewardReferral(tx: Tx, userId: string, invoice: string): Promise<void> {
  const user = await one<{ referred_by: string | null }>(tx, 'select referred_by from profiles where id = $1 for update', [userId]);
  if (!user?.referred_by) return;
  const earlier = await one(
    tx,
    `select 1 from topup_orders where user_id = $1 and status = 'SUCCESS' and invoice_number <> $2 limit 1`,
    [userId, invoice],
  );
  if (earlier) return;
  await moveUserBalance(tx, user.referred_by, { type: 'REFERRAL_CREDIT', amount: REFERRAL_REWARD, reference: invoice });
}
