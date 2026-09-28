// Admin · Transaksi & Keuangan: orders, disputes, top-ups, payments/webhooks,
// withdrawals, transfers, finance summary, ads & subscriptions (ADMIN_PANEL §3.5–3.8).
import { Router } from 'express';
import { z } from 'zod';
import { all, one, pool, run, withTransaction } from '../../db/pool.js';
import { audit } from '../../lib/audit.js';
import { conflict, notFound, parse } from '../../lib/errors.js';
import { moveStoreBalance } from '../../lib/ledger.js';
import { notifyStore } from '../../lib/notify.js';
import * as disputes from '../disputes/disputes.service.js';
import * as orders from '../orders/orders.service.js';
import { toTransfer, toWithdrawal, TRANSFER_SELECT, type TransferRow, type WithdrawalRow } from '../store/store.routes.js';
import { listAllBalanceTx, listAllTopupTx } from '../topup/topup.repository.js';
import { admin, idParam, ipOf, optionalNote, reasonText } from './admin.guard.js';

export const adminTransactionsRouter = Router();

// ── Orders ──

const orderStatus = z.enum(['PENDING_PAYMENT', 'PAID', 'IN_REKBER', 'SAFE', 'COMPLETED', 'CANCELLED', 'DISPUTED', 'REFUNDED']);

adminTransactionsRouter.get('/admin/orders', async (req, res) => {
  await admin(req, 'orders:view');
  const q = parse(z.object({ status: orderStatus.optional(), q: z.string().trim().max(80).optional() }).strict(), req.query);
  const rows = await all<orders.OrderRow>(
    pool,
    `${orders.ORDER_SELECT}
     where ($1::order_status is null or o.status = $1)
       and ($2::text is null or o.order_number ilike $2 or p.email ilike $2 or s.name ilike $2
            or exists (select 1 from order_items x where x.order_id = o.id and x.vs_code ilike $2))
     order by o.created_at desc limit 200`,
    [q.status ?? null, q.q ? `%${q.q}%` : null],
  );
  res.json({ orders: rows.map((o) => orders.toOrderView(o, 'ADMIN')) });
});

adminTransactionsRouter.get('/admin/orders/:id', async (req, res) => {
  await admin(req, 'orders:view');
  const order = await orders.findOrder(pool, parse(idParam, req.params.id));
  if (!order) throw notFound('Pesanan');
  res.json({ order: orders.toOrderView(order, 'ADMIN') });
});

adminTransactionsRouter.post('/admin/orders/:id/cancel', async (req, res) => {
  const user = await admin(req, 'orders:intervene');
  const id = parse(idParam, req.params.id);
  const { note } = parse(z.object({ note: reasonText }).strict(), req.body);
  await orders.cancelOrder(user, id);
  await audit(pool, { actorId: user.id, action: 'order.cancel', targetType: 'order', targetId: id, detail: { note }, ip: ipOf(req) });
  res.json({ ok: true });
});

// ── Disputes ──

adminTransactionsRouter.get('/admin/disputes', async (req, res) => {
  await admin(req, 'disputes:resolve');
  const { status } = parse(z.object({ status: z.enum(['ACTIVE', 'OPEN', 'STORE_RESPONDED', 'IN_REVIEW', 'CLOSED', 'ALL']).default('ACTIVE') }).strict(), req.query);
  const filter = {
    ACTIVE: `d.status in ('OPEN', 'STORE_RESPONDED', 'IN_REVIEW')`,
    CLOSED: `d.status in ('RESOLVED_BUYER', 'RESOLVED_STORE', 'CANCELLED')`,
    ALL: 'true',
    OPEN: `d.status = 'OPEN'`,
    STORE_RESPONDED: `d.status = 'STORE_RESPONDED'`,
    IN_REVIEW: `d.status = 'IN_REVIEW'`,
  }[status];
  const rows = await all<Parameters<typeof disputes.toDisputeSummary>[0]>(pool, `${disputes.DISPUTE_SELECT} where ${filter} order by d.created_at asc limit 200`);
  res.json({ disputes: rows.map(disputes.toDisputeSummary) });
});

const resolveSchema = z
  .object({
    winner: z.enum(['BUYER', 'STORE']),
    note: reasonText,
    compensation: z.number().int().positive().max(1_000_000_000).optional(),
    sanction: z
      .object({
        type: z.enum(['WARNING', 'SUSPEND', 'FINE']),
        amount: z.number().int().min(0).max(500_000).optional(),
        reason: optionalNote,
      })
      .strict()
      .optional(),
  })
  .strict();

adminTransactionsRouter.post('/admin/disputes/:id/resolve', async (req, res) => {
  const user = await admin(req, 'disputes:resolve');
  await disputes.resolveDispute(user, parse(idParam, req.params.id), parse(resolveSchema, req.body), ipOf(req));
  res.json({ ok: true });
});

// ── Top-ups & payments ──

adminTransactionsRouter.get('/admin/topups', async (req, res) => {
  await admin(req, 'payments:view');
  const q = parse(
    z.object({ q: z.string().trim().max(80).optional(), status: z.enum(['PENDING', 'PAID', 'PROCESSING', 'SUCCESS', 'FAILED', 'EXPIRED', 'REFUNDED']).optional() }).strict(),
    req.query,
  );
  const [topups, fills] = await Promise.all([listAllTopupTx(pool, q.q, q.status), listAllBalanceTx(pool, q.q)]);
  res.json({ topups, balanceFills: fills });
});

adminTransactionsRouter.get('/admin/payments', async (req, res) => {
  await admin(req, 'payments:view');
  const q = parse(
    z
      .object({
        purpose: z.enum(['TOPUP', 'BALANCE_FILL', 'ORDER', 'STORE_DEPOSIT', 'SUBSCRIPTION', 'AD', 'LOCK']).optional(),
        status: z.enum(['PENDING', 'PAID', 'EXPIRED', 'FAILED']).optional(),
        q: z.string().trim().max(80).optional(),
      })
      .strict(),
    req.query,
  );
  const [payments, webhooks] = await Promise.all([
    all<{ id: string; midtrans_order_id: string; purpose: string; amount: number; payment_method: string; status: string; payment_type: string | null; created_at: string; paid_at: string | null; user_email: string | null }>(
      pool,
      `select x.*, p.email as user_email from payments x left join profiles p on p.id = x.user_id
       where ($1::payment_purpose is null or x.purpose = $1) and ($2::payment_status is null or x.status = $2)
         and ($3::text is null or x.midtrans_order_id ilike $3 or p.email ilike $3)
       order by x.created_at desc limit 200`,
      [q.purpose ?? null, q.status ?? null, q.q ? `%${q.q}%` : null],
    ),
    all<{ id: number; source: string; external_id: string; signature_valid: boolean; processed: boolean; received_at: string; invoice: string | null }>(
      pool,
      `select w.id, w.source, w.external_id, w.signature_valid, w.processed, w.received_at, x.midtrans_order_id as invoice
       from webhook_events w left join payments x on x.id = w.payment_id order by w.id desc limit 100`,
    ),
  ]);
  res.json({
    payments: payments.map((p) => ({
      id: p.id,
      invoice: p.midtrans_order_id,
      purpose: p.purpose,
      amount: p.amount,
      method: p.payment_method,
      status: p.status,
      paymentType: p.payment_type,
      user: p.user_email,
      createdAt: p.created_at,
      paidAt: p.paid_at,
    })),
    webhooks: webhooks.map((w) => ({
      id: w.id,
      source: w.source,
      externalId: w.external_id,
      signatureValid: w.signature_valid,
      processed: w.processed,
      invoice: w.invoice,
      receivedAt: w.received_at,
    })),
  });
});

// ── Withdrawals & transfers (maker-checker; Iris simulated) ──

const payoutStatus = z.object({ status: z.enum(['PENDING', 'COMPLETED', 'REJECTED', 'ALL']).default('PENDING') }).strict();

adminTransactionsRouter.get('/admin/withdrawals', async (req, res) => {
  await admin(req, 'finance:view');
  const { status } = parse(payoutStatus, req.query);
  const rows = await all<WithdrawalRow & { store_name: string; store_slug: string; owner_legal_name: string }>(
    pool,
    `select w.*, s.name as store_name, s.slug as store_slug, s.owner_legal_name
     from withdrawals w join stores s on s.id = w.store_id
     where ($1::payout_status is null or w.status = $1) order by w.created_at asc limit 200`,
    [status === 'ALL' ? null : status],
  );
  res.json({ withdrawals: rows.map((w) => ({ ...toWithdrawal(w), store: { name: w.store_name, slug: w.store_slug, ownerLegalName: w.owner_legal_name } })) });
});

const payoutDecision = z.object({ decision: z.enum(['approve', 'reject']), note: optionalNote }).strict();

adminTransactionsRouter.post('/admin/withdrawals/:id', async (req, res) => {
  const user = await admin(req, 'payouts:approve');
  const { decision, note } = parse(payoutDecision, req.body);
  if (decision === 'reject' && !note) throw conflict('Alasan penolakan wajib diisi.', 'NOTE_REQUIRED');
  const id = parse(idParam, req.params.id);
  await withTransaction(async (tx) => {
    const w = await one<{ id: string; store_id: string; amount: number; status: string; withdrawal_number: string }>(
      tx,
      'select id, store_id, amount, status, withdrawal_number from withdrawals where id = $1 for update',
      [id],
    );
    if (!w) throw notFound('Penarikan');
    if (w.status !== 'PENDING') throw conflict('Penarikan ini sudah diproses.', 'BAD_STATE');
    await run(tx, 'update withdrawals set status = $1, review_note = $2, reviewed_by = $3, reviewed_at = now() where id = $4', [
      decision === 'approve' ? 'COMPLETED' : 'REJECTED',
      note ?? null,
      user.id,
      w.id,
    ]);
    if (decision === 'reject') {
      await moveStoreBalance(tx, w.store_id, [
        { bucket: 'AVAILABLE', type: 'PAYOUT_REVERSAL', amount: w.amount, refType: 'withdrawal', refId: w.id, note: note ?? 'Ditolak admin' },
      ]);
    }
    await audit(tx, { actorId: user.id, action: `withdrawal.${decision}`, targetType: 'withdrawal', targetId: w.id, detail: { note }, ip: ipOf(req) });
    await notifyStore(tx, w.store_id, {
      title: decision === 'approve' ? 'Penarikan dikirim' : 'Penarikan ditolak',
      body: decision === 'approve' ? `${w.withdrawal_number} sudah ditransfer (disimulasikan).` : `${w.withdrawal_number}: ${note}. Dana dikembalikan ke saldo.`,
      link: '/store-dashboard/balance',
    });
  });
  res.json({ ok: true });
});

adminTransactionsRouter.get('/admin/transfers', async (req, res) => {
  await admin(req, 'finance:view');
  const { status } = parse(payoutStatus, req.query);
  const rows = await all<TransferRow>(pool, `${TRANSFER_SELECT} where ($1::payout_status is null or t.status = $1) order by t.created_at asc limit 200`, [
    status === 'ALL' ? null : status,
  ]);
  res.json({ transfers: rows.map(toTransfer) });
});

adminTransactionsRouter.post('/admin/transfers/:id', async (req, res) => {
  const user = await admin(req, 'payouts:approve');
  const { decision, note } = parse(payoutDecision, req.body);
  if (decision === 'reject' && !note) throw conflict('Alasan penolakan wajib diisi.', 'NOTE_REQUIRED');
  const id = parse(idParam, req.params.id);
  await withTransaction(async (tx) => {
    const t = await one<{ id: string; store_id: string; amount: number; status: string; transfer_number: string }>(
      tx,
      'select id, store_id, amount, status, transfer_number from transfer_requests where id = $1 for update',
      [id],
    );
    if (!t) throw notFound('Transfer');
    if (t.status !== 'PENDING') throw conflict('Transfer ini sudah diproses.', 'BAD_STATE');
    await run(tx, 'update transfer_requests set status = $1, review_note = $2, reviewed_by = $3, reviewed_at = now() where id = $4', [
      decision === 'approve' ? 'COMPLETED' : 'REJECTED',
      note ?? null,
      user.id,
      t.id,
    ]);
    if (decision === 'reject') {
      await moveStoreBalance(tx, t.store_id, [
        { bucket: 'AVAILABLE', type: 'PAYOUT_REVERSAL', amount: t.amount, refType: 'transfer', refId: t.id, note: note ?? 'Ditolak admin' },
      ]);
    }
    await audit(tx, { actorId: user.id, action: `transfer.${decision}`, targetType: 'transfer', targetId: t.id, detail: { note }, ip: ipOf(req) });
    await notifyStore(tx, t.store_id, {
      title: decision === 'approve' ? 'Transfer dikirim' : 'Transfer ditolak',
      body: decision === 'approve' ? `${t.transfer_number} sudah dikirim ke penjual eksternal (disimulasikan).` : `${t.transfer_number}: ${note}. Dana dikembalikan ke saldo.`,
      link: '/store-dashboard/external-sellers',
    });
  });
  res.json({ ok: true });
});

// ── Finance summary (read-only) ──

adminTransactionsRouter.get('/admin/finance', async (req, res) => {
  await admin(req, 'finance:view');
  const days = parse(z.coerce.number().int().min(1).max(365).default(30), req.query.days);
  const [revenue, balances, payouts, daily] = await Promise.all([
    one<Record<string, number>>(
      pool,
      `select
         (select coalesce(sum(commission), 0)::bigint from orders where status = 'COMPLETED' and completed_at > now() - make_interval(days => $1)) as commission,
         (select coalesce(sum(handling_fee), 0)::bigint from orders where paid_at is not null and status <> 'REFUNDED' and paid_at > now() - make_interval(days => $1)) as handling_fees,
         (select coalesce(sum(protection_fee), 0)::bigint from orders where paid_at is not null and status <> 'REFUNDED' and paid_at > now() - make_interval(days => $1)) as protection_fees,
         (select coalesce(sum(amount), 0)::bigint from payments where purpose = 'SUBSCRIPTION' and status = 'PAID' and paid_at > now() - make_interval(days => $1)) as subscriptions,
         (select coalesce(sum(amount), 0)::bigint from payments where purpose = 'AD' and status = 'PAID' and paid_at > now() - make_interval(days => $1)) as ads,
         (select coalesce(sum(amount), 0)::bigint from payments where purpose = 'LOCK' and status = 'PAID' and paid_at > now() - make_interval(days => $1)) as lock_fees,
         (select coalesce(sum(surcharge), 0)::bigint from topup_orders where status = 'SUCCESS' and created_at > now() - make_interval(days => $1)) as topup_surcharge,
         (select coalesce(sum(amount), 0)::bigint from topup_orders where status = 'SUCCESS' and created_at > now() - make_interval(days => $1)) as topup_volume,
         (select coalesce(sum(fee), 0)::bigint from withdrawals where status = 'COMPLETED' and reviewed_at > now() - make_interval(days => $1)) as withdraw_fees,
         (select coalesce(sum(fee), 0)::bigint from transfer_requests where status = 'COMPLETED' and reviewed_at > now() - make_interval(days => $1)) as transfer_fees`,
      [days],
    ),
    one<Record<string, number>>(
      pool,
      `select (select coalesce(sum(escrow), 0)::bigint from store_balances) as escrow,
              (select coalesce(sum(available), 0)::bigint from store_balances) as store_available,
              (select coalesce(sum(balance), 0)::bigint from profiles) as balance_float,
              (select coalesce(sum(deposit_amount), 0)::bigint from stores where deposit_status = 'HELD') as deposits_held`,
    ),
    all<{ kind: string; status: string; n: number; total: number }>(
      pool,
      `select 'WITHDRAWAL' as kind, status, count(*)::int as n, coalesce(sum(amount), 0)::bigint as total from withdrawals group by status
       union all
       select 'TRANSFER', status, count(*)::int, coalesce(sum(amount), 0)::bigint from transfer_requests group by status`,
    ),
    all<{ day: string; gmv: number; commission: number; topup: number }>(
      pool,
      `select to_char(d, 'YYYY-MM-DD') as day,
         (select coalesce(sum(item_price), 0)::bigint from orders where status = 'COMPLETED' and completed_at::date = d::date) as gmv,
         (select coalesce(sum(commission), 0)::bigint from orders where status = 'COMPLETED' and completed_at::date = d::date) as commission,
         (select coalesce(sum(amount), 0)::bigint from topup_orders where status = 'SUCCESS' and created_at::date = d::date) as topup
       from generate_series(current_date - ($1::int - 1), current_date, interval '1 day') d order by d`,
      [days],
    ),
  ]);
  res.json({ days, revenue, balances, payouts, daily });
});

// ── Ads & subscriptions ──

adminTransactionsRouter.get('/admin/ads', async (req, res) => {
  await admin(req, 'ads:manage');
  const [ads, subs] = await Promise.all([
    all<{ id: string; title: string; catalog_id: string; store_name: string; duration_days: number; price: number; is_free: boolean; status: string; starts_at: string | null; ends_at: string | null; stop_reason: string | null }>(
      pool,
      `select f.*, c.title, s.name as store_name from featured_listings f join catalogs c on c.id = f.catalog_id join stores s on s.id = f.store_id
       order by (f.status = 'ACTIVE') desc, f.created_at desc limit 200`,
    ),
    all<{ store_id: string; store_name: string; store_slug: string; tier: string; commission_rate: number; current_period_end: string | null; used_featured_slots: number; free_featured_slots: number }>(
      pool,
      `select sub.*, s.name as store_name, s.slug as store_slug from store_subscriptions sub join stores s on s.id = sub.store_id
       order by (sub.tier <> 'FREE') desc, s.name`,
    ),
  ]);
  res.json({
    ads: ads.map((a) => ({
      id: a.id,
      catalog: { id: a.catalog_id, title: a.title },
      store: a.store_name,
      durationDays: a.duration_days,
      price: a.price,
      isFree: a.is_free,
      status: a.status,
      startsAt: a.starts_at,
      endsAt: a.ends_at,
      stopReason: a.stop_reason,
    })),
    subscriptions: subs.map((s) => ({
      storeId: s.store_id,
      store: { name: s.store_name, slug: s.store_slug },
      tier: s.tier,
      commissionRate: s.commission_rate,
      periodEnd: s.current_period_end,
      featuredSlots: `${s.used_featured_slots}/${s.free_featured_slots}`,
    })),
  });
});

adminTransactionsRouter.post('/admin/ads/:id/stop', async (req, res) => {
  const user = await admin(req, 'ads:manage');
  const id = parse(idParam, req.params.id);
  const { note } = parse(z.object({ note: reasonText }).strict(), req.body);
  await withTransaction(async (tx) => {
    const ad = await one<{ store_id: string }>(tx, `update featured_listings set status = 'STOPPED', stop_reason = $1 where id = $2 and status = 'ACTIVE' returning store_id`, [
      note,
      id,
    ]);
    if (!ad) throw notFound('Iklan aktif');
    await audit(tx, { actorId: user.id, action: 'ad.stop', targetType: 'featured_listing', targetId: id, detail: { note }, ip: ipOf(req) });
    await notifyStore(tx, ad.store_id, { title: 'Iklan dihentikan admin', body: note, link: '/store-dashboard/ads' });
  });
  res.json({ ok: true });
});
