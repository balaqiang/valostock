// Public marketplace reads. Row → JSON shapes match front/src/lib/mock types
// (MockGame, MockStore, MockListing, …) so the UI components stay unchanged.
import { all, one, parseJson, type Db } from '../../db/pool.js';

// ── Games ──

interface GameRow {
  id: number;
  slug: string;
  name: string;
  publisher: string;
  tagline: string;
  description: string;
  supports_account: number;
  supports_topup: number;
  has_skin_api: number;
  is_hot: number;
  uid_label: string;
  uid_hint: string;
  uid_extra_label: string | null;
  gradient: string;
  topup_currency: string | null;
  sort_order: number;
}

export const toGame = (g: GameRow) => ({
  slug: g.slug,
  name: g.name,
  publisher: g.publisher,
  tagline: g.tagline,
  description: g.description,
  supportsAccount: g.supports_account === 1,
  supportsTopup: g.supports_topup === 1,
  hasSkinApi: g.has_skin_api === 1,
  isHot: g.is_hot === 1,
  sortOrder: g.sort_order,
  uidLabel: g.uid_label,
  uidHint: g.uid_hint,
  uidExtraLabel: g.uid_extra_label ?? undefined,
  gradient: g.gradient,
  topupCurrency: g.topup_currency ?? undefined,
});

export const listGames = async (db: Db) =>
  (await all<GameRow>(db, 'SELECT * FROM games ORDER BY sort_order')).map(toGame);

export const findGameRow = (db: Db, slug: string) => one<GameRow>(db, 'SELECT * FROM games WHERE slug = ?', [slug]);

// ── Stores ──

interface StoreRow {
  id: string;
  slug: string;
  name: string;
  type: 'OWNER' | 'RESELLER';
  level: 'AUTHORIZED' | 'VERIFIED' | 'PLATINUM';
  identity_verified: number;
  deposit_status: 'UNPAID' | 'HELD' | 'RELEASED';
  rating: number;
  reviews: number;
  sold: number;
  score_desc: number;
  score_attitude: number;
  score_delivery: number;
  followers: number;
  description: string | null;
  gradient: string;
  created_at: string;
}

interface VoucherRow {
  store_id: string;
  code: string;
  kind: 'PERCENT' | 'FIXED';
  value: number;
  min_spend: number;
}

const joinedLabel = (createdAt: string) =>
  new Date(`${createdAt.replace(' ', 'T')}Z`).toLocaleDateString('id-ID', { month: 'short', year: 'numeric' });

function toStore(s: StoreRow, vouchers: VoucherRow[]) {
  return {
    slug: s.slug,
    name: s.name,
    type: s.type,
    level: s.level,
    identityVerified: s.identity_verified === 1,
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
      .map((v) => ({ code: v.code, kind: v.kind, value: v.value, minSpend: v.min_spend })),
  };
}

/** Vouchers still offered publicly: quota not used up and not expired. */
const VOUCHER_SQL = `SELECT store_id, code, kind, value, min_spend FROM store_vouchers
  WHERE (quota IS NULL OR used < quota) AND (expires_at IS NULL OR expires_at >= UTC_DATE())`;

export async function listActiveStores(db: Db) {
  const [stores, vouchers] = await Promise.all([
    all<StoreRow>(db, "SELECT * FROM stores WHERE status = 'ACTIVE' ORDER BY sold DESC, name"),
    all<VoucherRow>(db, VOUCHER_SQL),
  ]);
  return stores.map((store) => toStore(store, vouchers));
}

export async function findActiveStore(db: Db, slug: string) {
  const store = await one<StoreRow>(db, "SELECT * FROM stores WHERE slug = ? AND status = 'ACTIVE'", [slug]);
  if (!store) return null;
  const vouchers = await all<VoucherRow>(db, `${VOUCHER_SQL} AND store_id = ?`, [store.id]);
  return toStore(store, vouchers);
}

// ── Listings (public view of catalogs) ──

export interface ListingRow {
  id: string;
  vs_code: string;
  title: string;
  description: string | null;
  price: number;
  old_price: number | null;
  status: string;
  account_checked: number;
  instant: number;
  image: string | null;
  images: unknown;
  attributes: unknown;
  created_at: string;
  game_slug: string;
  store_slug: string;
  store_name: string;
}

/** Every field the listing UI reads, so catalogs created with few attributes still render. */
const LISTING_DEFAULTS = {
  rank: '-',
  skins: 0,
  totalVp: 0,
  rating: 0,
  sold: 0,
  server: '-',
  skinsList: [] as string[],
  remainingVp: 0,
  remainingRp: 0,
  remainingKc: 0,
  agents: '-',
  battlepass: [] as string[],
  changeNick: false,
  emailStatus: '-',
  region: '-',
  premier: '-',
  level: 0,
  episodeAct: '-',
  radianite: 0,
  verifiedAt: '-',
};

const FALLBACK_IMAGE = '/images/Valorant_Points.png';

export function toListing(row: ListingRow) {
  const attributes = parseJson<Record<string, unknown>>(row.attributes, {});
  const images = parseJson<string[]>(row.images, []);
  const image = row.image ?? images[0] ?? FALLBACK_IMAGE;
  return {
    ...LISTING_DEFAULTS,
    ...attributes,
    id: row.id,
    game: row.game_slug,
    title: row.title,
    description: row.description ?? '',
    price: row.price,
    oldPrice: row.old_price ?? undefined,
    store: row.store_name,
    storeSlug: row.store_slug,
    verified: row.account_checked === 1,
    instant: row.instant === 1,
    image,
    images: images.length > 0 ? images : [image],
    code: row.vs_code,
    status: row.status,
    createdAt: row.created_at,
  };
}

export const LISTING_SELECT = `
  SELECT c.id, c.vs_code, c.title, c.description, c.price, c.old_price, c.status, c.account_checked,
         c.instant, c.image, c.images, c.attributes, c.created_at,
         g.slug AS game_slug, s.slug AS store_slug, s.name AS store_name
  FROM catalogs c
  JOIN games g ON g.id = c.game_id
  JOIN stores s ON s.id = c.store_id`;

/** Visible on the marketplace: listed (or reserved) catalogs of active stores. */
const PUBLIC_WHERE = "c.status IN ('LISTED', 'LOCKED', 'IN_ORDER') AND s.status = 'ACTIVE'";

export async function listPublicListings(db: Db, filter: { game?: string; store?: string }) {
  const where = [PUBLIC_WHERE];
  const params: string[] = [];
  if (filter.game) {
    where.push('g.slug = ?');
    params.push(filter.game);
  }
  if (filter.store) {
    where.push('s.slug = ?');
    params.push(filter.store);
  }
  const rows = await all<ListingRow>(db, `${LISTING_SELECT} WHERE ${where.join(' AND ')} ORDER BY c.sort_order, c.created_at DESC`, params);
  return rows.map(toListing);
}

export async function findPublicListing(db: Db, id: string) {
  const row = await one<ListingRow>(db, `${LISTING_SELECT} WHERE c.id = ? AND ${PUBLIC_WHERE}`, [id]);
  return row ? toListing(row) : null;
}

// ── Top-up products ──

interface ProductRow {
  id: string;
  game_slug: string;
  name: string;
  amount_label: string;
  retail_price: number;
  popular: number;
}

export const toProduct = (p: ProductRow) => ({
  id: p.id,
  gameSlug: p.game_slug,
  name: p.name,
  amountLabel: p.amount_label,
  retailPrice: p.retail_price,
  popular: p.popular === 1 ? true : undefined,
});

export const listTopupProducts = async (db: Db, gameSlug: string) =>
  (
    await all<ProductRow>(
      db,
      `SELECT p.*, g.slug AS game_slug FROM topup_products p JOIN games g ON g.id = p.game_id
       WHERE g.slug = ? ORDER BY p.sort_order`,
      [gameSlug],
    )
  ).map(toProduct);

// ── Help center ──

interface HelpRow {
  slug: string;
  title: string;
  category: string;
  excerpt: string;
  popular: number;
  body: unknown;
}

const toHelp = (h: HelpRow) => ({
  slug: h.slug,
  title: h.title,
  category: h.category,
  excerpt: h.excerpt,
  popular: h.popular === 1 ? true : undefined,
  body: parseJson<unknown[]>(h.body, []),
});

export const listHelp = async (db: Db) =>
  (await all<HelpRow>(db, 'SELECT * FROM help_articles ORDER BY sort_order')).map(toHelp);

export async function findHelp(db: Db, slug: string) {
  const row = await one<HelpRow>(db, 'SELECT * FROM help_articles WHERE slug = ?', [slug]);
  return row ? toHelp(row) : null;
}
