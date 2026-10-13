// Admin · Data Master & Konten: games + catalog field templates, top-up products,
// promo codes, news and help articles (ADMIN_PANEL §3.9–3.10).
import { Router } from 'express';
import { z } from 'zod';
import { all, json, one, pool, run, withTransaction, type SqlParam } from '../../db/pool.js';
import { audit } from '../../lib/audit.js';
import { topupRetailFor } from '../../config/money.js';
import { badRequest, conflict, notFound, parse } from '../../lib/errors.js';
import { toGame, toNews, toTemplate, type GameRow, type TemplateRow } from '../public/public.repository.js';
import { admin, idParam, ipOf } from './admin.guard.js';

export const adminMasterRouter = Router();

const slug = z.string().trim().regex(/^[a-z0-9-]{2,50}$/, 'slug: huruf kecil, angka, tanda minus');
const intId = z.coerce.number().int().positive();

/** Builds "col = $n" pairs for a partial update from a camelCase → column map. */
function patchSql(input: Record<string, unknown>, columns: Record<string, string>, jsonKeys: string[] = []) {
  const sets: string[] = [];
  const params: SqlParam[] = [];
  for (const [key, column] of Object.entries(columns)) {
    const value = input[key];
    if (value === undefined) continue;
    params.push(jsonKeys.includes(key) ? json(value) : (value as SqlParam));
    sets.push(`${column} = $${params.length}`);
  }
  return { sets, params };
}

// ── Games ──

const gameFields = {
  slug,
  name: z.string().trim().min(2).max(80),
  publisher: z.string().trim().min(2).max(80),
  tagline: z.string().trim().min(2).max(160),
  description: z.string().trim().min(2).max(2000),
  supportsAccount: z.boolean(),
  supportsTopup: z.boolean(),
  hasSkinApi: z.boolean(),
  isHot: z.boolean(),
  isActive: z.boolean(),
  uidLabel: z.string().trim().min(2).max(60),
  uidHint: z.string().trim().min(2).max(160),
  uidExtraLabel: z.string().trim().max(60).nullable(),
  uidExtraOptions: z.array(z.string().trim().min(1).max(40)).min(1).max(20).nullable(),
  gradient: z.string().trim().max(120),
  topupCurrency: z.string().trim().max(40).nullable(),
  image: z
    .string()
    .trim()
    .regex(/^(\/images\/|cms\/)[A-Za-z0-9/_.()-]+$/, 'gambar harus dari /images/ atau hasil unggah CMS (cms/…)')
    .nullable(),
  sortOrder: z.number().int().min(0).max(1000),
};

const GAME_COLUMNS: Record<string, string> = {
  slug: 'slug',
  name: 'name',
  publisher: 'publisher',
  tagline: 'tagline',
  description: 'description',
  supportsAccount: 'supports_account',
  supportsTopup: 'supports_topup',
  hasSkinApi: 'has_skin_api',
  isHot: 'is_hot',
  isActive: 'is_active',
  uidLabel: 'uid_label',
  uidHint: 'uid_hint',
  uidExtraLabel: 'uid_extra_label',
  uidExtraOptions: 'uid_extra_options',
  gradient: 'gradient',
  topupCurrency: 'topup_currency',
  image: 'image',
  sortOrder: 'sort_order',
};

adminMasterRouter.get('/admin/games', async (req, res) => {
  await admin(req, 'master:manage');
  const rows = await all<GameRow & { fields: number; listed: number; products: number }>(
    pool,
    `select g.*, (select count(*)::int from game_field_templates t where t.game_id = g.id) as fields,
       (select count(*)::int from catalogs c where c.game_id = g.id and c.status = 'LISTED') as listed,
       (select count(*)::int from topup_products p where p.game_id = g.id) as products
     from games g order by g.sort_order, g.name`,
  );
  res.json({ games: rows.map((g) => ({ ...toGame(g), fieldCount: g.fields, listedCount: g.listed, productCount: g.products })) });
});

adminMasterRouter.post('/admin/games', async (req, res) => {
  const user = await admin(req, 'master:manage');
  const g = parse(
    z
      .object(gameFields)
      .partial()
      .required({ slug: true, name: true, publisher: true, tagline: true, description: true, uidLabel: true, uidHint: true })
      .strict(),
    req.body,
  );
  const row = await one<{ id: number }>(
    pool,
    `insert into games (slug, name, publisher, tagline, description, supports_account, supports_topup, has_skin_api, is_hot, is_active,
       uid_label, uid_hint, uid_extra_label, uid_extra_options, gradient, topup_currency, image, sort_order)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18) returning id`,
    [
      g.slug,
      g.name,
      g.publisher,
      g.tagline,
      g.description,
      g.supportsAccount ?? true,
      g.supportsTopup ?? false,
      g.hasSkinApi ?? false,
      g.isHot ?? false,
      g.isActive ?? true,
      g.uidLabel,
      g.uidHint,
      g.uidExtraLabel ?? null,
      g.uidExtraOptions ?? null,
      g.gradient ?? 'from-violet-600 to-fuchsia-600',
      g.topupCurrency ?? null,
      g.image ?? null,
      g.sortOrder ?? 100,
    ],
  );
  await audit(pool, { actorId: user.id, action: 'game.create', targetType: 'game', targetId: String(row!.id), detail: { slug: g.slug }, ip: ipOf(req) });
  res.status(201).json({ id: row!.id });
});

adminMasterRouter.patch('/admin/games/:id', async (req, res) => {
  const user = await admin(req, 'master:manage');
  const id = parse(intId, req.params.id);
  const input = parse(z.object(gameFields).partial().strict(), req.body);
  const { sets, params } = patchSql(input, GAME_COLUMNS);
  if (sets.length > 0 && (await run(pool, `update games set ${sets.join(', ')} where id = $${params.length + 1}`, [...params, id])) === 0) throw notFound('Game');
  await audit(pool, { actorId: user.id, action: 'game.update', targetType: 'game', targetId: String(id), detail: input, ip: ipOf(req) });
  res.json({ ok: true });
});

// ── Field templates (define the store catalog form + search filters) ──

adminMasterRouter.get('/admin/games/:id/fields', async (req, res) => {
  await admin(req, 'master:manage');
  const id = parse(intId, req.params.id);
  const rows = await all<TemplateRow & { used: number }>(
    pool,
    `select t.*, (select count(*)::int from catalogs c where c.game_id = t.game_id and c.attributes ? t.key) as used
     from game_field_templates t where t.game_id = $1 order by t.sort_order, t.label`,
    [id],
  );
  res.json({ fields: rows.map((t) => ({ ...toTemplate(t), usedBy: t.used })) });
});

const fieldSchema = z
  .object({
    key: z.string().regex(/^[a-zA-Z][a-zA-Z0-9_]{0,40}$/, 'key: huruf/angka/underscore, diawali huruf'),
    label: z.string().trim().min(2).max(60),
    type: z.enum(['TEXT', 'NUMBER', 'SELECT', 'TAGS']),
    required: z.boolean().default(false),
    options: z.array(z.string().trim().min(1).max(60)).max(60).nullable().optional(),
    filterable: z.boolean().default(false),
    helpText: z.string().trim().max(200).nullable().optional(),
    sortOrder: z.number().int().min(0).max(1000).default(0),
  })
  .strict()
  .refine((f) => f.type !== 'SELECT' || (f.options?.length ?? 0) > 0, { message: 'tipe SELECT butuh daftar pilihan', path: ['options'] });

adminMasterRouter.post('/admin/games/:id/fields', async (req, res) => {
  const user = await admin(req, 'master:manage');
  const gameId = parse(intId, req.params.id);
  const f = parse(fieldSchema, req.body);
  const row = await one<{ id: string }>(
    pool,
    `insert into game_field_templates (game_id, key, label, type, required, options, filterable, help_text, sort_order)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9) returning id`,
    [gameId, f.key, f.label, f.type, f.required, f.options ? json(f.options) : null, f.filterable, f.helpText ?? null, f.sortOrder],
  );
  await audit(pool, { actorId: user.id, action: 'field.create', targetType: 'game', targetId: String(gameId), detail: f, ip: ipOf(req) });
  res.status(201).json({ id: row!.id });
});

adminMasterRouter.patch('/admin/fields/:id', async (req, res) => {
  const user = await admin(req, 'master:manage');
  const id = parse(idParam, req.params.id);
  // The key is fixed once created (catalog attributes are stored under it).
  const input = parse(
    z
      .object({
        label: z.string().trim().min(2).max(60),
        required: z.boolean(),
        options: z.array(z.string().trim().min(1).max(60)).max(60).nullable(),
        filterable: z.boolean(),
        helpText: z.string().trim().max(200).nullable(),
        sortOrder: z.number().int().min(0).max(1000),
      })
      .partial()
      .strict(),
    req.body,
  );
  const { sets, params } = patchSql(
    input,
    { label: 'label', required: 'required', options: 'options', filterable: 'filterable', helpText: 'help_text', sortOrder: 'sort_order' },
    ['options'],
  );
  if (sets.length > 0 && (await run(pool, `update game_field_templates set ${sets.join(', ')} where id = $${params.length + 1}`, [...params, id])) === 0) {
    throw notFound('Kolom');
  }
  await audit(pool, { actorId: user.id, action: 'field.update', targetType: 'field', targetId: id, detail: input, ip: ipOf(req) });
  res.json({ ok: true });
});

adminMasterRouter.delete('/admin/fields/:id', async (req, res) => {
  const user = await admin(req, 'master:manage');
  const id = parse(idParam, req.params.id);
  const f = await one<{ game_id: number; key: string }>(pool, 'select game_id, key from game_field_templates where id = $1', [id]);
  if (!f) throw notFound('Kolom');
  if (await one(pool, `select 1 from catalogs where game_id = $1 and attributes ? $2 and status <> 'SOLD'`, [f.game_id, f.key])) {
    throw conflict('Kolom ini masih dipakai katalog aktif, jadikan opsional saja.');
  }
  await run(pool, 'delete from game_field_templates where id = $1', [id]);
  await audit(pool, { actorId: user.id, action: 'field.delete', targetType: 'field', targetId: id, detail: f, ip: ipOf(req) });
  res.json({ ok: true });
});

// ── Top-up products ──

function assertMargin(supplierPrice: number, retailPrice: number) {
  if (retailPrice < supplierPrice) throw badRequest('Harga jual tidak boleh di bawah harga modal Digiflazz.', 'BELOW_COST');
}

adminMasterRouter.get('/admin/topup-products', async (req, res) => {
  await admin(req, 'master:manage');
  const rows = await all<{ id: string; game_id: number; game_slug: string; game_name: string; name: string; amount_label: string; supplier_price: number; retail_price: number; section: 'SPECIAL' | 'INSTANT'; icon: string | null; popular: boolean; is_active: boolean; sort_order: number; sold: number }>(
    pool,
    `select p.*, g.slug as game_slug, g.name as game_name,
       (select count(*)::int from topup_orders t where t.product_id = p.id and t.status = 'SUCCESS') as sold
     from topup_products p join games g on g.id = p.game_id order by g.sort_order, p.sort_order`,
  );
  res.json({
    products: rows.map((p) => ({
      id: p.id,
      gameId: p.game_id,
      gameSlug: p.game_slug,
      gameName: p.game_name,
      name: p.name,
      amountLabel: p.amount_label,
      supplierPrice: p.supplier_price,
      retailPrice: p.retail_price,
      margin: p.retail_price - p.supplier_price,
      section: p.section,
      icon: p.icon,
      popular: p.popular,
      isActive: p.is_active,
      sortOrder: p.sort_order,
      sold: p.sold,
    })),
  });
});

const productFields = {
  gameId: z.number().int().positive(),
  name: z.string().trim().min(2).max(100),
  amountLabel: z.string().trim().min(1).max(60),
  supplierPrice: z.number().int().positive().max(100_000_000),
  retailPrice: z.number().int().positive().max(100_000_000),
  section: z.enum(['SPECIAL', 'INSTANT']),
  icon: z
    .string()
    .trim()
    .regex(/^\/images\/[a-z0-9/_.-]+$/, 'ikon harus dari /images/')
    .nullable(),
  popular: z.boolean(),
  isActive: z.boolean(),
  sortOrder: z.number().int().min(0).max(1000),
};

adminMasterRouter.post('/admin/topup-products', async (req, res) => {
  const user = await admin(req, 'master:manage');
  const p = parse(
    z
      .object({ id: z.string().regex(/^[a-z0-9-]{2,36}$/, 'id: huruf kecil, angka, minus'), ...productFields })
      .partial({ retailPrice: true, section: true, icon: true, popular: true, isActive: true, sortOrder: true })
      .strict(),
    req.body,
  );
  // MONEY_RULES §8: no retail price → Digiflazz price + 3%; never below cost.
  const retailPrice = p.retailPrice ?? topupRetailFor(p.supplierPrice);
  assertMargin(p.supplierPrice, retailPrice);
  await run(
    pool,
    `insert into topup_products (id, game_id, name, amount_label, supplier_price, retail_price, section, icon, popular, is_active, sort_order)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
    [p.id, p.gameId, p.name, p.amountLabel, p.supplierPrice, retailPrice, p.section ?? 'INSTANT', p.icon ?? null, p.popular ?? false, p.isActive ?? true, p.sortOrder ?? 0],
  );
  await audit(pool, { actorId: user.id, action: 'topup_product.create', targetType: 'topup_product', targetId: p.id, detail: p, ip: ipOf(req) });
  res.status(201).json({ ok: true });
});

adminMasterRouter.patch('/admin/topup-products/:id', async (req, res) => {
  const user = await admin(req, 'master:manage');
  const id = parse(z.string().regex(/^[a-z0-9-]{2,36}$/), req.params.id);
  const input = parse(z.object(productFields).partial().strict(), req.body);
  if (input.supplierPrice !== undefined || input.retailPrice !== undefined) {
    const current = await one<{ supplier_price: number; retail_price: number }>(pool, 'select supplier_price, retail_price from topup_products where id = $1', [id]);
    if (!current) throw notFound('Produk');
    // A new cost without a retail price re-applies the margin rule.
    if (input.supplierPrice !== undefined && input.retailPrice === undefined) input.retailPrice = topupRetailFor(input.supplierPrice);
    assertMargin(input.supplierPrice ?? current.supplier_price, input.retailPrice ?? current.retail_price);
  }
  const { sets, params } = patchSql(input, {
    gameId: 'game_id',
    name: 'name',
    amountLabel: 'amount_label',
    supplierPrice: 'supplier_price',
    retailPrice: 'retail_price',
    section: 'section',
    icon: 'icon',
    popular: 'popular',
    isActive: 'is_active',
    sortOrder: 'sort_order',
  });
  if (sets.length > 0 && (await run(pool, `update topup_products set ${sets.join(', ')} where id = $${params.length + 1}`, [...params, id])) === 0) {
    throw notFound('Produk');
  }
  await audit(pool, { actorId: user.id, action: 'topup_product.update', targetType: 'topup_product', targetId: id, detail: input, ip: ipOf(req) });
  res.json({ ok: true });
});

// Hard delete only while no invoice points at the product; otherwise it can only be deactivated.
adminMasterRouter.delete('/admin/topup-products/:id', async (req, res) => {
  const user = await admin(req, 'master:manage');
  const id = parse(z.string().regex(/^[a-z0-9-]{2,36}$/), req.params.id);
  const product = await one<{ name: string; amount_label: string }>(pool, 'select name, amount_label from topup_products where id = $1', [id]);
  if (!product) throw notFound('Produk');
  if (await one(pool, 'select 1 from topup_orders where product_id = $1 limit 1', [id])) {
    throw conflict('Produk sudah pernah dipesan, nonaktifkan saja agar riwayat invoice tetap utuh.', 'PRODUCT_IN_USE');
  }
  await run(pool, 'delete from topup_products where id = $1', [id]);
  await audit(pool, { actorId: user.id, action: 'topup_product.delete', targetType: 'topup_product', targetId: id, detail: product, ip: ipOf(req) });
  res.json({ ok: true });
});

// ── Promo codes (top-up) ──

adminMasterRouter.get('/admin/promo-codes', async (req, res) => {
  await admin(req, 'master:manage');
  const rows = await all<{ id: number; code: string; kind: string; value: number; min_spend: number; label: string; quota: number | null; used_count: number; expires_at: string | null; is_active: boolean; created_at: string }>(
    pool,
    'select * from promo_codes order by created_at desc',
  );
  res.json({
    promos: rows.map((p) => ({
      id: p.id,
      code: p.code,
      kind: p.kind,
      value: p.value,
      minSpend: p.min_spend,
      label: p.label,
      quota: p.quota,
      usedCount: p.used_count,
      expiresAt: p.expires_at,
      isActive: p.is_active,
      createdAt: p.created_at,
    })),
  });
});

const promoFields = {
  code: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9]{3,30}$/, 'kode 3 sampai 30 huruf/angka'),
  kind: z.enum(['PERCENT', 'FIXED']),
  value: z.number().int().positive().max(10_000_000),
  minSpend: z.number().int().min(0).max(100_000_000),
  label: z.string().trim().min(2).max(120),
  quota: z.number().int().positive().max(1_000_000).nullable(),
  expiresAt: z.iso.datetime({ offset: true }).nullable(),
  isActive: z.boolean(),
};

adminMasterRouter.post('/admin/promo-codes', async (req, res) => {
  const user = await admin(req, 'master:manage');
  const p = parse(z.object(promoFields).partial({ minSpend: true, quota: true, expiresAt: true, isActive: true }).strict(), req.body);
  if (p.kind === 'PERCENT' && p.value > 90) throw conflict('Diskon persen maksimal 90%.');
  const row = await one<{ id: number }>(
    pool,
    `insert into promo_codes (code, kind, value, min_spend, label, quota, expires_at, is_active) values ($1, $2, $3, $4, $5, $6, $7, $8) returning id`,
    [p.code, p.kind, p.value, p.minSpend ?? 0, p.label, p.quota ?? null, p.expiresAt ?? null, p.isActive ?? true],
  );
  await audit(pool, { actorId: user.id, action: 'promo.create', targetType: 'promo_code', targetId: String(row!.id), detail: p, ip: ipOf(req) });
  res.status(201).json({ id: row!.id });
});

adminMasterRouter.patch('/admin/promo-codes/:id', async (req, res) => {
  const user = await admin(req, 'master:manage');
  const id = parse(intId, req.params.id);
  const input = parse(z.object(promoFields).omit({ code: true }).partial().strict(), req.body);
  const { sets, params } = patchSql(input, {
    kind: 'kind',
    value: 'value',
    minSpend: 'min_spend',
    label: 'label',
    quota: 'quota',
    expiresAt: 'expires_at',
    isActive: 'is_active',
  });
  if (sets.length > 0 && (await run(pool, `update promo_codes set ${sets.join(', ')} where id = $${params.length + 1}`, [...params, id])) === 0) {
    throw notFound('Kode promo');
  }
  await audit(pool, { actorId: user.id, action: 'promo.update', targetType: 'promo_code', targetId: String(id), detail: input, ip: ipOf(req) });
  res.json({ ok: true });
});

// ── Content: news & help (block body — same format the public pages render) ──

const block = z.union([
  z.object({ type: z.literal('paragraph'), text: z.string().max(5000) }).strict(),
  z.object({ type: z.literal('heading'), text: z.string().max(200) }).strict(),
  z.object({ type: z.literal('list'), items: z.array(z.string().max(500)).max(50) }).strict(),
  z
    .object({
      type: z.literal('image'),
      src: z.string().regex(/^\/images\/[\w\-./() ]+$/, 'gambar harus dari /images/'),
      alt: z.string().max(200),
    })
    .strict(),
]);

const newsFields = {
  slug: z.string().regex(/^[a-z0-9-]{2,120}$/),
  title: z.string().trim().min(5).max(200),
  category: z.string().trim().min(2).max(40),
  excerpt: z.string().trim().min(5).max(400),
  cover: z
    .string()
    .regex(/^\/images\/[\w\-./() ]+$/, 'cover harus dari /images/')
    .nullable(),
  body: z.array(block).max(200),
  status: z.enum(['DRAFT', 'PUBLISHED']),
};

adminMasterRouter.get('/admin/news', async (req, res) => {
  await admin(req, 'content:manage');
  const rows = await all<Parameters<typeof toNews>[0]>(
    pool,
    'select n.*, p.name as author_name from news_articles n left join profiles p on p.id = n.author_id order by n.created_at desc',
  );
  res.json({ articles: rows.map(toNews) });
});

adminMasterRouter.post('/admin/news', async (req, res) => {
  const user = await admin(req, 'content:manage');
  const n = parse(z.object(newsFields).partial({ cover: true, status: true }).strict(), req.body);
  const status = n.status ?? 'DRAFT';
  const row = await one<{ id: string }>(
    pool,
    `insert into news_articles (slug, title, category, excerpt, cover, body, status, author_id, published_at)
     values ($1, $2, $3, $4, $5, $6, $7, $8, case when $7::article_status = 'PUBLISHED' then now() end) returning id`,
    [n.slug, n.title, n.category, n.excerpt, n.cover ?? null, json(n.body), status, user.id],
  );
  await audit(pool, { actorId: user.id, action: 'news.create', targetType: 'news', targetId: row!.id, detail: { slug: n.slug, status }, ip: ipOf(req) });
  res.status(201).json({ id: row!.id });
});

adminMasterRouter.patch('/admin/news/:id', async (req, res) => {
  const user = await admin(req, 'content:manage');
  const id = parse(idParam, req.params.id);
  const input = parse(z.object(newsFields).partial().strict(), req.body);
  const { sets, params } = patchSql(
    input,
    { slug: 'slug', title: 'title', category: 'category', excerpt: 'excerpt', cover: 'cover', body: 'body', status: 'status' },
    ['body'],
  );
  if (input.status === 'PUBLISHED') sets.push('published_at = coalesce(published_at, now())');
  if (sets.length > 0 && (await run(pool, `update news_articles set ${sets.join(', ')} where id = $${params.length + 1}`, [...params, id])) === 0) {
    throw notFound('Berita');
  }
  await audit(pool, { actorId: user.id, action: 'news.update', targetType: 'news', targetId: id, detail: { ...input, body: undefined }, ip: ipOf(req) });
  res.json({ ok: true });
});

adminMasterRouter.delete('/admin/news/:id', async (req, res) => {
  const user = await admin(req, 'content:manage');
  const id = parse(idParam, req.params.id);
  if ((await run(pool, 'delete from news_articles where id = $1', [id])) === 0) throw notFound('Berita');
  await audit(pool, { actorId: user.id, action: 'news.delete', targetType: 'news', targetId: id, ip: ipOf(req) });
  res.json({ ok: true });
});

const HELP_CATEGORIES = [
  'GETTING_STARTED',
  'BECOMING_STORE',
  'FEES_WITHDRAWAL',
  'BEFORE_SALE',
  'AFTER_SALE',
  'DISPUTES',
  'TOPUP',
  'BALANCE',
  'PENALTIES',
  'SECURITY',
] as const;

const helpFields = {
  slug: z.string().regex(/^[a-z0-9-]{2,120}$/),
  title: z.string().trim().min(5).max(200),
  category: z.enum(HELP_CATEGORIES),
  excerpt: z.string().trim().min(5).max(400),
  body: z.array(block).max(200),
  popular: z.boolean(),
  isPublished: z.boolean(),
  sortOrder: z.number().int().min(0).max(1000),
};

adminMasterRouter.get('/admin/help', async (req, res) => {
  await admin(req, 'content:manage');
  const rows = await all<{ id: number; slug: string; title: string; category: string; excerpt: string; body: unknown[]; popular: boolean; is_published: boolean; helpful_count: number; sort_order: number; updated_at: string }>(
    pool,
    'select * from help_articles order by sort_order, id',
  );
  res.json({
    articles: rows.map((h) => ({
      id: h.id,
      slug: h.slug,
      title: h.title,
      category: h.category,
      excerpt: h.excerpt,
      body: h.body,
      popular: h.popular,
      isPublished: h.is_published,
      helpfulCount: h.helpful_count,
      sortOrder: h.sort_order,
      updatedAt: h.updated_at,
    })),
    categories: HELP_CATEGORIES,
  });
});

adminMasterRouter.post('/admin/help', async (req, res) => {
  const user = await admin(req, 'content:manage');
  const h = parse(z.object(helpFields).partial({ popular: true, isPublished: true, sortOrder: true }).strict(), req.body);
  const row = await one<{ id: number }>(
    pool,
    `insert into help_articles (slug, title, category, excerpt, body, popular, is_published, sort_order) values ($1, $2, $3, $4, $5, $6, $7, $8) returning id`,
    [h.slug, h.title, h.category, h.excerpt, json(h.body), h.popular ?? false, h.isPublished ?? true, h.sortOrder ?? 100],
  );
  await audit(pool, { actorId: user.id, action: 'help.create', targetType: 'help', targetId: String(row!.id), detail: { slug: h.slug }, ip: ipOf(req) });
  res.status(201).json({ id: row!.id });
});

adminMasterRouter.patch('/admin/help/:id', async (req, res) => {
  const user = await admin(req, 'content:manage');
  const id = parse(intId, req.params.id);
  const input = parse(z.object(helpFields).partial().strict(), req.body);
  const { sets, params } = patchSql(
    input,
    { slug: 'slug', title: 'title', category: 'category', excerpt: 'excerpt', body: 'body', popular: 'popular', isPublished: 'is_published', sortOrder: 'sort_order' },
    ['body'],
  );
  await withTransaction(async (tx) => {
    if (sets.length > 0 && (await run(tx, `update help_articles set ${sets.join(', ')} where id = $${params.length + 1}`, [...params, id])) === 0) {
      throw notFound('Artikel');
    }
    await audit(tx, { actorId: user.id, action: 'help.update', targetType: 'help', targetId: String(id), detail: { ...input, body: undefined }, ip: ipOf(req) });
  });
  res.json({ ok: true });
});
