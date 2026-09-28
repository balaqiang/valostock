// Admin decisions (DFD 8.0). Nothing is auto-approved; every decision is
// written to audit_logs with the admin's id and IP.
import { all, one, pool, run, withTransaction } from '../../db/pool.js';
import { audit } from '../../lib/audit.js';
import { conflict, notFound } from '../../lib/errors.js';
import { moveStoreBalance } from '../../lib/ledger.js';
import type { AuthUser } from '../../middlewares/auth.js';
import { toWithdrawal } from '../stores/stores.service.js';

type StoreStatus = 'PENDING_DEPOSIT' | 'PENDING_REVIEW' | 'ACTIVE' | 'REJECTED' | 'SUSPENDED';

export async function listStores(status: StoreStatus | undefined) {
  const rows = await all<{
    id: string; slug: string; name: string; type: string; status: string; owner_legal_name: string; description: string | null;
    deposit_amount: number; deposit_status: string; review_note: string | null; created_at: string; owner_name: string; owner_email: string;
  }>(
    pool,
    `SELECT s.id, s.slug, s.name, s.type, s.status, s.owner_legal_name, s.description, s.deposit_amount, s.deposit_status,
            s.review_note, s.created_at, u.name AS owner_name, u.email AS owner_email
     FROM stores s JOIN users u ON u.id = s.owner_id
     ${status ? 'WHERE s.status = ?' : ''} ORDER BY s.created_at DESC`,
    status ? [status] : [],
  );
  return rows.map((s) => ({
    id: s.id,
    slug: s.slug,
    name: s.name,
    type: s.type,
    status: s.status,
    ownerLegalName: s.owner_legal_name,
    description: s.description ?? '',
    depositAmount: s.deposit_amount,
    depositStatus: s.deposit_status,
    reviewNote: s.review_note,
    createdAt: s.created_at,
    owner: { name: s.owner_name, email: s.owner_email },
  }));
}

export async function reviewStore(admin: AuthUser, storeId: string, decision: 'approve' | 'reject', note: string | undefined, ip: string | undefined) {
  await withTransaction(async (conn) => {
    const store = await one<{ status: string }>(conn, 'SELECT status FROM stores WHERE id = ? FOR UPDATE', [storeId]);
    if (!store) throw notFound('Toko');
    if (store.status !== 'PENDING_REVIEW') throw conflict('Toko ini tidak sedang menunggu verifikasi.', 'BAD_STATE');
    if (decision === 'approve') {
      await run(
        conn,
        `UPDATE stores SET status = 'ACTIVE', identity_verified = 1, review_note = ?, reviewed_by = ?, reviewed_at = UTC_TIMESTAMP()
         WHERE id = ?`,
        [note ?? null, admin.id, storeId],
      );
      await run(conn, 'INSERT IGNORE INTO store_balances (store_id) VALUES (?)', [storeId]);
    } else {
      // Deposit refund is simulated in the prototype.
      await run(
        conn,
        `UPDATE stores SET status = 'REJECTED', deposit_status = 'RELEASED', review_note = ?, reviewed_by = ?, reviewed_at = UTC_TIMESTAMP()
         WHERE id = ?`,
        [note ?? null, admin.id, storeId],
      );
    }
    await audit(conn, { actorId: admin.id, action: `store.${decision}`, targetType: 'store', targetId: storeId, detail: { note }, ip });
  });
}

export async function listWithdrawals(status: 'PENDING' | 'COMPLETED' | 'REJECTED' | undefined) {
  const rows = await all<Parameters<typeof toWithdrawal>[0] & { uuid: string; store_name: string; store_slug: string; owner_legal_name: string }>(
    pool,
    `SELECT w.*, w.id AS uuid, s.name AS store_name, s.slug AS store_slug, s.owner_legal_name
     FROM withdrawals w JOIN stores s ON s.id = w.store_id
     ${status ? 'WHERE w.status = ?' : ''} ORDER BY w.created_at DESC LIMIT 200`,
    status ? [status] : [],
  );
  return rows.map((w) => ({
    ...toWithdrawal(w),
    uuid: w.uuid,
    store: { name: w.store_name, slug: w.store_slug, ownerLegalName: w.owner_legal_name },
  }));
}

/** Approve = the (simulated) Iris transfer is sent. Reject = funds go back to the store's available balance. */
export async function reviewWithdrawal(admin: AuthUser, withdrawalId: string, decision: 'approve' | 'reject', note: string | undefined, ip: string | undefined) {
  await withTransaction(async (conn) => {
    const w = await one<{ id: string; store_id: string; amount: number; status: string }>(
      conn,
      'SELECT id, store_id, amount, status FROM withdrawals WHERE id = ? FOR UPDATE',
      [withdrawalId],
    );
    if (!w) throw notFound('Penarikan');
    if (w.status !== 'PENDING') throw conflict('Penarikan ini sudah diproses.', 'BAD_STATE');
    await run(
      conn,
      'UPDATE withdrawals SET status = ?, review_note = ?, reviewed_by = ?, reviewed_at = UTC_TIMESTAMP() WHERE id = ?',
      [decision === 'approve' ? 'COMPLETED' : 'REJECTED', note ?? null, admin.id, w.id],
    );
    if (decision === 'reject') {
      await moveStoreBalance(conn, w.store_id, [
        { bucket: 'AVAILABLE', type: 'PAYOUT_REVERSAL', amount: w.amount, refType: 'withdrawal', refId: w.id, note: note ?? 'Ditolak admin' },
      ]);
    }
    await audit(conn, { actorId: admin.id, action: `withdrawal.${decision}`, targetType: 'withdrawal', targetId: w.id, detail: { note }, ip });
  });
}

/** Successful game top-ups grouped per game account. */
export async function analytics() {
  const summary = await one<{ totalRevenue: number; totalTransactions: number; uniqueAccounts: number; avgTicket: number }>(
    pool,
    `SELECT COALESCE(SUM(amount), 0) AS totalRevenue, COUNT(*) AS totalTransactions,
            COUNT(DISTINCT CONCAT(user_game_id, '|', COALESCE(game_zone_id, ''))) AS uniqueAccounts,
            COALESCE(ROUND(AVG(amount)), 0) AS avgTicket
     FROM topup_orders WHERE status = 'SUCCESS'`,
  );
  const accounts = await all(
    pool,
    `SELECT user_game_id, game_zone_id, COUNT(*) AS topup_count, SUM(amount) AS total_spent, ROUND(AVG(amount)) AS avg_spent,
            MIN(created_at) AS first_topup_at, MAX(created_at) AS last_topup_at, MAX(user_id IS NOT NULL) AS linked_to_user
     FROM topup_orders WHERE status = 'SUCCESS'
     GROUP BY user_game_id, COALESCE(game_zone_id, '')
     ORDER BY total_spent DESC, topup_count DESC LIMIT 100`,
  );
  return {
    summary: {
      totalRevenue: Number(summary?.totalRevenue ?? 0),
      totalTransactions: Number(summary?.totalTransactions ?? 0),
      uniqueAccounts: Number(summary?.uniqueAccounts ?? 0),
      avgTicket: Number(summary?.avgTicket ?? 0),
    },
    accounts,
  };
}
