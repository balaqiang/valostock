// Store promotions (MONEY_RULES §7, STORE_RULES engagement): vouchers, flash
// sales, bundles and featured-listing ads. All scoped to the caller's store.
import { Router } from 'express';
import { z } from 'zod';
import { FEATURED_PRICES, FREE_FIRST_WEEK_DAYS, GATEWAY_METHODS } from '../../config/money.js';
import { all, one, pool, run, withTransaction } from '../../db/pool.js';
import { badRequest, conflict, notFound, parse } from '../../lib/errors.js';
import { documentNumber } from '../../lib/ids.js';
import { checkoutLimiter, writeLimiter } from '../../middlewares/security.js';
import * as payments from '../payments/payments.service.js';
import { activeStore, ownStore } from './store.context.js';

export const promotionsRouter = Router();

const idParam = z.uuid('id tidak valid');
const isoDate = z.iso.datetime({ offset: true, message: 'tanggal tidak valid' });

async function ownListedCatalog(storeId: string, catalogId: string) {
  const c = await one<{ id: string; price: number; status: string; title: string }>(
    pool,
    'select id, price, status, title from catalogs where id = $1 and store_id = $2',
    [catalogId, storeId],
  );
  if (!c) throw notFound('Katalog');
  if (c.status !== 'LISTED') throw conflict('Hanya katalog yang sedang tayang (LISTED) yang bisa dipromosikan.', 'NOT_LISTED');
  return c;
}

// ── Vouchers ──

interface VoucherRow {
  id: string;
  code: string;
  kind: 'PERCENT' | 'FIXED';
  value: number;
  min_spend: number;
  quota: number | null;
  used: number;
  starts_at: string;
  expires_at: string | null;
  is_active: boolean;
  created_at: string;
}

const toVoucher = (v: VoucherRow) => ({
  id: v.id,
  code: v.code,
  kind: v.kind,
  value: v.value,
  minSpend: v.min_spend,
  quota: v.quota,
  used: v.used,
  startsAt: v.starts_at,
  expiresAt: v.expires_at,
  isActive: v.is_active,
  createdAt: v.created_at,
});

promotionsRouter.get('/stores/me/vouchers', async (req, res) => {
  const { store } = await ownStore(req);
  res.json({ vouchers: (await all<VoucherRow>(pool, 'select * from store_vouchers where store_id = $1 order by created_at desc', [store.id])).map(toVoucher) });
});

const voucherSchema = z
  .object({
    code: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z0-9]{3,30}$/, 'kode 3 sampai 30 huruf/angka'),
    kind: z.enum(['PERCENT', 'FIXED']),
    value: z.number().int().positive().max(10_000_000),
    minSpend: z.number().int().min(0).max(1_000_000_000).default(0),
    quota: z.number().int().positive().max(100_000).nullable().optional(),
    startsAt: isoDate.optional(),
    expiresAt: isoDate.nullable().optional(),
  })
  .strict()
  .refine((v) => v.kind !== 'PERCENT' || v.value <= 90, { message: 'diskon persen maksimal 90%', path: ['value'] });

promotionsRouter.post('/stores/me/vouchers', writeLimiter, async (req, res) => {
  const { store } = await activeStore(req);
  const v = parse(voucherSchema, req.body);
  if (v.expiresAt && new Date(v.expiresAt) <= new Date(v.startsAt ?? Date.now())) throw badRequest('Tanggal berakhir harus setelah tanggal mulai.');
  const row = await one<VoucherRow>(
    pool,
    `insert into store_vouchers (store_id, code, kind, value, min_spend, quota, starts_at, expires_at)
     values ($1, $2, $3, $4, $5, $6, coalesce($7::timestamptz, now()), $8) returning *`,
    [store.id, v.code, v.kind, v.value, v.minSpend, v.quota ?? null, v.startsAt ?? null, v.expiresAt ?? null],
  );
  res.status(201).json({ voucher: toVoucher(row!) });
});

promotionsRouter.patch('/stores/me/vouchers/:id', writeLimiter, async (req, res) => {
  const { store } = await ownStore(req);
  const { isActive } = parse(z.object({ isActive: z.boolean() }).strict(), req.body);
  const row = await one<VoucherRow>(pool, 'update store_vouchers set is_active = $1 where id = $2 and store_id = $3 returning *', [
    isActive,
    parse(idParam, req.params.id),
    store.id,
  ]);
  if (!row) throw notFound('Voucher');
  res.json({ voucher: toVoucher(row) });
});

promotionsRouter.delete('/stores/me/vouchers/:id', writeLimiter, async (req, res) => {
  const { store } = await ownStore(req);
  const id = parse(idParam, req.params.id);
  if (await one(pool, 'select 1 from voucher_redemptions where voucher_id = $1', [id])) {
    throw conflict('Voucher yang sudah dipakai tidak bisa dihapus, nonaktifkan saja.');
  }
  if ((await run(pool, 'delete from store_vouchers where id = $1 and store_id = $2', [id, store.id])) === 0) throw notFound('Voucher');
  res.json({ ok: true });
});

// ── Flash sales ──

promotionsRouter.get('/stores/me/flash-sales', async (req, res) => {
  const { store } = await ownStore(req);
  const rows = await all<{ id: string; catalog_id: string; title: string; vs_code: string | null; price: number; sale_price: number; starts_at: string; ends_at: string }>(
    pool,
    `select f.id, f.catalog_id, c.title, c.vs_code, c.price, f.sale_price, f.starts_at, f.ends_at
     from flash_sales f join catalogs c on c.id = f.catalog_id where f.store_id = $1 order by f.starts_at desc`,
    [store.id],
  );
  const now = Date.now();
  res.json({
    flashSales: rows.map((f) => ({
      id: f.id,
      catalog: { id: f.catalog_id, title: f.title, vsCode: f.vs_code, price: f.price },
      salePrice: f.sale_price,
      startsAt: f.starts_at,
      endsAt: f.ends_at,
      state: new Date(f.ends_at).getTime() < now ? 'ENDED' : new Date(f.starts_at).getTime() > now ? 'SCHEDULED' : 'RUNNING',
    })),
  });
});

const flashSchema = z.object({ catalogId: z.uuid(), salePrice: z.number().int().min(10_000), startsAt: isoDate, endsAt: isoDate }).strict();

promotionsRouter.post('/stores/me/flash-sales', writeLimiter, async (req, res) => {
  const { store } = await activeStore(req);
  const f = parse(flashSchema, req.body);
  const catalog = await ownListedCatalog(store.id, f.catalogId);
  const start = new Date(f.startsAt);
  const end = new Date(f.endsAt);
  if (end <= start || end.getTime() < Date.now()) throw badRequest('Waktu flash sale tidak valid.');
  if (end.getTime() - start.getTime() > 7 * 24 * 3600 * 1000) throw badRequest('Flash sale maksimal 7 hari.');
  if (f.salePrice >= catalog.price) throw badRequest('Harga flash sale harus lebih rendah dari harga normal.');
  const overlap = await one(pool, 'select 1 from flash_sales where catalog_id = $1 and starts_at < $3 and ends_at > $2', [catalog.id, f.startsAt, f.endsAt]);
  if (overlap) throw conflict('Sudah ada flash sale di rentang waktu itu untuk katalog ini.');
  await run(pool, 'insert into flash_sales (store_id, catalog_id, sale_price, starts_at, ends_at) values ($1, $2, $3, $4, $5)', [
    store.id,
    catalog.id,
    f.salePrice,
    f.startsAt,
    f.endsAt,
  ]);
  res.status(201).json({ ok: true });
});

/** Ends a running flash sale now, or removes a scheduled one. */
promotionsRouter.delete('/stores/me/flash-sales/:id', writeLimiter, async (req, res) => {
  const { store } = await ownStore(req);
  const id = parse(idParam, req.params.id);
  const removed = await run(pool, 'delete from flash_sales where id = $1 and store_id = $2 and starts_at > now()', [id, store.id]);
  if (removed === 0) {
    const ended = await run(pool, 'update flash_sales set ends_at = now() where id = $1 and store_id = $2 and ends_at > now()', [id, store.id]);
    if (ended === 0) throw notFound('Flash sale aktif');
  }
  res.json({ ok: true });
});

// ── Bundles ──

promotionsRouter.get('/stores/me/bundles', async (req, res) => {
  const { store } = await ownStore(req);
  const rows = await all<{ id: string; title: string; bundle_price: number; status: string; created_at: string; items: { id: string; title: string; price: number; status: string }[] }>(
    pool,
    `select b.id, b.title, b.bundle_price, b.status, b.created_at,
       coalesce(json_agg(json_build_object('id', c.id, 'title', c.title, 'price', c.price, 'status', c.status)) filter (where c.id is not null), '[]') as items
     from bundles b left join bundle_items bi on bi.bundle_id = b.id left join catalogs c on c.id = bi.catalog_id
     where b.store_id = $1 group by b.id order by b.created_at desc`,
    [store.id],
  );
  res.json({
    bundles: rows.map((b) => ({
      id: b.id,
      title: b.title,
      bundlePrice: b.bundle_price,
      status: b.status,
      createdAt: b.created_at,
      items: b.items,
      itemsTotal: b.items.reduce((sum, i) => sum + i.price, 0),
    })),
  });
});

const bundleSchema = z
  .object({
    title: z.string().trim().min(5).max(200),
    bundlePrice: z.number().int().min(10_000),
    catalogIds: z.array(z.uuid()).min(2, 'bundle minimal 2 akun').max(5, 'bundle maksimal 5 akun'),
  })
  .strict();

promotionsRouter.post('/stores/me/bundles', writeLimiter, async (req, res) => {
  const { store } = await activeStore(req);
  const b = parse(bundleSchema, req.body);
  const ids = [...new Set(b.catalogIds)];
  if (ids.length !== b.catalogIds.length) throw badRequest('Katalog dalam bundle tidak boleh dobel.');
  const items = await all<{ id: string; price: number; status: string }>(
    pool,
    'select id, price, status from catalogs where id = any($1::uuid[]) and store_id = $2',
    [ids, store.id],
  );
  if (items.length !== ids.length || items.some((i) => i.status !== 'LISTED')) throw badRequest('Semua katalog harus milik tokomu dan sedang tayang.');
  const total = items.reduce((sum, i) => sum + i.price, 0);
  if (b.bundlePrice >= total) throw badRequest(`Harga bundle harus lebih murah dari total harga (Rp${total.toLocaleString('id-ID')}).`);
  await withTransaction(async (tx) => {
    const row = await one<{ id: string }>(tx, 'insert into bundles (store_id, title, bundle_price) values ($1, $2, $3) returning id', [
      store.id,
      b.title,
      b.bundlePrice,
    ]);
    for (const id of ids) await run(tx, 'insert into bundle_items (bundle_id, catalog_id) values ($1, $2)', [row!.id, id]);
  });
  res.status(201).json({ ok: true });
});

promotionsRouter.patch('/stores/me/bundles/:id', writeLimiter, async (req, res) => {
  const { store } = await ownStore(req);
  const { status } = parse(z.object({ status: z.enum(['ACTIVE', 'INACTIVE']) }).strict(), req.body);
  const changed = await run(pool, `update bundles set status = $1 where id = $2 and store_id = $3 and status <> 'SOLD'`, [
    status,
    parse(idParam, req.params.id),
    store.id,
  ]);
  if (changed === 0) throw notFound('Bundle');
  res.json({ ok: true });
});

// ── Featured listing ads (MONEY_RULES §7) ──

promotionsRouter.get('/stores/me/ads', async (req, res) => {
  const { store } = await ownStore(req);
  const [ads, sub, anyAd] = await Promise.all([
    all<{ id: string; catalog_id: string; title: string; duration_days: number; price: number; is_free: boolean; status: string; starts_at: string | null; ends_at: string | null; stop_reason: string | null; created_at: string }>(
      pool,
      `select f.*, c.title from featured_listings f join catalogs c on c.id = f.catalog_id where f.store_id = $1 order by f.created_at desc`,
      [store.id],
    ),
    one<{ free_featured_slots: number; used_featured_slots: number }>(pool, 'select free_featured_slots, used_featured_slots from store_subscriptions where store_id = $1', [
      store.id,
    ]),
    one(pool, 'select 1 from featured_listings where store_id = $1 limit 1', [store.id]),
  ]);
  res.json({
    ads: ads.map((a) => ({
      id: a.id,
      catalog: { id: a.catalog_id, title: a.title },
      durationDays: a.duration_days,
      price: a.price,
      isFree: a.is_free,
      status: a.status,
      startsAt: a.starts_at,
      endsAt: a.ends_at,
      stopReason: a.stop_reason,
      createdAt: a.created_at,
    })),
    prices: FEATURED_PRICES,
    freeFirstWeekAvailable: !anyAd,
    freeSlotsLeft: Math.max(0, (sub?.free_featured_slots ?? 0) - (sub?.used_featured_slots ?? 0)),
  });
});

const adSchema = z
  .object({
    catalogId: z.uuid(),
    durationDays: z.union([z.literal(1), z.literal(3), z.literal(7), z.literal(14), z.literal(30)]),
    useFree: z.boolean().default(false),
    method: z.enum(GATEWAY_METHODS).optional(),
  })
  .strict();

promotionsRouter.post('/stores/me/ads', checkoutLimiter, async (req, res) => {
  const { user, store } = await activeStore(req);
  const input = parse(adSchema, req.body);
  const catalog = await ownListedCatalog(store.id, input.catalogId);

  if (input.useFree) {
    await withTransaction(async (tx) => {
      await one(tx, 'select 1 from stores where id = $1 for update', [store.id]); // serialise free-slot use
      if (await one(tx, `select 1 from featured_listings where catalog_id = $1 and status in ('ACTIVE', 'PENDING_PAYMENT')`, [catalog.id])) {
        throw conflict('Katalog ini sudah diiklankan.');
      }
      const firstWeek = !(await one(tx, 'select 1 from featured_listings where store_id = $1 limit 1', [store.id]));
      if (!firstWeek) {
        const used = await run(
          tx,
          'update store_subscriptions set used_featured_slots = used_featured_slots + 1 where store_id = $1 and used_featured_slots < free_featured_slots',
          [store.id],
        );
        if (used === 0) throw conflict('Slot iklan gratis sudah habis. Pilih iklan berbayar.', 'NO_FREE_SLOT');
      }
      await run(
        tx,
        `insert into featured_listings (store_id, catalog_id, duration_days, price, is_free, status, starts_at, ends_at)
         values ($1, $2, $3, 0, true, 'ACTIVE', now(), now() + make_interval(days => $3))`,
        [store.id, catalog.id, FREE_FIRST_WEEK_DAYS],
      );
    });
    res.status(201).json({ ok: true, free: true });
    return;
  }

  if (!input.method) throw badRequest('Pilih metode pembayaran.');
  const method = input.method;
  const price = FEATURED_PRICES[input.durationDays]!;
  const invoice = documentNumber('AD');
  await withTransaction(async (tx) => {
    if (await one(tx, `select 1 from featured_listings where catalog_id = $1 and status = 'ACTIVE'`, [catalog.id])) {
      throw conflict('Katalog ini sudah diiklankan.');
    }
    const ad = await one<{ id: string }>(
      tx,
      `insert into featured_listings (store_id, catalog_id, duration_days, price) values ($1, $2, $3, $4) returning id`,
      [store.id, catalog.id, input.durationDays, price],
    );
    await payments.recordPayment(tx, { invoice, purpose: 'AD', refId: ad!.id, userId: user.id, amount: price, method });
  });
  res.status(201).json({ invoice, payment: await payments.openPaymentPage(invoice, { name: user.name, email: user.email }) });
});

promotionsRouter.post('/stores/me/ads/:id/stop', writeLimiter, async (req, res) => {
  const { store } = await ownStore(req);
  const changed = await run(
    pool,
    `update featured_listings set status = 'STOPPED', stop_reason = 'Dihentikan oleh toko' where id = $1 and store_id = $2 and status = 'ACTIVE'`,
    [parse(idParam, req.params.id), store.id],
  );
  if (changed === 0) throw notFound('Iklan aktif');
  res.json({ ok: true });
});
