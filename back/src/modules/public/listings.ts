// Catalog listing queries and the JSON shape shared by the marketplace, the
// store dashboard and the admin panel. The shape keeps the fields the web UI
// already uses (front/src/lib/mock/listings.ts MockListing) plus status data.
import { all, json, one, type Db, type SqlParam } from '../../db/pool.js';
import { catalogImageUrl } from '../../supabase/storage.js';

export interface ListingRow {
  id: string;
  vs_code: string | null;
  title: string;
  description: string | null;
  price: number;
  old_price: number | null;
  status: string;
  account_checked: boolean;
  instant: boolean;
  attributes: Record<string, unknown>;
  views: number;
  review_note: string | null;
  submitted_at: string | null;
  listed_at: string | null;
  created_at: string;
  game_slug: string;
  game_name: string;
  store_id: string;
  store_slug: string;
  store_name: string;
  store_rating: number;
  store_sold: number;
  store_tier: string;
  images: string[];
  sale_price: number | null;
  flash_ends_at: string | null;
  featured: boolean;
}

export const LISTING_SELECT = `
  select c.id, c.vs_code, c.title, c.description, c.price, c.old_price, c.status, c.account_checked, c.instant,
         c.attributes, c.views, c.review_note, c.submitted_at, c.listed_at, c.created_at,
         g.slug as game_slug, g.name as game_name, s.id as store_id, s.slug as store_slug, s.name as store_name,
         s.rating as store_rating, s.sold as store_sold, coalesce(sub.tier::text, 'FREE') as store_tier,
         (select coalesce(json_agg(ci.storage_path order by ci.sort_order), '[]'::json)
            from catalog_images ci where ci.catalog_id = c.id) as images,
         fs.sale_price, fs.ends_at as flash_ends_at,
         exists (select 1 from featured_listings f
                  where f.catalog_id = c.id and f.status = 'ACTIVE' and f.ends_at > now()) as featured
  from catalogs c
  join games g on g.id = c.game_id
  join stores s on s.id = c.store_id
  left join store_subscriptions sub on sub.store_id = s.id
  left join lateral (
    select f.sale_price, f.ends_at from flash_sales f
    where f.catalog_id = c.id and now() between f.starts_at and f.ends_at
    order by f.sale_price limit 1
  ) fs on true`;

/** Visible on the marketplace: approved catalogs (or reserved by a running transaction) of active stores. */
export const PUBLIC_WHERE = `c.status in ('LISTED', 'LOCKED', 'IN_ORDER') and s.status = 'ACTIVE' and g.is_active`;

/** Fields the listing UI reads — defaults so catalogs with few attributes still render. */
const DEFAULTS = {
  rank: '-',
  level: 0,
  server: '-',
  region: '-',
  skins: 0,
  totalVp: 0,
  remainingVp: 0,
  remainingRp: 0,
  remainingKc: 0,
  agents: '-',
  battlepass: [] as string[],
  changeNick: false,
  emailStatus: '-',
  premier: '-',
  episodeAct: '-',
  radianite: 0,
  verifiedAt: '-',
  skinsList: [] as string[],
  rating: 0,
  sold: 0,
};

const FALLBACK_IMAGE = '/images/Valorant_Points.png';

export function toListing(row: ListingRow) {
  const images = row.images.map(catalogImageUrl);
  const onSale = row.sale_price !== null && row.sale_price < row.price;
  return {
    ...DEFAULTS,
    ...row.attributes,
    rating: row.store_rating,
    sold: row.store_sold,
    id: row.id,
    code: row.vs_code ?? '',
    game: row.game_slug,
    gameName: row.game_name,
    title: row.title,
    description: row.description ?? '',
    price: onSale ? row.sale_price! : row.price,
    basePrice: row.price,
    oldPrice: onSale ? row.price : (row.old_price ?? undefined),
    flashSale: onSale ? { endsAt: row.flash_ends_at } : null,
    featured: row.featured,
    store: row.store_name,
    storeSlug: row.store_slug,
    storeId: row.store_id,
    storeTier: row.store_tier,
    verified: row.account_checked,
    accountChecked: row.account_checked,
    instant: row.instant,
    image: images[0] ?? FALLBACK_IMAGE,
    images: images.length > 0 ? images : [FALLBACK_IMAGE],
    attributes: row.attributes,
    status: row.status,
    views: row.views,
    reviewNote: row.review_note,
    submittedAt: row.submitted_at,
    listedAt: row.listed_at,
    createdAt: row.created_at,
  };
}
export type Listing = ReturnType<typeof toListing>;

export interface ListingFilter {
  game?: string;
  store?: string;
  q?: string;
  minPrice?: number;
  maxPrice?: number;
  /** Exact match on SELECT/TEXT template fields, e.g. { rank: 'Immortal 3' }. */
  attrs?: Record<string, string>;
  /** Minimum on NUMBER template fields, e.g. { skins: 50 }. */
  attrMin?: Record<string, number>;
  sort?: 'newest' | 'price_asc' | 'price_desc' | 'popular';
  limit?: number;
}

export async function searchListings(db: Db, filter: ListingFilter) {
  const where = [PUBLIC_WHERE];
  const params: SqlParam[] = [];
  const p = (value: SqlParam) => {
    params.push(value);
    return `$${params.length}`;
  };
  if (filter.game) where.push(`g.slug = ${p(filter.game)}`);
  if (filter.store) where.push(`s.slug = ${p(filter.store)}`);
  if (filter.q) where.push(`(c.title ilike ${p(`%${filter.q}%`)} or c.vs_code ilike ${p(`%${filter.q}%`)})`);
  const effective = 'coalesce(fs.sale_price, c.price)';
  if (filter.minPrice !== undefined) where.push(`${effective} >= ${p(filter.minPrice)}`);
  if (filter.maxPrice !== undefined) where.push(`${effective} <= ${p(filter.maxPrice)}`);
  if (filter.attrs && Object.keys(filter.attrs).length > 0) where.push(`c.attributes @> ${p(json(filter.attrs))}::jsonb`);
  for (const [key, min] of Object.entries(filter.attrMin ?? {})) {
    where.push(`(case when jsonb_typeof(c.attributes -> ${p(key)}) = 'number' then (c.attributes ->> ${p(key)})::numeric end) >= ${p(min)}`);
  }
  const order = {
    newest: 'c.listed_at desc nulls last',
    price_asc: `${effective} asc`,
    price_desc: `${effective} desc`,
    popular: 'c.views desc',
  }[filter.sort ?? 'newest'];
  // Ranking boost (MONEY_RULES §5): on the default sorts, Business before Pro before Free (after featured).
  const boost = filter.sort === undefined || filter.sort === 'newest' || filter.sort === 'popular'
    ? "case coalesce(sub.tier::text, 'FREE') when 'BUSINESS' then 2 when 'PRO' then 1 else 0 end desc, "
    : '';
  const limit = Math.min(Math.max(filter.limit ?? 60, 1), 200);
  const rows = await all<ListingRow>(
    db,
    `${LISTING_SELECT} where ${where.join(' and ')} order by featured desc, ${boost}${order}, c.sort_order limit ${limit}`,
    params,
  );
  return rows.map(toListing);
}

export async function findPublicListing(db: Db, id: string) {
  const row = await one<ListingRow>(db, `${LISTING_SELECT} where c.id = $1 and ${PUBLIC_WHERE}`, [id]);
  return row ? toListing(row) : null;
}

/** Any catalog (for owners/admins), whatever its status. */
export async function findListingById(db: Db, id: string) {
  const row = await one<ListingRow>(db, `${LISTING_SELECT} where c.id = $1`, [id]);
  return row ? toListing(row) : null;
}

export async function listingsByIds(db: Db, ids: string[]) {
  if (ids.length === 0) return [];
  const rows = await all<ListingRow>(db, `${LISTING_SELECT} where c.id = any($1::uuid[])`, [ids]);
  const byId = new Map(rows.map((r) => [r.id, toListing(r)]));
  return ids.map((id) => byId.get(id)).filter((l): l is Listing => Boolean(l));
}
