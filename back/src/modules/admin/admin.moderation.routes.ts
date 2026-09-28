// Admin · Dashboard + Moderasi: catalogs, stores, user reports (ADMIN_PANEL §3.1–3.4).
import { Router } from 'express';
import { z } from 'zod';
import { all, one, pool, run, withTransaction } from '../../db/pool.js';
import { audit } from '../../lib/audit.js';
import { conflict, notFound, parse } from '../../lib/errors.js';
import { notifyStore, notify } from '../../lib/notify.js';
import { permissionsOf, requireUser } from '../../middlewares/auth.js';
import { forbidden } from '../../lib/errors.js';
import * as catalogs from '../catalogs/catalogs.service.js';
import { moveStoreBalance } from '../../lib/ledger.js';
import { applySanction } from '../store/sanctions.js';
import { toStoreContext, type OwnStore } from '../store/store.context.js';
import { admin, idParam, ipOf, optionalNote, reasonText } from './admin.guard.js';

export const adminModerationRouter = Router();

/** Sidebar badges: items waiting for a decision (any admin). */
adminModerationRouter.get('/admin/queue-counts', async (req, res) => {
  const user = requireUser(req);
  if (user.role !== 'ADMIN') throw forbidden('Khusus admin.');
  const counts = await one<Record<string, number>>(
    pool,
    `select
       (select count(*)::int from catalogs where status = 'PENDING_REVIEW') as catalogs,
       (select count(*)::int from stores where status in ('PENDING_REVIEW', 'CLOSING')) as stores,
       (select count(*)::int from reports where status in ('OPEN', 'REVIEWING')) as reports,
       (select count(*)::int from disputes where status in ('OPEN', 'STORE_RESPONDED', 'IN_REVIEW')) as disputes,
       (select count(*)::int from withdrawals where status = 'PENDING') as withdrawals,
       (select count(*)::int from transfer_requests where status = 'PENDING') as transfers,
       (select count(*)::int from refunds where status = 'PENDING') as refunds`,
  );
  res.json({ counts, permissions: [...(await permissionsOf(user.id))].sort() });
});

adminModerationRouter.get('/admin/dashboard', async (req, res) => {
  await admin(req, 'dashboard:view');
  const [kpi, queues, recent] = await Promise.all([
    one<Record<string, number>>(
      pool,
      `select
         (select coalesce(sum(item_price), 0)::bigint from orders where status = 'COMPLETED' and completed_at::date = current_date) as gmv_today,
         (select coalesce(sum(item_price), 0)::bigint from orders where status = 'COMPLETED' and completed_at > now() - interval '30 days') as gmv_30d,
         (select count(*)::int from orders where status in ('PAID', 'IN_REKBER', 'SAFE', 'DISPUTED')) as active_orders,
         (select coalesce(sum(commission), 0)::bigint from orders where status = 'COMPLETED' and completed_at > now() - interval '30 days') as commission_30d,
         (select count(*)::int from topup_orders where status = 'SUCCESS' and created_at > now() - interval '30 days') as topups_30d,
         (select coalesce(sum(balance), 0)::bigint from profiles) as balance_float,
         (select coalesce(sum(escrow), 0)::bigint from store_balances) as escrow_held,
         (select count(*)::int from catalogs where status = 'LISTED') as listed_catalogs,
         (select count(*)::int from stores where status = 'ACTIVE') as active_stores,
         (select count(*)::int from profiles where role = 'USER') as users`,
    ),
    one<Record<string, number>>(
      pool,
      `select
         (select count(*)::int from catalogs where status = 'PENDING_REVIEW') as catalogs,
         (select count(*)::int from catalogs where status = 'PENDING_REVIEW' and submitted_at < now() - interval '24 hours') as catalogs_overdue,
         (select count(*)::int from stores where status in ('PENDING_REVIEW', 'CLOSING')) as stores,
         (select count(*)::int from disputes where status in ('OPEN', 'STORE_RESPONDED', 'IN_REVIEW')) as disputes,
         (select count(*)::int from disputes where status = 'OPEN' and store_deadline < now()) as disputes_overdue,
         (select count(*)::int from withdrawals where status = 'PENDING') as withdrawals,
         (select count(*)::int from transfer_requests where status = 'PENDING') as transfers,
       (select count(*)::int from refunds where status = 'PENDING') as refunds,
         (select count(*)::int from reports where status in ('OPEN', 'REVIEWING')) as reports`,
    ),
    all<{ id: number; action: string; target_type: string; target_id: string; created_at: string; actor_name: string | null }>(
      pool,
      `select a.id, a.action, a.target_type, a.target_id, a.created_at, p.name as actor_name
       from audit_logs a left join profiles p on p.id = a.actor_id order by a.id desc limit 10`,
    ),
  ]);
  res.json({
    kpi,
    queues,
    recent: recent.map((a) => ({ id: a.id, action: a.action, targetType: a.target_type, targetId: a.target_id, actor: a.actor_name ?? 'Sistem', date: a.created_at })),
  });
});

// ── Catalog moderation ──

const catalogStatus = z.enum(['DRAFT', 'PENDING_REVIEW', 'REJECTED', 'LISTED', 'LOCKED', 'IN_ORDER', 'SOLD', 'DELISTED']);

adminModerationRouter.get('/admin/catalogs', async (req, res) => {
  await admin(req, 'catalogs:view');
  const q = parse(
    z
      .object({
        status: z.union([catalogStatus, z.literal('ALL')]).default('PENDING_REVIEW'),
        game: z.string().max(50).optional(),
        store: z.string().max(60).optional(),
        q: z.string().trim().max(80).optional(),
        overdue: z.enum(['1', 'true']).optional(),
      })
      .strict(),
    req.query,
  );
  res.json({
    catalogs: await catalogs.adminCatalogQueue({
      status: q.status === 'ALL' ? undefined : q.status,
      game: q.game,
      store: q.store,
      q: q.q,
      olderThanHours: q.overdue ? 24 : undefined,
    }),
    reasons: catalogs.REJECTION_REASONS,
  });
});

adminModerationRouter.get('/admin/catalogs/:id', async (req, res) => {
  await admin(req, 'catalogs:view');
  const detail = await catalogs.catalogDetail(parse(idParam, req.params.id));
  const store = await one<OwnStore & { sanctions: number; listed: number }>(
    pool,
    `select s.*, (select count(*)::int from store_sanctions x where x.store_id = s.id) as sanctions,
       (select count(*)::int from catalogs c where c.store_id = s.id and c.status = 'LISTED') as listed
     from stores s where s.id = $1`,
    [detail.listing.storeId],
  );
  res.json({
    ...detail,
    store: store && { ...toStoreContext(store), sanctions: store.sanctions, listedCount: store.listed },
    reasons: catalogs.REJECTION_REASONS,
  });
});

const decisionSchema = z
  .object({
    reasons: z.array(z.enum(catalogs.REJECTION_REASONS)).min(1, 'pilih minimal satu alasan').max(8),
    note: optionalNote,
  })
  .strict();

adminModerationRouter.post('/admin/catalogs/:id/approve', async (req, res) => {
  const user = await admin(req, 'catalogs:moderate');
  const { note } = parse(z.object({ note: optionalNote }).strict(), req.body ?? {});
  await catalogs.approveCatalog(user, parse(idParam, req.params.id), note, ipOf(req));
  res.json({ ok: true });
});

adminModerationRouter.post('/admin/catalogs/:id/reject', async (req, res) => {
  const user = await admin(req, 'catalogs:moderate');
  const { reasons, note } = parse(decisionSchema, req.body);
  await catalogs.rejectCatalog(user, parse(idParam, req.params.id), reasons, note, ipOf(req));
  res.json({ ok: true });
});

adminModerationRouter.post('/admin/catalogs/:id/takedown', async (req, res) => {
  const user = await admin(req, 'catalogs:takedown');
  const { reasons, note } = parse(decisionSchema, req.body);
  await catalogs.takedownCatalog(user, parse(idParam, req.params.id), reasons, note, ipOf(req));
  res.json({ ok: true });
});

// ── Store verification ──

const storeStatus = z.enum(['PENDING_DEPOSIT', 'PENDING_REVIEW', 'ACTIVE', 'REJECTED', 'SUSPENDED', 'CLOSING', 'CLOSED']);

adminModerationRouter.get('/admin/stores', async (req, res) => {
  await admin(req, 'stores:view');
  const q = parse(z.object({ status: z.union([storeStatus, z.literal('ALL')]).default('PENDING_REVIEW'), q: z.string().trim().max(80).optional() }).strict(), req.query);
  const rows = await all<OwnStore & { owner_name: string; owner_email: string; tier: string | null; listed: number }>(
    pool,
    `select s.*, p.name as owner_name, p.email as owner_email, sub.tier,
       (select count(*)::int from catalogs c where c.store_id = s.id and c.status = 'LISTED') as listed
     from stores s join profiles p on p.id = s.owner_id left join store_subscriptions sub on sub.store_id = s.id
     where ($1::store_status is null or s.status = $1) and ($2::text is null or s.name ilike $2 or p.email ilike $2 or s.owner_legal_name ilike $2)
     order by case when s.status = 'PENDING_REVIEW' then s.updated_at end asc nulls last, s.created_at desc limit 200`,
    [q.status === 'ALL' ? null : q.status, q.q ? `%${q.q}%` : null],
  );
  res.json({
    stores: rows.map((s) => ({ ...toStoreContext(s), owner: { name: s.owner_name, email: s.owner_email }, tier: s.tier ?? 'FREE', listedCount: s.listed })),
  });
});

adminModerationRouter.get('/admin/stores/:id', async (req, res) => {
  await admin(req, 'stores:view');
  const id = parse(idParam, req.params.id);
  const store = await one<OwnStore & { owner_name: string; owner_email: string; owner_phone: string | null }>(
    pool,
    'select s.*, p.name as owner_name, p.email as owner_email, p.phone as owner_phone from stores s join profiles p on p.id = s.owner_id where s.id = $1',
    [id],
  );
  if (!store) throw notFound('Toko');
  const [catalogCounts, orders, balance, ledger, sanctions, history, subscription] = await Promise.all([
    all<{ status: string; n: number }>(pool, 'select status, count(*)::int as n from catalogs where store_id = $1 group by status', [id]),
    all<{ id: string; order_number: string; status: string; item_price: number; created_at: string }>(
      pool,
      'select id, order_number, status, item_price, created_at from orders where store_id = $1 order by created_at desc limit 20',
      [id],
    ),
    one<{ escrow: number; available: number; deposit: number }>(pool, 'select escrow, available, deposit from store_balances where store_id = $1', [id]),
    all<{ id: number; bucket: string; type: string; amount: number; balance_after: number; note: string | null; created_at: string }>(
      pool,
      'select id, bucket, type, amount, balance_after, note, created_at from store_ledger where store_id = $1 order by id desc limit 30',
      [id],
    ),
    all<{ id: string; type: string; amount: number; reason: string; created_at: string; admin_name: string }>(
      pool,
      'select x.*, p.name as admin_name from store_sanctions x join profiles p on p.id = x.created_by where x.store_id = $1 order by x.created_at desc',
      [id],
    ),
    all<{ id: number; action: string; detail: unknown; created_at: string; actor_name: string | null }>(
      pool,
      `select a.id, a.action, a.detail, a.created_at, p.name as actor_name from audit_logs a left join profiles p on p.id = a.actor_id
       where a.target_type = 'store' and a.target_id = $1 order by a.id desc limit 30`,
      [id],
    ),
    one<{ tier: string; current_period_end: string | null }>(pool, 'select tier, current_period_end from store_subscriptions where store_id = $1', [id]),
  ]);
  res.json({
    store: { ...toStoreContext(store), owner: { name: store.owner_name, email: store.owner_email, phone: store.owner_phone } },
    subscription,
    catalogs: Object.fromEntries(catalogCounts.map((c) => [c.status, c.n])),
    orders: orders.map((o) => ({ id: o.id, number: o.order_number, status: o.status, itemPrice: o.item_price, date: o.created_at })),
    balance: balance ?? { escrow: 0, available: 0, deposit: 0 },
    ledger: ledger.map((l) => ({ id: String(l.id), bucket: l.bucket, type: l.type, amount: l.amount, balanceAfter: l.balance_after, note: l.note, date: l.created_at })),
    sanctions: sanctions.map((s) => ({ id: s.id, type: s.type, amount: s.amount, reason: s.reason, admin: s.admin_name, date: s.created_at })),
    history: history.map((h) => ({ id: h.id, action: h.action, detail: h.detail, actor: h.actor_name ?? 'Sistem', date: h.created_at })),
  });
});

type StoreDecision = 'approve' | 'reject' | 'suspend' | 'reactivate';

async function decideStore(adminUser: Awaited<ReturnType<typeof admin>>, id: string, decision: StoreDecision, note: string | undefined, ip: string | undefined) {
  await withTransaction(async (tx) => {
    const s = await one<{ status: string; name: string }>(tx, 'select status, name from stores where id = $1 for update', [id]);
    if (!s) throw notFound('Toko');
    const from: Record<StoreDecision, string> = { approve: 'PENDING_REVIEW', reject: 'PENDING_REVIEW', suspend: 'ACTIVE', reactivate: 'SUSPENDED' };
    if (s.status !== from[decision]) throw conflict(`Aksi ini hanya untuk toko berstatus ${from[decision]}.`, 'BAD_STATE');
    const to = { approve: 'ACTIVE', reject: 'REJECTED', suspend: 'SUSPENDED', reactivate: 'ACTIVE' }[decision];
    await run(
      tx,
      `update stores set status = $1::store_status, review_note = $2, reviewed_by = $3, reviewed_at = now(),
         identity_verified = case when $1::store_status = 'ACTIVE' then true else identity_verified end,
         deposit_status = case when $4 then 'RELEASED'::deposit_status else deposit_status end
       where id = $5`,
      [to, note ?? null, adminUser.id, decision === 'reject', id],
    );
    if (decision === 'approve') {
      await run(tx, 'insert into store_balances (store_id) values ($1) on conflict do nothing', [id]);
      await run(tx, 'insert into store_subscriptions (store_id) values ($1) on conflict do nothing', [id]);
      // The paid deposit enters the store ledger (bucket DEPOSIT) — MONEY_RULES §12.
      const dep = await one<{ deposit_amount: number; deposit_status: string; held: number }>(
        tx,
        'select s.deposit_amount, s.deposit_status, b.deposit as held from stores s join store_balances b on b.store_id = s.id where s.id = $1',
        [id],
      );
      if (dep && dep.deposit_status === 'HELD' && dep.held === 0) {
        await moveStoreBalance(tx, id, [
          { bucket: 'DEPOSIT', type: 'DEPOSIT_HOLD', amount: dep.deposit_amount, refType: 'deposit', refId: id, note: 'Deposit keamanan toko' },
        ]);
      }
    }
    if (decision === 'suspend') {
      await run(tx, `insert into store_sanctions (store_id, type, reason, created_by) values ($1, 'SUSPEND', $2, $3)`, [id, note ?? 'Ditangguhkan admin', adminUser.id]);
      await run(tx, `update featured_listings set status = 'STOPPED', stop_reason = 'Toko ditangguhkan' where store_id = $1 and status = 'ACTIVE'`, [id]);
    }
    await audit(tx, { actorId: adminUser.id, action: `store.${decision}`, targetType: 'store', targetId: id, detail: { note }, ip });
    const text: Record<StoreDecision, [string, string]> = {
      approve: ['Toko disetujui', 'Toko kamu aktif. Tambahkan katalog lalu ajukan untuk ditinjau.'],
      reject: ['Pendaftaran toko ditolak', `${note ?? ''} Deposit dikembalikan (disimulasikan).`],
      suspend: ['Toko ditangguhkan', `${note ?? ''} Semua katalog disembunyikan sementara.`],
      reactivate: ['Toko aktif kembali', note ?? 'Toko kamu sudah bisa berjualan lagi.'],
    };
    await notifyStore(tx, id, { title: text[decision][0], body: text[decision][1].trim(), link: '/store-dashboard' });
  });
}

adminModerationRouter.post('/admin/stores/:id/approve', async (req, res) => {
  const user = await admin(req, 'stores:verify');
  const { note } = parse(z.object({ note: optionalNote }).strict(), req.body ?? {});
  await decideStore(user, parse(idParam, req.params.id), 'approve', note, ipOf(req));
  res.json({ ok: true });
});

adminModerationRouter.post('/admin/stores/:id/reject', async (req, res) => {
  const user = await admin(req, 'stores:verify');
  const { note } = parse(z.object({ note: reasonText }).strict(), req.body);
  await decideStore(user, parse(idParam, req.params.id), 'reject', note, ipOf(req));
  res.json({ ok: true });
});

adminModerationRouter.post('/admin/stores/:id/suspend', async (req, res) => {
  const user = await admin(req, 'stores:suspend');
  const { note } = parse(z.object({ note: reasonText }).strict(), req.body);
  await decideStore(user, parse(idParam, req.params.id), 'suspend', note, ipOf(req));
  res.json({ ok: true });
});

adminModerationRouter.post('/admin/stores/:id/reactivate', async (req, res) => {
  const user = await admin(req, 'stores:suspend');
  const { note } = parse(z.object({ note: optionalNote }).strict(), req.body ?? {});
  await decideStore(user, parse(idParam, req.params.id), 'reactivate', note, ipOf(req));
  res.json({ ok: true });
});

const sanctionSchema = z
  .object({
    type: z.enum(['WARNING', 'FINE', 'SUSPEND']),
    amount: z.number().int().positive().max(100_000_000).optional(),
    reason: reasonText,
  })
  .strict()
  .refine((s) => s.type !== 'FINE' || s.amount !== undefined, { message: 'isi nilai denda', path: ['amount'] });

/** Warning, fine (from the deposit) or suspension — MONEY_RULES §14. */
adminModerationRouter.post('/admin/stores/:id/sanctions', async (req, res) => {
  const user = await admin(req, 'stores:suspend');
  const id = parse(idParam, req.params.id);
  const input = parse(sanctionSchema, req.body);
  const result = await withTransaction(async (tx) => {
    const store = await one<{ status: string }>(tx, 'select status from stores where id = $1 for update', [id]);
    if (!store) throw notFound('Toko');
    if (!['ACTIVE', 'SUSPENDED'].includes(store.status)) throw conflict('Sanksi hanya untuk toko aktif atau ditangguhkan.', 'BAD_STATE');
    if (input.type === 'SUSPEND' && store.status !== 'ACTIVE') throw conflict('Toko sudah ditangguhkan.', 'BAD_STATE');
    const r = await applySanction(tx, user.id, id, input);
    await audit(tx, { actorId: user.id, action: 'store.sanction', targetType: 'store', targetId: id, detail: { ...input, taken: r.taken }, ip: ipOf(req) });
    return r;
  });
  res.status(201).json(result);
});

/** Closure request (store CLOSING): approve → CLOSED + deposit refund; reject → ACTIVE. */
adminModerationRouter.post('/admin/stores/:id/close-decision', async (req, res) => {
  const user = await admin(req, 'stores:verify');
  const id = parse(idParam, req.params.id);
  const { decision, note } = parse(z.object({ decision: z.enum(['approve', 'reject']), note: optionalNote }).strict(), req.body);
  if (decision === 'reject' && !note) throw conflict('Alasan penolakan wajib diisi.', 'NOTE_REQUIRED');
  await withTransaction(async (tx) => {
    const store = await one<{ status: string }>(tx, 'select status from stores where id = $1 for update', [id]);
    if (!store) throw notFound('Toko');
    if (store.status !== 'CLOSING') throw conflict('Toko ini tidak sedang mengajukan penutupan.', 'BAD_STATE');
    if (decision === 'approve') {
      const bal = await one<{ escrow: number; available: number; deposit: number }>(tx, 'select escrow, available, deposit from store_balances where store_id = $1', [id]);
      if ((bal?.escrow ?? 0) + (bal?.available ?? 0) > 0) throw conflict('Saldo toko belum nol — toko harus menarik dana dulu.', 'BALANCE_LEFT');
      if (bal && bal.deposit > 0) {
        await moveStoreBalance(tx, id, [
          { bucket: 'DEPOSIT', type: 'DEPOSIT_REFUND', amount: -bal.deposit, refType: 'deposit', refId: id, note: 'Refund deposit (penutupan toko, disimulasikan)' },
        ]);
      }
      await run(tx, `update stores set status = 'CLOSED', deposit_status = 'RELEASED', review_note = $1, reviewed_by = $2, reviewed_at = now() where id = $3`, [
        note ?? 'Penutupan disetujui.',
        user.id,
        id,
      ]);
      await notifyStore(tx, id, {
        title: 'Toko ditutup',
        body: `Penutupan disetujui. Sisa deposit Rp${(bal?.deposit ?? 0).toLocaleString('id-ID')} dikembalikan ke metode pembayaran asal (disimulasikan).`,
        link: '/sell',
      });
    } else {
      await run(tx, `update stores set status = 'ACTIVE', review_note = $1, reviewed_by = $2, reviewed_at = now() where id = $3`, [note!, user.id, id]);
      await notifyStore(tx, id, { title: 'Penutupan toko ditolak', body: `${note} Katalog tetap tersembunyi — ajukan ulang dari dashboard.`, link: '/store-dashboard/settings' });
    }
    await audit(tx, { actorId: user.id, action: `store.close_${decision}`, targetType: 'store', targetId: id, detail: { note }, ip: ipOf(req) });
  });
  res.json({ ok: true });
});

adminModerationRouter.post('/admin/stores/:id/level', async (req, res) => {
  const user = await admin(req, 'stores:verify');
  const { level, note } = parse(z.object({ level: z.enum(['AUTHORIZED', 'VERIFIED', 'PLATINUM']), note: optionalNote }).strict(), req.body);
  const id = parse(idParam, req.params.id);
  await withTransaction(async (tx) => {
    if ((await run(tx, 'update stores set level = $1 where id = $2', [level, id])) === 0) throw notFound('Toko');
    await audit(tx, { actorId: user.id, action: 'store.level', targetType: 'store', targetId: id, detail: { level, note }, ip: ipOf(req) });
    await notifyStore(tx, id, { title: 'Level toko diperbarui', body: `Level toko kamu sekarang ${level}.`, link: '/store-dashboard' });
  });
  res.json({ ok: true });
});

// ── User reports ──

adminModerationRouter.get('/admin/reports', async (req, res) => {
  await admin(req, 'reports:manage');
  const { status } = parse(z.object({ status: z.enum(['OPEN', 'REVIEWING', 'RESOLVED', 'DISMISSED', 'ALL']).default('OPEN') }).strict(), req.query);
  const rows = await all<{ id: string; target_type: string; target_id: string; reason: string; detail: string | null; status: string; resolution_note: string | null; created_at: string; reporter_name: string; target_name: string | null; target_slug: string | null }>(
    pool,
    `select r.*, rp.name as reporter_name, coalesce(c.title, s.name, p.name) as target_name, coalesce(s.slug, cs.slug) as target_slug
     from reports r join profiles rp on rp.id = r.reporter_id
     left join catalogs c on r.target_type = 'CATALOG' and c.id = r.target_id
     left join stores cs on cs.id = c.store_id
     left join stores s on r.target_type = 'STORE' and s.id = r.target_id
     left join profiles p on r.target_type = 'USER' and p.id = r.target_id
     where ($1::report_status is null or r.status = $1 or ($1 = 'OPEN' and r.status = 'REVIEWING'))
     order by r.created_at asc limit 200`,
    [status === 'ALL' ? null : status],
  );
  res.json({
    reports: rows.map((r) => ({
      id: r.id,
      targetType: r.target_type,
      targetId: r.target_id,
      targetName: r.target_name,
      targetSlug: r.target_slug,
      reason: r.reason,
      detail: r.detail,
      status: r.status,
      resolutionNote: r.resolution_note,
      reporter: r.reporter_name,
      createdAt: r.created_at,
    })),
  });
});

const reportAction = z
  .object({
    decision: z.enum(['REVIEWING', 'RESOLVED', 'DISMISSED']),
    note: optionalNote,
    action: z.enum(['NONE', 'TAKEDOWN_CATALOG', 'SUSPEND_STORE']).default('NONE'),
  })
  .strict();

adminModerationRouter.post('/admin/reports/:id', async (req, res) => {
  const user = await admin(req, 'reports:manage');
  const id = parse(idParam, req.params.id);
  const input = parse(reportAction, req.body);
  const r = await one<{ target_type: string; target_id: string; status: string; reporter_id: string }>(pool, 'select * from reports where id = $1', [id]);
  if (!r) throw notFound('Laporan');
  if (r.status === 'RESOLVED' || r.status === 'DISMISSED') throw conflict('Laporan sudah ditutup.', 'BAD_STATE');
  if (input.decision !== 'REVIEWING' && !input.note) throw conflict('Catatan wajib diisi saat menutup laporan.', 'NOTE_REQUIRED');

  if (input.decision === 'RESOLVED' && input.action === 'TAKEDOWN_CATALOG') {
    if (r.target_type !== 'CATALOG') throw conflict('Target laporan bukan katalog.');
    const perms = await permissionsOf(user.id);
    if (!perms.has('catalogs:takedown')) throw forbidden('Butuh izin catalogs:takedown.');
    await catalogs.takedownCatalog(user, r.target_id, ['Lainnya'], `Laporan pengguna: ${input.note}`, ipOf(req));
  }
  if (input.decision === 'RESOLVED' && input.action === 'SUSPEND_STORE') {
    const perms = await permissionsOf(user.id);
    if (!perms.has('stores:suspend')) throw forbidden('Butuh izin stores:suspend.');
    const storeId =
      r.target_type === 'STORE'
        ? r.target_id
        : r.target_type === 'CATALOG'
          ? (await one<{ store_id: string }>(pool, 'select store_id from catalogs where id = $1', [r.target_id]))?.store_id
          : undefined;
    if (!storeId) throw conflict('Target laporan tidak terkait toko.');
    await decideStore(user, storeId, 'suspend', `Laporan pengguna: ${input.note}`, ipOf(req));
  }

  await withTransaction(async (tx) => {
    await run(tx, 'update reports set status = $1, resolution_note = coalesce($2, resolution_note), handled_by = $3, handled_at = now() where id = $4', [
      input.decision,
      input.note ?? null,
      user.id,
      id,
    ]);
    await audit(tx, { actorId: user.id, action: `report.${input.decision.toLowerCase()}`, targetType: 'report', targetId: id, detail: input, ip: ipOf(req) });
    if (input.decision !== 'REVIEWING') {
      await notify(tx, r.reporter_id, {
        kind: 'SYSTEM',
        title: input.decision === 'RESOLVED' ? 'Laporanmu ditindaklanjuti' : 'Laporanmu ditutup',
        body: input.note ?? '',
        link: '/account/reports',
      });
    }
  });
  res.json({ ok: true });
});
