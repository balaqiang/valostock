// The logged-in Member's own data — always scoped to req.user (anti-IDOR): their invoices (DFD 6.0)
// and their Balance ledger (DFD 5.4).
import { Router } from 'express';
import { all, pool } from '../../db/pool.js';
import { requireUser } from '../../middlewares/auth.js';
import { listUserBalanceTx, listUserTopupTx } from '../topup/topup.repository.js';

export const meRouter = Router();

meRouter.get('/me/transactions', async (req, res) => {
  const user = requireUser(req);
  const [topups, fills] = await Promise.all([listUserTopupTx(pool, user.id), listUserBalanceTx(pool, user.id)]);
  const transactions = [...topups, ...fills].sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 100);
  res.json({ transactions });
});

meRouter.get('/me/balance-ledger', async (req, res) => {
  const user = requireUser(req);
  const rows = await all<{ id: number; type: string; amount: number; balance_after: number; reference: string; created_at: string }>(
    pool,
    'select id, type, amount, balance_after, reference, created_at from balance_ledger where user_id = $1 order by id desc limit 100',
    [user.id],
  );
  res.json({ ledger: rows.map((row) => ({ ...row, id: String(row.id) })) });
});
