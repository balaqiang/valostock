// Admin · Pengguna & Akses + Sistem: users (ban), admins & roles (RBAC),
// audit log, top-up analytics (ADMIN_PANEL §3.11–3.12).
import { Router } from 'express';
import { z } from 'zod';
import { all, one, pool, run, withTransaction } from '../../db/pool.js';
import { audit } from '../../lib/audit.js';
import { badRequest, conflict, notFound, parse } from '../../lib/errors.js';
import { moveUserBalance } from '../../lib/ledger.js';
import { notify } from '../../lib/notify.js';
import { supabaseAdmin } from '../../supabase/client.js';
import { admin, idParam, ipOf, reasonText } from './admin.guard.js';

export const adminUsersRouter = Router();

// ── Users ──

adminUsersRouter.get('/admin/users', async (req, res) => {
  await admin(req, 'users:view');
  const { q } = parse(z.object({ q: z.string().trim().max(80).optional() }).strict(), req.query);
  const rows = await all<{ id: string; name: string; email: string; phone: string | null; role: string; balance: number; loyalty_points: number; is_banned: boolean; ban_reason: string | null; created_at: string; orders: number; store_name: string | null }>(
    pool,
    `select p.*, (select count(*)::int from orders o where o.buyer_id = p.id) as orders, s.name as store_name
     from profiles p left join stores s on s.owner_id = p.id
     where ($1::text is null or p.name ilike $1 or p.email ilike $1 or p.phone ilike $1)
     order by p.created_at desc limit 200`,
    [q ? `%${q}%` : null],
  );
  res.json({
    users: rows.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      phone: u.phone,
      role: u.role,
      balance: u.balance,
      points: u.loyalty_points,
      isBanned: u.is_banned,
      banReason: u.ban_reason,
      orders: u.orders,
      store: u.store_name,
      createdAt: u.created_at,
    })),
  });
});

adminUsersRouter.get('/admin/users/:id', async (req, res) => {
  await admin(req, 'users:view');
  const id = parse(idParam, req.params.id);
  const user = await one<{ id: string; name: string; email: string; phone: string | null; role: string; balance: number; loyalty_points: number; is_banned: boolean; ban_reason: string | null; referral_code: string; created_at: string }>(
    pool,
    'select * from profiles where id = $1',
    [id],
  );
  if (!user) throw notFound('Pengguna');
  const [orders, topups, ledger, reports, store] = await Promise.all([
    all<{ id: string; order_number: string; status: string; total_paid: number; created_at: string }>(
      pool,
      'select id, order_number, status, total_paid, created_at from orders where buyer_id = $1 order by created_at desc limit 20',
      [id],
    ),
    all<{ invoice_number: string; status: string; amount: number; created_at: string }>(
      pool,
      'select invoice_number, status, amount, created_at from topup_orders where user_id = $1 order by created_at desc limit 20',
      [id],
    ),
    all<{ type: string; amount: number; balance_after: number; reference: string; created_at: string }>(
      pool,
      'select type, amount, balance_after, reference, created_at from balance_ledger where user_id = $1 order by id desc limit 20',
      [id],
    ),
    one<{ made: number; received: number }>(
      pool,
      `select (select count(*)::int from reports where reporter_id = $1) as made,
              (select count(*)::int from reports where target_type = 'USER' and target_id = $1) as received`,
      [id],
    ),
    one<{ id: string; name: string; slug: string; status: string }>(pool, 'select id, name, slug, status from stores where owner_id = $1', [id]),
  ]);
  res.json({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      balance: user.balance,
      points: user.loyalty_points,
      isBanned: user.is_banned,
      banReason: user.ban_reason,
      referralCode: user.referral_code,
      createdAt: user.created_at,
    },
    store,
    orders: orders.map((o) => ({ id: o.id, number: o.order_number, status: o.status, total: o.total_paid, date: o.created_at })),
    topups: topups.map((t) => ({ invoice: t.invoice_number, status: t.status, amount: t.amount, date: t.created_at })),
    ledger: ledger.map((l) => ({ type: l.type, amount: l.amount, balanceAfter: l.balance_after, reference: l.reference, date: l.created_at })),
    reports,
  });
});

/** Ban = profile flag (API refuses the session) + GoTrue ban (no new logins / refreshes). */
adminUsersRouter.post('/admin/users/:id/ban', async (req, res) => {
  const actor = await admin(req, 'users:ban');
  const id = parse(idParam, req.params.id);
  const { reason } = parse(z.object({ reason: reasonText }).strict(), req.body);
  if (id === actor.id) throw badRequest('Tidak bisa memblokir akun sendiri.');
  const target = await one<{ role: string }>(pool, 'select role from profiles where id = $1', [id]);
  if (!target) throw notFound('Pengguna');
  if (target.role === 'ADMIN') throw conflict('Cabut akses admin dulu sebelum memblokir.');
  await withTransaction(async (tx) => {
    await run(tx, 'update profiles set is_banned = true, ban_reason = $1 where id = $2', [reason, id]);
    await audit(tx, { actorId: actor.id, action: 'user.ban', targetType: 'user', targetId: id, detail: { reason }, ip: ipOf(req) });
  });
  await supabaseAdmin.auth.admin.updateUserById(id, { ban_duration: '876000h' }).catch(() => undefined);
  res.json({ ok: true });
});

adminUsersRouter.post('/admin/users/:id/unban', async (req, res) => {
  const actor = await admin(req, 'users:ban');
  const id = parse(idParam, req.params.id);
  await withTransaction(async (tx) => {
    if ((await run(tx, 'update profiles set is_banned = false, ban_reason = null where id = $1', [id])) === 0) throw notFound('Pengguna');
    await audit(tx, { actorId: actor.id, action: 'user.unban', targetType: 'user', targetId: id, ip: ipOf(req) });
  });
  await supabaseAdmin.auth.admin.updateUserById(id, { ban_duration: 'none' }).catch(() => undefined);
  res.json({ ok: true });
});

/** Balance correction (MONEY_RULES §12b) — a ledger ADJUSTMENT, never a cash-out. */
adminUsersRouter.post('/admin/users/:id/balance-adjust', async (req, res) => {
  const actor = await admin(req, 'payouts:approve');
  const id = parse(idParam, req.params.id);
  const { amount, reason } = parse(
    z
      .object({ amount: z.number().int().min(-100_000_000).max(100_000_000).refine((n) => n !== 0, 'tidak boleh 0'), reason: reasonText })
      .strict(),
    req.body,
  );
  const balance = await withTransaction(async (tx) => {
    const next = await moveUserBalance(tx, id, { type: 'ADJUSTMENT', amount, reference: `ADJ: ${reason}`.slice(0, 200) });
    await audit(tx, { actorId: actor.id, action: 'balance.adjust', targetType: 'user', targetId: id, detail: { amount, reason, balance: next }, ip: ipOf(req) });
    await notify(tx, id, {
      kind: 'SYSTEM',
      title: 'Penyesuaian Balance',
      body: `Balance ${amount > 0 ? 'bertambah' : 'berkurang'} Rp${Math.abs(amount).toLocaleString('id-ID')}: ${reason}`,
      link: '/balance/history',
    });
    return next;
  });
  res.json({ ok: true, balance });
});

// ── Admins & roles (Super Admin only) ──

adminUsersRouter.get('/admin/admins', async (req, res) => {
  await admin(req, 'rbac:manage');
  const [admins, roles, permissions] = await Promise.all([
    all<{ id: string; name: string; email: string; roles: string[] }>(
      pool,
      `select p.id, p.name, p.email, coalesce(array_agg(r.key order by r.key) filter (where r.key is not null), '{}') as roles
       from profiles p left join admin_user_roles ur on ur.user_id = p.id left join admin_roles r on r.id = ur.role_id
       where p.role = 'ADMIN' group by p.id order by p.name`,
    ),
    all<{ key: string; name: string; description: string | null; permissions: string[] }>(
      pool,
      `select r.key, r.name, r.description, coalesce(array_agg(rp.permission_key order by rp.permission_key) filter (where rp.permission_key is not null), '{}') as permissions
       from admin_roles r left join role_permissions rp on rp.role_id = r.id group by r.id order by r.name`,
    ),
    all<{ key: string; module: string; description: string }>(pool, 'select * from permissions order by module, key'),
  ]);
  res.json({ admins, roles, permissions });
});

const rolesSchema = z.object({ roles: z.array(z.string().regex(/^[A-Z_]{2,40}$/)).min(1, 'pilih minimal satu peran').max(10) }).strict();

async function setRoles(actorId: string, userId: string, roleKeys: string[], ip: string | undefined, action: string) {
  await withTransaction(async (tx) => {
    const roles = await all<{ id: string; key: string }>(tx, 'select id, key from admin_roles where key = any($1::text[])', [roleKeys]);
    if (roles.length !== new Set(roleKeys).size) throw badRequest('Ada peran yang tidak dikenal.');
    if (actorId === userId && !roleKeys.includes('SUPER_ADMIN')) throw badRequest('Tidak bisa melepas peran Super Admin dari akun sendiri.');
    await run(tx, `update profiles set role = 'ADMIN' where id = $1`, [userId]);
    await run(tx, 'delete from admin_user_roles where user_id = $1', [userId]);
    for (const role of roles) {
      await run(tx, 'insert into admin_user_roles (user_id, role_id, assigned_by) values ($1, $2, $3)', [userId, role.id, actorId]);
    }
    await audit(tx, { actorId, action, targetType: 'user', targetId: userId, detail: { roles: roleKeys }, ip });
  });
}

/** Make an existing user an admin (by email) with the given roles. */
adminUsersRouter.post('/admin/admins', async (req, res) => {
  const actor = await admin(req, 'rbac:manage');
  const { email, roles } = parse(z.object({ email: z.email().trim().toLowerCase(), roles: rolesSchema.shape.roles }).strict(), req.body);
  const user = await one<{ id: string; is_banned: boolean }>(pool, 'select id, is_banned from profiles where lower(email) = $1', [email]);
  if (!user) throw notFound('Pengguna dengan email itu');
  if (user.is_banned) throw conflict('Pengguna ini sedang diblokir.');
  if (await one(pool, 'select 1 from stores where owner_id = $1', [user.id])) throw conflict('Pemilik toko tidak bisa dijadikan admin.');
  await setRoles(actor.id, user.id, roles, ipOf(req), 'admin.grant');
  res.status(201).json({ ok: true });
});

adminUsersRouter.put('/admin/admins/:id/roles', async (req, res) => {
  const actor = await admin(req, 'rbac:manage');
  const id = parse(idParam, req.params.id);
  if (!(await one(pool, `select 1 from profiles where id = $1 and role = 'ADMIN'`, [id]))) throw notFound('Admin');
  await setRoles(actor.id, id, parse(rolesSchema, req.body).roles, ipOf(req), 'admin.roles');
  res.json({ ok: true });
});

adminUsersRouter.delete('/admin/admins/:id', async (req, res) => {
  const actor = await admin(req, 'rbac:manage');
  const id = parse(idParam, req.params.id);
  if (id === actor.id) throw badRequest('Tidak bisa mencabut akses admin akun sendiri.');
  await withTransaction(async (tx) => {
    if ((await run(tx, `update profiles set role = 'USER' where id = $1 and role = 'ADMIN'`, [id])) === 0) throw notFound('Admin');
    await run(tx, 'delete from admin_user_roles where user_id = $1', [id]);
    await audit(tx, { actorId: actor.id, action: 'admin.revoke', targetType: 'user', targetId: id, ip: ipOf(req) });
  });
  res.json({ ok: true });
});

// ── Audit log ──

adminUsersRouter.get('/admin/audit', async (req, res) => {
  await admin(req, 'audit:view');
  const q = parse(
    z
      .object({
        action: z.string().trim().max(60).optional(),
        actor: z.string().trim().max(80).optional(),
        targetType: z.string().trim().max(40).optional(),
        from: z.iso.date().optional(),
        to: z.iso.date().optional(),
      })
      .strict(),
    req.query,
  );
  const rows = await all<{ id: number; action: string; target_type: string; target_id: string; detail: unknown; ip: string | null; created_at: string; actor_name: string | null; actor_email: string | null }>(
    pool,
    `select a.*, p.name as actor_name, p.email as actor_email from audit_logs a left join profiles p on p.id = a.actor_id
     where ($1::text is null or a.action ilike $1) and ($2::text is null or p.name ilike $2 or p.email ilike $2)
       and ($3::text is null or a.target_type = $3) and ($4::date is null or a.created_at >= $4) and ($5::date is null or a.created_at < $5::date + 1)
     order by a.id desc limit 300`,
    [q.action ? `%${q.action}%` : null, q.actor ? `%${q.actor}%` : null, q.targetType ?? null, q.from ?? null, q.to ?? null],
  );
  res.json({
    entries: rows.map((a) => ({
      id: a.id,
      action: a.action,
      targetType: a.target_type,
      targetId: a.target_id,
      detail: a.detail,
      ip: a.ip,
      actor: a.actor_name ? `${a.actor_name} (${a.actor_email})` : 'Sistem',
      date: a.created_at,
    })),
  });
});

// ── Top-up analytics per game account ──

adminUsersRouter.get('/admin/analytics', async (req, res) => {
  await admin(req, 'audit:view');
  const summary = await one<{ total_revenue: number; total_transactions: number; unique_accounts: number; avg_ticket: number }>(
    pool,
    `select coalesce(sum(amount), 0)::bigint as total_revenue, count(*)::int as total_transactions,
            count(distinct user_game_id || '|' || coalesce(game_zone_id, ''))::int as unique_accounts,
            coalesce(round(avg(amount)), 0)::bigint as avg_ticket
     from topup_orders where status = 'SUCCESS'`,
  );
  const accounts = await all(
    pool,
    `select user_game_id, game_zone_id, count(*)::int as topup_count, sum(amount)::bigint as total_spent, round(avg(amount))::bigint as avg_spent,
            min(created_at) as first_topup_at, max(created_at) as last_topup_at, max(case when user_id is not null then 1 else 0 end) as linked_to_user
     from topup_orders where status = 'SUCCESS'
     group by user_game_id, game_zone_id order by total_spent desc, topup_count desc limit 100`,
  );
  res.json({
    summary: {
      totalRevenue: summary?.total_revenue ?? 0,
      totalTransactions: summary?.total_transactions ?? 0,
      uniqueAccounts: summary?.unique_accounts ?? 0,
      avgTicket: summary?.avg_ticket ?? 0,
    },
    accounts,
  });
});
