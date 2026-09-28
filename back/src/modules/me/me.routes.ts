import { Router } from 'express';
import { all, pool } from '../../db/pool.js';
import { requireUser } from '../../middlewares/auth.js';
import { listUserBalanceTx, listUserTopupTx } from '../topup/topup.repository.js';

// The logged-in user's own money records — always scoped to req.user (anti-IDOR).
export const meRouter = Router();

meRouter.get('/me/transactions', async (req, res) => {
  const user = requireUser(req);
  const [topups, fills] = await Promise.all([listUserTopupTx(pool, user.id), listUserBalanceTx(pool, user.id)]);
  const transactions = [...topups, ...fills].sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 100);
  res.json({ transactions });
});

meRouter.get('/me/balance-ledger', async (req, res) => {
  const user = requireUser(req);
  const rows = await all<{ id: number; user_id: string; type: string; amount: number; balance_after: number; reference: string; created_at: string }>(
    pool,
    'SELECT id, user_id, type, amount, balance_after, reference, created_at FROM balance_ledger WHERE user_id = ? ORDER BY id DESC LIMIT 100',
    [user.id],
  );
  res.json({ ledger: rows.map((row) => ({ ...row, id: String(row.id) })) });
});
