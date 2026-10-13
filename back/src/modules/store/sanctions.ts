// Store sanctions and deposit movements (MONEY_RULES §12, §14). A fine is taken
// from the deposit bucket of the store ledger, never more than the deposit held.
import { STORE_DEPOSIT } from '../../config/money.js';
import { one, run, type Tx } from '../../db/pool.js';
import { moveStoreBalance } from '../../lib/ledger.js';
import { notifyStore } from '../../lib/notify.js';

export type SanctionInput = { type: 'WARNING' | 'FINE' | 'SUSPEND'; amount?: number; reason: string };

/** Deducts up to `amount` from the deposit. Returns what was actually taken. */
export async function deductDeposit(tx: Tx, storeId: string, amount: number, note: string, refId: string | null): Promise<number> {
  const bal = await one<{ deposit: number }>(tx, 'select deposit from store_balances where store_id = $1', [storeId]);
  const take = Math.min(Math.max(amount, 0), bal?.deposit ?? 0);
  if (take > 0) {
    await moveStoreBalance(tx, storeId, [{ bucket: 'DEPOSIT', type: 'DEPOSIT_DEDUCTION', amount: -take, refType: 'sanction', refId, note }]);
  }
  return take;
}

/**
 * Records a sanction and applies it: FINE → deposit deduction, SUSPEND → store
 * suspended (catalogs hidden from the marketplace, ads stopped). Caller audits.
 */
export async function applySanction(tx: Tx, adminId: string, storeId: string, s: SanctionInput) {
  const row = await one<{ id: string }>(
    tx,
    'insert into store_sanctions (store_id, type, amount, reason, created_by) values ($1, $2, $3, $4, $5) returning id',
    [storeId, s.type, 0, s.reason, adminId],
  );
  let taken = 0;
  if (s.type === 'FINE' && s.amount) {
    taken = await deductDeposit(tx, storeId, s.amount, `Denda: ${s.reason}`, row!.id);
    await run(tx, 'update store_sanctions set amount = $1 where id = $2', [taken, row!.id]);
  }
  if (s.type === 'SUSPEND') {
    await run(tx, `update stores set status = 'SUSPENDED', review_note = $1 where id = $2 and status = 'ACTIVE'`, [s.reason, storeId]);
    await run(tx, `update featured_listings set status = 'STOPPED', stop_reason = 'Toko ditangguhkan' where store_id = $1 and status = 'ACTIVE'`, [storeId]);
  }
  const bal = await one<{ deposit: number }>(tx, 'select deposit from store_balances where store_id = $1', [storeId]);
  const text = {
    WARNING: `Peringatan dari admin: ${s.reason}`,
    FINE: `Denda Rp${taken.toLocaleString('id-ID')} dipotong dari deposit: ${s.reason}.${
      (bal?.deposit ?? 0) < STORE_DEPOSIT ? ' Deposit di bawah Rp500.000, lengkapi di Pengaturan agar badge Deposit Secured aktif lagi.' : ''
    }`,
    SUSPEND: `Toko ditangguhkan: ${s.reason}`,
  }[s.type];
  await notifyStore(tx, storeId, { title: 'Sanksi toko', body: text, link: '/store-dashboard/settings' });
  return { sanctionId: row!.id, taken, requested: s.amount ?? 0 };
}
