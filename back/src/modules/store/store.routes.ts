// Store owner area (DFD 2.0, 3.0, 7.0). Everything is scoped to the caller's own store.
import { Router } from 'express';
import { z } from 'zod';
import {
  BANK_TAX,
  GATEWAY_METHODS,
  STORE_DEPOSIT,
  SUBSCRIPTION_PLANS,
  TRANSFER_FEE,
  WITHDRAW_FEE,
  type SubscriptionTier,
} from '../../config/money.js';
import { all, one, pool, run, withTransaction } from '../../db/pool.js';
import { badRequest, conflict, forbidden, notFound, parse } from '../../lib/errors.js';
import { documentNumber, uuid } from '../../lib/ids.js';
import { audit } from '../../lib/audit.js';
import { moveStoreBalance } from '../../lib/ledger.js';
import { matchName } from '../../lib/name-match.js';
import { requireUser } from '../../middlewares/auth.js';
import { checkoutLimiter, uploadLimiter, writeLimiter } from '../../middlewares/security.js';
import { evidenceUpload, imageUpload } from '../../middlewares/upload.js';
import * as catalogs from '../catalogs/catalogs.service.js';
import * as payments from '../payments/payments.service.js';
import { activeStore, findStoreOf, ownStore, toStoreContext } from './store.context.js';

export const storeRouter = Router();

const idParam = z.uuid('id tidak valid');
const files = (req: { files?: unknown }) => (Array.isArray(req.files) ? (req.files as { buffer: Buffer }[]) : []);

// ── Onboarding (DFD 2.0) ──

storeRouter.get('/stores/me', async (req, res) => {
  const user = requireUser(req);
  const store = await findStoreOf(pool, user.id);
  if (!store) {
    res.json({ store: null });
    return;
  }
  const [subscription, balance, pendingDeposit] = await Promise.all([
    one<{ tier: string; commission_rate: number; max_listings: number | null; free_featured_slots: number; used_featured_slots: number; current_period_end: string | null }>(
      pool,
      'select * from store_subscriptions where store_id = $1',
      [store.id],
    ),
    one<{ escrow: number; available: number; deposit: number }>(pool, 'select escrow, available, deposit from store_balances where store_id = $1', [store.id]),
    payments.findPendingFor(pool, 'STORE_DEPOSIT', store.id),
  ]);
  res.json({
    store: {
      ...toStoreContext(store),
      subscription: subscription && {
        tier: subscription.tier,
        commissionRate: subscription.commission_rate,
        maxListings: subscription.max_listings,
        freeFeaturedSlots: subscription.free_featured_slots,
        usedFeaturedSlots: subscription.used_featured_slots,
        periodEnd: subscription.current_period_end,
      },
      balance: balance ?? { escrow: 0, available: 0, deposit: 0 },
      depositMinimum: STORE_DEPOSIT,
      pendingDeposit: pendingDeposit ? { invoice: pendingDeposit.midtrans_order_id, redirectUrl: pendingDeposit.redirect_url } : null,
    },
  });
});

const slugify = (name: string) =>
  name
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50) || 'toko';

const openSchema = z
  .object({
    name: z.string().trim().min(3, 'minimal 3 karakter').max(100),
    type: z.enum(['OWNER', 'RESELLER']),
    ownerLegalName: z.string().trim().min(3, 'isi nama sesuai KTP').max(100),
    description: z.string().trim().max(1000).optional(),
    acceptRules: z.literal(true, 'Setujui aturan toko terlebih dahulu'),
  })
  .strict();

/** Store profile → PENDING_DEPOSIT. No KYC provider — an admin verifies later. */
storeRouter.post('/stores', writeLimiter, async (req, res) => {
  const user = requireUser(req);
  const input = parse(openSchema, req.body);
  if (user.role === 'ADMIN') throw forbidden('Akun admin tidak bisa membuka toko.');
  if (await findStoreOf(pool, user.id)) throw conflict('Kamu sudah punya toko.', 'STORE_EXISTS');
  const base = slugify(input.name);
  let slug = base.length >= 2 ? base : `toko-${base}`;
  for (let n = 2; await one(pool, 'select 1 from stores where slug = $1', [slug]); n += 1) slug = `${base}-${n}`;
  await run(
    pool,
    `insert into stores (owner_id, slug, name, type, owner_legal_name, description, deposit_amount)
     values ($1, $2, $3, $4, $5, $6, $7)`,
    [user.id, slug, input.name, input.type, input.ownerLegalName, input.description ?? null, STORE_DEPOSIT],
  );
  const store = await findStoreOf(pool, user.id);
  res.status(201).json({ store: toStoreContext(store!) });
});

/** Pay the Rp500.000 deposit via Midtrans (store → PENDING_REVIEW when PAID). */
storeRouter.post('/stores/me/deposit', checkoutLimiter, async (req, res) => {
  const { user, store } = await ownStore(req);
  const { method } = parse(z.object({ method: z.enum(GATEWAY_METHODS) }).strict(), req.body);
  if (store.status !== 'PENDING_DEPOSIT') throw conflict('Deposit sudah dibayar.', 'BAD_STATE');
  const pending = await payments.findPendingFor(pool, 'STORE_DEPOSIT', store.id);
  const invoice = pending?.midtrans_order_id ?? documentNumber('DP');
  if (!pending) {
    await payments.recordPayment(pool, { invoice, purpose: 'STORE_DEPOSIT', refId: store.id, userId: user.id, amount: store.deposit_amount, method });
  }
  res.json({ invoice, payment: await payments.openPaymentPage(invoice, { name: user.name, email: user.email }) });
});

const profileSchema = z
  .object({
    name: z.string().trim().min(3).max(100).optional(),
    description: z.string().trim().max(1000).optional(),
    gradient: z
      .string()
      .regex(/^from-[a-z]+-\d{3} to-[a-z]+-\d{3}$/, 'gradien tidak valid')
      .optional(),
  })
  .strict();

/** Profile & storefront settings. The legal name is fixed after verification (payout name check). */
storeRouter.patch('/stores/me', writeLimiter, async (req, res) => {
  const { store } = await ownStore(req);
  const input = parse(profileSchema, req.body);
  catalogs.assertNoContact(input.name, input.description);
  await run(pool, 'update stores set name = coalesce($1, name), description = coalesce($2, description), gradient = coalesce($3, gradient) where id = $4', [
    input.name ?? null,
    input.description ?? null,
    input.gradient ?? null,
    store.id,
  ]);
  res.json({ store: toStoreContext((await findStoreOf(pool, store.owner_id))!) });
});

// ── Dashboard & analytics ──

storeRouter.get('/stores/me/dashboard', async (req, res) => {
  const { store } = await ownStore(req);
  const [counts, orders, balance, revenue, pendingOffers, unreadChats] = await Promise.all([
    all<{ status: string; n: number }>(pool, 'select status, count(*)::int as n from catalogs where store_id = $1 group by status', [store.id]),
    all<{ status: string; n: number }>(pool, 'select status, count(*)::int as n from orders where store_id = $1 group by status', [store.id]),
    one<{ escrow: number; available: number; deposit: number }>(pool, 'select escrow, available, deposit from store_balances where store_id = $1', [store.id]),
    one<{ gmv: number; net: number; n: number }>(
      pool,
      `select coalesce(sum(item_price), 0)::int as gmv, coalesce(sum(store_receives), 0)::int as net, count(*)::int as n
       from orders where store_id = $1 and status = 'COMPLETED' and completed_at > now() - interval '30 days'`,
      [store.id],
    ),
    one<{ n: number }>(pool, `select count(*)::int as n from offers where store_id = $1 and status = 'PENDING' and expires_at > now()`, [store.id]),
    one<{ n: number }>(pool, 'select coalesce(sum(store_unread), 0)::int as n from conversations where store_id = $1', [store.id]),
  ]);
  res.json({
    catalogs: Object.fromEntries(counts.map((c) => [c.status, c.n])),
    orders: Object.fromEntries(orders.map((o) => [o.status, o.n])),
    balance: balance ?? { escrow: 0, available: 0 },
    last30Days: revenue,
    pendingOffers: pendingOffers?.n ?? 0,
    unreadChats: unreadChats?.n ?? 0,
  });
});

storeRouter.get('/stores/me/analytics', async (req, res) => {
  const { store } = await ownStore(req);
  const [daily, topViewed, byGame, conversion] = await Promise.all([
    all<{ day: string; orders: number; gmv: number }>(
      pool,
      `select to_char(d, 'YYYY-MM-DD') as day, count(o.id)::int as orders, coalesce(sum(o.item_price), 0)::int as gmv
       from generate_series(current_date - 29, current_date, interval '1 day') d
       left join orders o on o.store_id = $1 and o.status = 'COMPLETED' and o.completed_at::date = d::date
       group by d order by d`,
      [store.id],
    ),
    all<{ id: string; title: string; vs_code: string | null; views: number; status: string; price: number }>(
      pool,
      'select id, title, vs_code, views, status, price from catalogs where store_id = $1 order by views desc limit 10',
      [store.id],
    ),
    all<{ game: string; sold: number; gmv: number }>(
      pool,
      `select g.name as game, count(*)::int as sold, coalesce(sum(oi.price), 0)::int as gmv
       from order_items oi join orders o on o.id = oi.order_id join catalogs c on c.id = oi.catalog_id join games g on g.id = c.game_id
       where o.store_id = $1 and o.status = 'COMPLETED' group by g.name order by gmv desc`,
      [store.id],
    ),
    one<{ views: number; orders: number; wishlists: number }>(
      pool,
      `select (select coalesce(sum(views), 0)::int from catalogs where store_id = $1) as views,
              (select count(*)::int from orders where store_id = $1 and status not in ('CANCELLED', 'PENDING_PAYMENT')) as orders,
              (select count(*)::int from wishlists w join catalogs c on c.id = w.catalog_id where c.store_id = $1) as wishlists`,
      [store.id],
    ),
  ]);
  // Analytics per plan (MONEY_RULES §5): Free funnel · Pro + daily & most viewed · Business + per game.
  const tier = (await one<{ tier: string }>(pool, 'select tier from store_subscriptions where store_id = $1', [store.id]))?.tier ?? 'FREE';
  res.json({
    tier,
    funnel: conversion ?? { views: 0, orders: 0, wishlists: 0 },
    daily: tier === 'FREE' ? null : daily,
    topViewed: tier === 'FREE' ? null : topViewed.map((c) => ({ id: c.id, title: c.title, vsCode: c.vs_code, views: c.views, status: c.status, price: c.price })),
    byGame: tier === 'BUSINESS' ? byGame : null,
  });
});

// ── Catalogs (DFD 3.0) ──

storeRouter.get('/stores/me/catalogs', async (req, res) => {
  const { store } = await ownStore(req);
  const status = parse(
    z.enum(['DRAFT', 'PENDING_REVIEW', 'REJECTED', 'LISTED', 'LOCKED', 'IN_ORDER', 'SOLD', 'DELISTED']).optional(),
    req.query.status,
  );
  res.json({ catalogs: await catalogs.listStoreCatalogs(store, status) });
});

const catalogFields = {
  gameSlug: z.string().regex(/^[a-z0-9-]{1,50}$/),
  title: z.string().trim().min(5, 'minimal 5 karakter').max(200),
  description: z.string().trim().max(5000).optional(),
  price: z.number().int().min(10_000, 'minimal Rp10.000').max(1_000_000_000),
  oldPrice: z.number().int().positive().max(1_000_000_000).nullable().optional(),
  instant: z.boolean().optional(),
  attributes: z.record(z.string(), z.unknown()).optional(),
};

storeRouter.post('/stores/me/catalogs', writeLimiter, async (req, res) => {
  const { store } = await ownStore(req);
  res.status(201).json(await catalogs.createCatalog(store, parse(z.object(catalogFields).strict(), req.body)));
});

storeRouter.get('/stores/me/catalogs/:id', async (req, res) => {
  const { store } = await ownStore(req);
  const id = parse(idParam, req.params.id);
  if (!(await one(pool, 'select 1 from catalogs where id = $1 and store_id = $2', [id, store.id]))) throw notFound('Katalog');
  res.json(await catalogs.catalogDetail(id));
});

storeRouter.patch('/stores/me/catalogs/:id', writeLimiter, async (req, res) => {
  const { user, store } = await ownStore(req);
  const input = parse(z.object(catalogFields).partial().strict(), req.body);
  res.json(await catalogs.updateCatalog(user, store, parse(idParam, req.params.id), input));
});

storeRouter.delete('/stores/me/catalogs/:id', writeLimiter, async (req, res) => {
  const { store } = await ownStore(req);
  await catalogs.deleteDraft(store, parse(idParam, req.params.id));
  res.json({ ok: true });
});

storeRouter.post('/stores/me/catalogs/:id/images', uploadLimiter, imageUpload.array('images', catalogs.MAX_IMAGES), async (req, res) => {
  const { user, store } = await ownStore(req);
  res.json(await catalogs.addImages(user, store, parse(idParam, req.params.id), files(req)));
});

storeRouter.delete('/stores/me/catalogs/:id/images/:imageId', writeLimiter, async (req, res) => {
  const { user, store } = await ownStore(req);
  res.json(await catalogs.removeImage(user, store, parse(idParam, req.params.id), parse(idParam, req.params.imageId)));
});

storeRouter.post('/stores/me/catalogs/:id/submit', writeLimiter, async (req, res) => {
  const { user, store } = await ownStore(req);
  res.json(await catalogs.submitCatalog(user, store, parse(idParam, req.params.id)));
});

const bulkSchema = z.object({ action: z.enum(['submit', 'withdraw']), ids: z.array(idParam).min(1).max(50) }).strict();

/** Bulk actions for Pro / Business plans (MONEY_RULES §5): submit or hide many catalogs at once. */
storeRouter.post('/stores/me/catalogs/bulk', writeLimiter, async (req, res) => {
  const { user, store } = await ownStore(req);
  const { action, ids } = parse(bulkSchema, req.body);
  const tier = (await one<{ tier: string }>(pool, 'select tier from store_subscriptions where store_id = $1', [store.id]))?.tier ?? 'FREE';
  if (tier === 'FREE') throw forbidden('Aksi massal tersedia untuk paket Pro dan Business.');
  const results: { id: string; ok: boolean; message?: string }[] = [];
  for (const id of [...new Set(ids)]) {
    try {
      if (action === 'submit') await catalogs.submitCatalog(user, store, id);
      else await catalogs.withdrawCatalog(store, id);
      results.push({ id, ok: true });
    } catch (error) {
      results.push({ id, ok: false, message: error instanceof Error ? error.message : 'Gagal' });
    }
  }
  res.json({ results, done: results.filter((r) => r.ok).length });
});

storeRouter.post('/stores/me/catalogs/:id/withdraw', writeLimiter, async (req, res) => {
  const { store } = await ownStore(req);
  res.json(await catalogs.withdrawCatalog(store, parse(idParam, req.params.id)));
});

const checklistSchema = z
  .object({
    login_success: z.boolean(),
    no_restriction: z.boolean(),
    inventory_matches: z.boolean(),
    rank_matches: z.boolean(),
    twofa_active: z.boolean(),
  })
  .strict();

/** multipart: `checklist` (JSON string), `notes`, `media` files (private bucket). */
storeRouter.post('/stores/me/catalogs/:id/inspection', uploadLimiter, evidenceUpload.array('media', 5), async (req, res) => {
  const { user, store } = await ownStore(req);
  const body = req.body as { checklist?: string; notes?: string };
  let checklist: unknown;
  try {
    checklist = JSON.parse(body.checklist ?? '{}');
  } catch {
    throw badRequest('Checklist tidak valid.');
  }
  const notes = parse(z.string().trim().max(2000).optional(), body.notes || undefined);
  res.json(await catalogs.saveInspection(user, store, parse(idParam, req.params.id), { checklist: parse(checklistSchema, checklist), notes }, files(req)));
});

// ── Deposit & closure (MONEY_RULES §12, DFD 2.6) ──

/** Pay back a deposit shortfall (after fines) so the Deposit Secured badge returns. */
storeRouter.post('/stores/me/deposit-topup', checkoutLimiter, async (req, res) => {
  const { user, store } = await activeStore(req);
  const { method } = parse(z.object({ method: z.enum(GATEWAY_METHODS) }).strict(), req.body);
  const bal = await one<{ deposit: number }>(pool, 'select deposit from store_balances where store_id = $1', [store.id]);
  const shortfall = STORE_DEPOSIT - (bal?.deposit ?? 0);
  if (shortfall <= 0) throw conflict('Deposit sudah lengkap.', 'DEPOSIT_FULL');
  const invoice = documentNumber('DP');
  await payments.recordPayment(pool, { invoice, purpose: 'STORE_DEPOSIT', refId: store.id, userId: user.id, amount: shortfall, method, meta: { topUp: true } });
  res.json({ invoice, payment: await payments.openPaymentPage(invoice, { name: user.name, email: user.email }) });
});

/**
 * Request closure: nothing may be pending (orders, protection windows, disputes,
 * payouts) and the balance must be withdrawn. Catalogs are hidden; an admin
 * then approves (deposit refunded) or rejects.
 */
storeRouter.post('/stores/me/close', writeLimiter, async (req, res) => {
  const { user, store } = await ownStore(req);
  if (store.status !== 'ACTIVE') throw conflict('Hanya toko aktif yang bisa mengajukan penutupan.', 'BAD_STATE');
  const { reason } = parse(z.object({ reason: z.string().trim().min(3).max(500) }).strict(), req.body);
  await withTransaction(async (tx) => {
    await one(tx, 'select 1 from stores where id = $1 for update', [store.id]);
    const b =
      (await one<Record<string, number>>(
        tx,
        `select
           (select count(*)::int from orders where store_id = $1 and status in ('PENDING_PAYMENT', 'PAID', 'IN_REKBER', 'SAFE', 'DISPUTED')) as active_orders,
           (select count(*)::int from orders where store_id = $1 and status = 'COMPLETED' and protection_until > now()) as protected_orders,
           (select count(*)::int from disputes d join orders o on o.id = d.order_id
             where o.store_id = $1 and d.status in ('OPEN', 'STORE_RESPONDED', 'IN_REVIEW')) as open_disputes,
           (select count(*)::int from withdrawals where store_id = $1 and status = 'PENDING')
             + (select count(*)::int from transfer_requests where store_id = $1 and status = 'PENDING') as pending_payouts,
           (select coalesce(escrow + available, 0) from store_balances where store_id = $1) as balance`,
        [store.id],
      )) ?? {};
    const reasons = [
      b.active_orders ? `${b.active_orders} pesanan belum selesai` : null,
      b.protected_orders ? `${b.protected_orders} pesanan masih dalam masa proteksi` : null,
      b.open_disputes ? `${b.open_disputes} sengketa terbuka` : null,
      b.pending_payouts ? `${b.pending_payouts} penarikan/transfer menunggu` : null,
      b.balance ? 'saldo toko belum ditarik' : null,
    ].filter(Boolean);
    if (reasons.length) throw conflict(`Belum bisa ditutup: ${reasons.join(', ')}.`, 'CLOSE_BLOCKED');
    await run(tx, `update stores set status = 'CLOSING', review_note = $1 where id = $2`, [`Permintaan tutup: ${reason}`, store.id]);
    await run(tx, `update catalogs set status = 'DELISTED', review_note = 'Toko mengajukan penutupan.' where store_id = $1 and status = 'LISTED'`, [store.id]);
    await run(tx, `update catalogs set status = 'DRAFT' where store_id = $1 and status = 'PENDING_REVIEW'`, [store.id]);
    await run(tx, `update featured_listings set status = 'STOPPED', stop_reason = 'Toko ditutup' where store_id = $1 and status = 'ACTIVE'`, [store.id]);
    await run(tx, 'update store_vouchers set is_active = false where store_id = $1', [store.id]);
    await run(tx, `update bundles set status = 'INACTIVE' where store_id = $1 and status = 'ACTIVE'`, [store.id]);
    await audit(tx, { actorId: user.id, action: 'store.close_request', targetType: 'store', targetId: store.id, detail: { reason }, ip: req.ip ?? null });
  });
  res.json({ store: toStoreContext((await findStoreOf(pool, store.owner_id))!) });
});

// ── Balance & withdrawals (DFD 7.0) ──

storeRouter.get('/stores/me/balance', async (req, res) => {
  const { store } = await ownStore(req);
  const summary = await one<{ escrow: number; available: number; deposit: number }>(pool, 'select escrow, available, deposit from store_balances where store_id = $1', [store.id]);
  const ledger = await all<{ id: number; bucket: string; type: string; amount: number; balance_after: number; ref_type: string; ref_id: string | null; note: string | null; created_at: string }>(
    pool,
    'select * from store_ledger where store_id = $1 order by id desc limit 200',
    [store.id],
  );
  res.json({
    escrow: summary?.escrow ?? 0,
    available: summary?.available ?? 0,
    deposit: summary?.deposit ?? 0,
    ledger: ledger.map((l) => ({
      id: String(l.id),
      bucket: l.bucket,
      type: l.type,
      amount: l.amount,
      balanceAfter: l.balance_after,
      refType: l.ref_type,
      refId: l.ref_id,
      note: l.note,
      createdAt: l.created_at,
    })),
  });
});

export interface WithdrawalRow {
  id: string;
  withdrawal_number: string;
  amount: number;
  fee: number;
  bank_name: string;
  account_number: string;
  account_name: string;
  name_match: 'MATCH' | 'REVIEW' | 'MISMATCH';
  status: 'PENDING' | 'COMPLETED' | 'REJECTED';
  review_note: string | null;
  created_at: string;
}

export const toWithdrawal = (w: WithdrawalRow) => ({
  id: w.withdrawal_number,
  uuid: w.id,
  amount: w.amount,
  fee: w.fee,
  bank: `${w.bank_name} •• ${w.account_number.slice(-4)}`,
  accountName: w.account_name,
  nameMatch: w.name_match,
  status: w.status,
  reviewNote: w.review_note,
  date: w.created_at,
});

storeRouter.get('/stores/me/withdrawals', async (req, res) => {
  const { store } = await ownStore(req);
  const rows = await all<WithdrawalRow>(pool, 'select * from withdrawals where store_id = $1 order by created_at desc limit 100', [store.id]);
  res.json({ withdrawals: rows.map(toWithdrawal) });
});

const withdrawSchema = z
  .object({
    amount: z.number().int().positive().max(1_000_000_000),
    bankName: z.string().trim().min(2).max(50),
    accountNumber: z.string().trim().regex(/^\d{6,20}$/, 'nomor rekening 6 sampai 20 digit'),
    accountName: z.string().trim().min(3).max(100),
  })
  .strict();

/** Debit now (WITHDRAW + WITHDRAW_FEE); an admin completes or rejects (reversal) it. Iris is simulated. */
storeRouter.post('/stores/me/withdrawals', checkoutLimiter, async (req, res) => {
  const { store } = await activeStore(req);
  const input = parse(withdrawSchema, req.body);
  const fee = WITHDRAW_FEE + BANK_TAX;
  if (input.amount <= fee) throw badRequest(`Minimal penarikan lebih dari Rp${fee.toLocaleString('id-ID')} (biaya).`);
  const nameMatch = matchName(input.accountName, store.owner_legal_name);
  if (nameMatch === 'MISMATCH') throw badRequest('Nama pemilik rekening tidak cocok dengan nama pemilik toko yang terverifikasi.', 'NAME_MISMATCH');
  const id = uuid();
  await withTransaction(async (tx) => {
    await run(
      tx,
      `insert into withdrawals (id, withdrawal_number, store_id, amount, fee, bank_name, account_number, account_name, name_match)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [id, documentNumber('WD'), store.id, input.amount, fee, input.bankName, input.accountNumber, input.accountName, nameMatch],
    );
    await moveStoreBalance(tx, store.id, [
      { bucket: 'AVAILABLE', type: 'WITHDRAW', amount: -(input.amount - fee), refType: 'withdrawal', refId: id },
      { bucket: 'AVAILABLE', type: 'WITHDRAW_FEE', amount: -fee, refType: 'withdrawal', refId: id },
    ]);
  });
  const row = await one<WithdrawalRow>(pool, 'select * from withdrawals where id = $1', [id]);
  res.status(201).json({ withdrawal: toWithdrawal(row!) });
});

// ── Subscription (MONEY_RULES §5) ──

storeRouter.get('/stores/me/subscription', async (req, res) => {
  const { store } = await ownStore(req);
  const current = await one<{ tier: string; current_period_end: string | null; used_featured_slots: number; free_featured_slots: number }>(
    pool,
    'select tier, current_period_end, used_featured_slots, free_featured_slots from store_subscriptions where store_id = $1',
    [store.id],
  );
  const history = await all<{ midtrans_order_id: string; amount: number; status: string; meta: { tier?: string }; created_at: string }>(
    pool,
    `select midtrans_order_id, amount, status, meta, created_at from payments where purpose = 'SUBSCRIPTION' and ref_id = $1 order by created_at desc limit 20`,
    [store.id],
  );
  res.json({
    current,
    plans: Object.entries(SUBSCRIPTION_PLANS).map(([tier, p]) => ({ tier, ...p })),
    history: history.map((h) => ({ invoice: h.midtrans_order_id, amount: h.amount, status: h.status, tier: h.meta.tier ?? '-', date: h.created_at })),
  });
});

storeRouter.post('/stores/me/subscription', checkoutLimiter, async (req, res) => {
  const { user, store } = await activeStore(req);
  const { tier, method } = parse(z.object({ tier: z.enum(['PRO', 'BUSINESS']), method: z.enum(GATEWAY_METHODS) }).strict(), req.body);
  const plan = SUBSCRIPTION_PLANS[tier as SubscriptionTier];
  const invoice = documentNumber('SB');
  await payments.recordPayment(pool, { invoice, purpose: 'SUBSCRIPTION', refId: store.id, userId: user.id, amount: plan.price, method, meta: { tier } });
  res.json({ invoice, payment: await payments.openPaymentPage(invoice, { name: user.name, email: user.email }) });
});

// ── External sellers & transfer requests (reseller stores, MONEY_RULES §10–11) ──

async function resellerStore(req: Parameters<typeof activeStore>[0]) {
  const ctx = await ownStore(req);
  if (ctx.store.type !== 'RESELLER') throw forbidden('Fitur penjual eksternal khusus toko Reseller.');
  return ctx;
}

const sellerSchema = z
  .object({
    alias: z.string().trim().min(2).max(60),
    payoutBank: z.string().trim().min(2).max(50),
    payoutAccount: z.string().trim().regex(/^\d{6,20}$/, 'nomor rekening 6 sampai 20 digit'),
    payoutName: z.string().trim().min(3).max(100),
    note: z.string().trim().max(500).optional(),
  })
  .strict();

interface SellerRow {
  id: string;
  alias: string;
  payout_bank: string;
  payout_account: string;
  payout_name: string;
  note: string | null;
  created_at: string;
  transfers: number;
  paid_total: number;
}

const toSeller = (s: SellerRow) => ({
  id: s.id,
  alias: s.alias,
  payoutBank: s.payout_bank,
  payoutAccount: `•• ${s.payout_account.slice(-4)}`,
  payoutName: s.payout_name,
  note: s.note,
  createdAt: s.created_at,
  transfers: s.transfers,
  paidTotal: s.paid_total,
});

const SELLER_SELECT = `select e.*,
    (select count(*)::int from transfer_requests t where t.external_seller_id = e.id) as transfers,
    (select coalesce(sum(t.amount - t.fee), 0)::int from transfer_requests t where t.external_seller_id = e.id and t.status = 'COMPLETED') as paid_total
  from external_sellers e`;

storeRouter.get('/stores/me/external-sellers', async (req, res) => {
  const { store } = await resellerStore(req);
  res.json({ sellers: (await all<SellerRow>(pool, `${SELLER_SELECT} where e.store_id = $1 order by e.created_at desc`, [store.id])).map(toSeller) });
});

storeRouter.post('/stores/me/external-sellers', writeLimiter, async (req, res) => {
  const { store } = await resellerStore(req);
  const s = parse(sellerSchema, req.body);
  const row = await one<{ id: string }>(
    pool,
    `insert into external_sellers (store_id, alias, payout_bank, payout_account, payout_name, note) values ($1, $2, $3, $4, $5, $6) returning id`,
    [store.id, s.alias, s.payoutBank, s.payoutAccount, s.payoutName, s.note ?? null],
  );
  const seller = await one<SellerRow>(pool, `${SELLER_SELECT} where e.id = $1`, [row!.id]);
  res.status(201).json({ seller: toSeller(seller!) });
});

storeRouter.get('/stores/me/external-sellers/:id', async (req, res) => {
  const { store } = await resellerStore(req);
  const seller = await one<SellerRow>(pool, `${SELLER_SELECT} where e.id = $1 and e.store_id = $2`, [parse(idParam, req.params.id), store.id]);
  if (!seller) throw notFound('Penjual eksternal');
  const transfers = await all<TransferRow>(pool, `${TRANSFER_SELECT} where t.external_seller_id = $1 order by t.created_at desc`, [seller.id]);
  res.json({ seller: toSeller(seller), transfers: transfers.map(toTransfer) });
});

storeRouter.delete('/stores/me/external-sellers/:id', writeLimiter, async (req, res) => {
  const { store } = await resellerStore(req);
  const id = parse(idParam, req.params.id);
  if (await one(pool, 'select 1 from transfer_requests where external_seller_id = $1', [id])) {
    throw conflict('Penjual eksternal yang sudah punya riwayat transfer tidak bisa dihapus.');
  }
  if ((await run(pool, 'delete from external_sellers where id = $1 and store_id = $2', [id, store.id])) === 0) throw notFound('Penjual eksternal');
  res.json({ ok: true });
});

export interface TransferRow {
  id: string;
  transfer_number: string;
  amount: number;
  fee: number;
  name_match: string;
  status: string;
  review_note: string | null;
  created_at: string;
  order_id: string;
  order_number: string;
  seller_alias: string;
  payout_bank: string;
  payout_account: string;
  payout_name: string;
  store_name: string;
  store_slug: string;
}

export const TRANSFER_SELECT = `select t.*, o.order_number, e.alias as seller_alias, e.payout_bank, e.payout_account, e.payout_name,
    s.name as store_name, s.slug as store_slug
  from transfer_requests t join orders o on o.id = t.order_id join external_sellers e on e.id = t.external_seller_id
  join stores s on s.id = t.store_id`;

export const toTransfer = (t: TransferRow) => ({
  id: t.transfer_number,
  uuid: t.id,
  amount: t.amount,
  fee: t.fee,
  nameMatch: t.name_match,
  status: t.status,
  reviewNote: t.review_note,
  date: t.created_at,
  order: { id: t.order_id, number: t.order_number },
  seller: { alias: t.seller_alias, bank: `${t.payout_bank} •• ${t.payout_account.slice(-4)}`, name: t.payout_name },
  store: { name: t.store_name, slug: t.store_slug },
});

storeRouter.get('/stores/me/transfers', async (req, res) => {
  const { store } = await resellerStore(req);
  const [transfers, eligible] = await Promise.all([
    all<TransferRow>(pool, `${TRANSFER_SELECT} where t.store_id = $1 order by t.created_at desc limit 100`, [store.id]),
    all<{ id: string; order_number: string; store_receives: number; completed_at: string }>(
      pool,
      `select o.id, o.order_number, o.store_receives, o.completed_at from orders o
       where o.store_id = $1 and o.status = 'COMPLETED'
         and not exists (select 1 from transfer_requests t where t.order_id = o.id and t.status <> 'REJECTED')
       order by o.completed_at desc limit 100`,
      [store.id],
    ),
  ]);
  res.json({
    transfers: transfers.map(toTransfer),
    eligibleOrders: eligible.map((o) => ({ id: o.id, number: o.order_number, storeReceives: o.store_receives, completedAt: o.completed_at })),
  });
});

const transferSchema = z
  .object({ externalSellerId: z.uuid(), orderId: z.uuid(), amount: z.number().int().positive().max(1_000_000_000) })
  .strict();

/** Store pays its external seller from its OWN available balance, one transfer per completed order. */
storeRouter.post('/stores/me/transfers', checkoutLimiter, async (req, res) => {
  const { store } = await resellerStore(req);
  if (store.status !== 'ACTIVE') throw forbidden('Toko belum aktif.');
  const input = parse(transferSchema, req.body);
  const seller = await one<{ id: string; alias: string; payout_name: string }>(
    pool,
    'select id, alias, payout_name from external_sellers where id = $1 and store_id = $2',
    [input.externalSellerId, store.id],
  );
  if (!seller) throw notFound('Penjual eksternal');
  if (input.amount <= TRANSFER_FEE) throw badRequest(`Jumlah transfer harus lebih dari biaya Rp${TRANSFER_FEE.toLocaleString('id-ID')}.`);
  const id = uuid();
  await withTransaction(async (tx) => {
    const order = await one<{ store_receives: number }>(
      tx,
      `select store_receives from orders where id = $1 and store_id = $2 and status = 'COMPLETED' for update`,
      [input.orderId, store.id],
    );
    if (!order) throw badRequest('Pesanan belum selesai atau bukan milik toko ini.');
    if (input.amount > order.store_receives) throw badRequest('Jumlah transfer melebihi bagian toko dari pesanan ini.');
    // Old rejected request for this order is replaced (order_id is unique).
    await run(tx, `delete from transfer_requests where order_id = $1 and status = 'REJECTED'`, [input.orderId]);
    // Iris account validation is simulated: the holder name is checked against the seller's registered name.
    const nameMatch = matchName(seller.payout_name, seller.alias) === 'MATCH' ? 'MATCH' : 'REVIEW';
    await run(
      tx,
      `insert into transfer_requests (id, transfer_number, store_id, external_seller_id, order_id, amount, fee, name_match)
       values ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [id, documentNumber('TR'), store.id, seller.id, input.orderId, input.amount, TRANSFER_FEE, nameMatch],
    );
    await moveStoreBalance(tx, store.id, [
      { bucket: 'AVAILABLE', type: 'TRANSFER', amount: -(input.amount - TRANSFER_FEE), refType: 'transfer', refId: id },
      { bucket: 'AVAILABLE', type: 'TRANSFER_FEE', amount: -TRANSFER_FEE, refType: 'transfer', refId: id },
    ]);
  });
  const row = await one<TransferRow>(pool, `${TRANSFER_SELECT} where t.id = $1`, [id]);
  res.status(201).json({ transfer: toTransfer(row!) });
});

// ── Ratings (reply) ──

storeRouter.get('/stores/me/ratings', async (req, res) => {
  const { store } = await ownStore(req);
  const rows = await all<{ id: string; order_number: string; overall: number; desc_accuracy: number; attitude: number; delivery_speed: number; comment: string | null; store_reply: string | null; created_at: string; buyer_name: string }>(
    pool,
    `select r.*, o.order_number, p.name as buyer_name from ratings r join orders o on o.id = r.order_id join profiles p on p.id = r.buyer_id
     where r.store_id = $1 order by r.created_at desc limit 200`,
    [store.id],
  );
  res.json({
    summary: toStoreContext(store),
    ratings: rows.map((r) => ({
      id: r.id,
      orderNumber: r.order_number,
      buyer: r.buyer_name,
      overall: r.overall,
      descAccuracy: r.desc_accuracy,
      attitude: r.attitude,
      deliverySpeed: r.delivery_speed,
      comment: r.comment,
      reply: r.store_reply,
      date: r.created_at,
    })),
  });
});

storeRouter.post('/stores/me/ratings/:id/reply', writeLimiter, async (req, res) => {
  const { store } = await ownStore(req);
  const { reply } = parse(z.object({ reply: z.string().trim().min(2).max(1000) }).strict(), req.body);
  catalogs.assertNoContact(reply);
  const changed = await run(pool, 'update ratings set store_reply = $1, replied_at = now() where id = $2 and store_id = $3 and store_reply is null', [
    reply,
    parse(idParam, req.params.id),
    store.id,
  ]);
  if (changed === 0) throw conflict('Ulasan tidak ditemukan atau sudah dibalas.');
  res.json({ ok: true });
});
