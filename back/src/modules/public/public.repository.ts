// Public read models: games, field templates, stores, bundles, help & news.
import { all, one, type Db } from '../../db/pool.js';

export interface GameRow {
  id: number;
  slug: string;
  name: string;
  publisher: string;
  tagline: string;
  description: string;
  supports_account: boolean;
  supports_topup: boolean;
  has_skin_api: boolean;
  is_hot: boolean;
  is_active: boolean;
  uid_label: string;
  uid_hint: string;
  uid_extra_label: string | null;
  gradient: string;
  topup_currency: string | null;
  image: string | null;
  sort_order: number;
}

export const toGame = (g: GameRow) => ({
  id: g.id,
  slug: g.slug,
  name: g.name,
  publisher: g.publisher,
  tagline: g.tagline,
  description: g.description,
  supportsAccount: g.supports_account,
  supportsTopup: g.supports_topup,
  hasSkinApi: g.has_skin_api,
  isHot: g.is_hot,
  isActive: g.is_active,
  sortOrder: g.sort_order,
  uidLabel: g.uid_label,
  uidHint: g.uid_hint,
  uidExtraLabel: g.uid_extra_label ?? undefined,
  gradient: g.gradient,
  topupCurrency: g.topup_currency ?? undefined,
  image: g.image,
});

export const listGames = async (db: Db, includeInactive = false) =>
  (await all<GameRow>(db, `select * from games ${includeInactive ? '' : 'where is_active'} order by sort_order, name`)).map(toGame);

export const findGameRow = (db: Db, slug: string) => one<GameRow>(db, 'select * from games where slug = $1', [slug]);

export interface TemplateRow {
  id: string;
  key: string;
  label: string;
  type: 'TEXT' | 'NUMBER' | 'SELECT' | 'TAGS';
  required: boolean;
  options: string[] | null;
  filterable: boolean;
  help_text: string | null;
  sort_order: number;
}

export const toTemplate = (t: TemplateRow) => ({
  id: t.id,
  key: t.key,
  label: t.label,
  type: t.type,
  required: t.required,
  options: t.options ?? [],
  filterable: t.filterable,
  helpText: t.help_text,
  sortOrder: t.sort_order,
});
export type FieldTemplate = ReturnType<typeof toTemplate>;

export const templatesForGame = async (db: Db, gameId: number) =>
  (await all<TemplateRow>(db, 'select * from game_field_templates where game_id = $1 order by sort_order, label', [gameId])).map(toTemplate);

// ── Stores ──

interface StoreRow {
  id: string;
  slug: string;
  name: string;
  type: 'OWNER' | 'RESELLER';
  level: 'AUTHORIZED' | 'VERIFIED' | 'PLATINUM';
  status: string;
  identity_verified: boolean;
  deposit_status: string;
  rating: number;
  reviews: number;
  sold: number;
  followers: number;
  score_desc: number;
  score_attitude: number;
  score_delivery: number;
  description: string | null;
  gradient: string;
  created_at: string;
  tier: string | null;
}

interface VoucherRow {
  id: string;
  store_id: string;
  code: string;
  kind: 'PERCENT' | 'FIXED';
  value: number;
  min_spend: number;
  quota: number | null;
  used: number;
  expires_at: string | null;
}

const joinedLabel = (createdAt: string) => new Date(createdAt).toLocaleDateString('id-ID', { month: 'short', year: 'numeric' });

export function toStore(s: StoreRow, vouchers: VoucherRow[]) {
  return {
    id: s.id,
    slug: s.slug,
    name: s.name,
    type: s.type,
    level: s.level,
    tier: s.tier ?? 'FREE',
    identityVerified: s.identity_verified,
    depositSecured: s.deposit_status === 'HELD',
    rating: s.rating,
    reviews: s.reviews,
    sold: s.sold,
    serviceScore: { descAccuracy: s.score_desc, attitude: s.score_attitude, deliverySpeed: s.score_delivery },
    followers: s.followers,
    joined: joinedLabel(s.created_at),
    description: s.description ?? '',
    gradient: s.gradient,
    vouchers: vouchers
      .filter((v) => v.store_id === s.id)
      .map((v) => ({ code: v.code, kind: v.kind, value: v.value, minSpend: v.min_spend, expiresAt: v.expires_at })),
  };
}

const STORE_SELECT = `select s.*, sub.tier from stores s left join store_subscriptions sub on sub.store_id = s.id`;

/** Vouchers usable right now: active, started, not expired, quota left. */
export const USABLE_VOUCHER = `v.is_active and v.starts_at <= now() and (v.expires_at is null or v.expires_at > now())
  and (v.quota is null or v.used < v.quota)`;

export async function listActiveStores(db: Db) {
  const [stores, vouchers] = await Promise.all([
    all<StoreRow>(db, `${STORE_SELECT} where s.status = 'ACTIVE' order by s.sold desc, s.name`),
    all<VoucherRow>(db, `select v.* from store_vouchers v where ${USABLE_VOUCHER}`),
  ]);
  return stores.map((s) => toStore(s, vouchers));
}

export async function findActiveStore(db: Db, slug: string) {
  const store = await one<StoreRow>(db, `${STORE_SELECT} where s.slug = $1 and s.status = 'ACTIVE'`, [slug]);
  if (!store) return null;
  const vouchers = await all<VoucherRow>(db, `select v.* from store_vouchers v where v.store_id = $1 and ${USABLE_VOUCHER}`, [store.id]);
  return toStore(store, vouchers);
}

/** Active bundles whose catalogs are all still for sale. */
export async function activeBundles(db: Db, filter: { storeId?: string; catalogId?: string }) {
  return all<{ id: string; title: string; bundle_price: number; store_id: string; catalog_ids: string[]; items_total: number }>(
    db,
    `select b.id, b.title, b.bundle_price, b.store_id,
            array_agg(bi.catalog_id) as catalog_ids, sum(c.price)::int as items_total
     from bundles b
     join bundle_items bi on bi.bundle_id = b.id
     join catalogs c on c.id = bi.catalog_id
     where b.status = 'ACTIVE'
       and ($1::uuid is null or b.store_id = $1)
       and ($2::uuid is null or exists (select 1 from bundle_items x where x.bundle_id = b.id and x.catalog_id = $2))
     group by b.id
     having bool_and(c.status = 'LISTED')`,
    [filter.storeId ?? null, filter.catalogId ?? null],
  );
}

// ── Help & news ──

interface HelpRow {
  slug: string;
  title: string;
  category: string;
  excerpt: string;
  popular: boolean;
  body: unknown[];
  helpful_count: number;
}

const toHelp = (h: HelpRow) => ({
  slug: h.slug,
  title: h.title,
  category: h.category,
  excerpt: h.excerpt,
  popular: h.popular || undefined,
  body: h.body,
  helpfulCount: h.helpful_count,
});

export const listHelp = async (db: Db) =>
  (await all<HelpRow>(db, 'select * from help_articles where is_published order by sort_order')).map(toHelp);

export async function findHelp(db: Db, slug: string) {
  const row = await one<HelpRow>(db, 'select * from help_articles where slug = $1 and is_published', [slug]);
  return row ? toHelp(row) : null;
}

interface NewsRow {
  id: string;
  slug: string;
  title: string;
  category: string;
  excerpt: string;
  cover: string | null;
  body: unknown[];
  status: string;
  published_at: string | null;
  author_name: string | null;
}

export const toNews = (n: NewsRow) => ({
  id: n.id,
  slug: n.slug,
  title: n.title,
  category: n.category,
  excerpt: n.excerpt,
  cover: n.cover ?? '/images/Valorant_Points.png',
  body: n.body,
  status: n.status,
  date: n.published_at ?? '',
  author: n.author_name ?? 'Tim valostock.id',
});

const NEWS_SELECT = `select n.*, p.name as author_name from news_articles n left join profiles p on p.id = n.author_id`;

export const listNews = async (db: Db) =>
  (await all<NewsRow>(db, `${NEWS_SELECT} where n.status = 'PUBLISHED' order by n.published_at desc`)).map(toNews);

export async function findNews(db: Db, slug: string) {
  const row = await one<NewsRow>(db, `${NEWS_SELECT} where n.slug = $1 and n.status = 'PUBLISHED'`, [slug]);
  return row ? toNews(row) : null;
}
