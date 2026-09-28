// The only functions allowed to change a balance. Each call locks the balance
// row (SELECT … FOR UPDATE), applies the movements, and writes one ledger row
// per movement with `balance_after` — all inside the caller's transaction.
import type { PoolConnection } from 'mysql2/promise';
import { one, run } from '../db/pool.js';
import { conflict } from './errors.js';

export type StoreBucket = 'ESCROW' | 'AVAILABLE';
export type StoreLedgerType =
  | 'ESCROW_HOLD'
  | 'ESCROW_RELEASE'
  | 'COMMISSION'
  | 'REFUND'
  | 'WITHDRAW'
  | 'WITHDRAW_FEE'
  | 'PAYOUT_REVERSAL'
  | 'ADJUSTMENT';

export interface StoreMovement {
  bucket: StoreBucket;
  type: StoreLedgerType;
  /** Signed Rupiah: + in, − out. */
  amount: number;
  refType: 'order' | 'withdrawal' | 'adjustment';
  refId: string;
  note?: string;
}

export async function moveStoreBalance(conn: PoolConnection, storeId: string, movements: StoreMovement[]) {
  const row = await one<{ escrow: number; available: number }>(
    conn,
    'SELECT escrow, available FROM store_balances WHERE store_id = ? FOR UPDATE',
    [storeId],
  );
  if (!row) throw conflict('Saldo toko belum dibuat (toko belum disetujui admin).', 'NO_STORE_BALANCE');

  const balance = { ESCROW: row.escrow, AVAILABLE: row.available };
  for (const movement of movements) {
    balance[movement.bucket] += movement.amount;
    if (balance[movement.bucket] < 0) throw conflict('Saldo toko tidak mencukupi.', 'INSUFFICIENT_STORE_BALANCE');
    await run(
      conn,
      `INSERT INTO store_ledger (store_id, bucket, type, amount, balance_after, ref_type, ref_id, note)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [storeId, movement.bucket, movement.type, movement.amount, balance[movement.bucket], movement.refType, movement.refId, movement.note ?? null],
    );
  }
  await run(conn, 'UPDATE store_balances SET escrow = ?, available = ? WHERE store_id = ?', [
    balance.ESCROW,
    balance.AVAILABLE,
    storeId,
  ]);
  return { escrow: balance.ESCROW, available: balance.AVAILABLE };
}

export type BalanceLedgerType = 'TOPUP_CREDIT' | 'SPEND_TOPUP' | 'REFUND_CREDIT' | 'ADJUSTMENT';

/** Closed-loop Balance (BLC) of a user. Returns the new balance. */
export async function moveUserBalance(
  conn: PoolConnection,
  userId: string,
  movement: { type: BalanceLedgerType; amount: number; reference: string },
): Promise<number> {
  const row = await one<{ balance: number }>(conn, 'SELECT balance FROM users WHERE id = ? FOR UPDATE', [userId]);
  if (!row) throw conflict('Pengguna tidak ditemukan.', 'NO_USER');
  const next = row.balance + movement.amount;
  if (next < 0) throw conflict('Balance tidak mencukupi.', 'INSUFFICIENT_BALANCE');
  await run(conn, 'UPDATE users SET balance = ? WHERE id = ?', [next, userId]);
  await run(
    conn,
    'INSERT INTO balance_ledger (user_id, type, amount, balance_after, reference) VALUES (?, ?, ?, ?, ?)',
    [userId, movement.type, movement.amount, next, movement.reference],
  );
  return next;
}
