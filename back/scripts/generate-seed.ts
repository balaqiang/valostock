// Generates database/seed.sql from the demo data in front/src/lib/mock, so the
// UI demo data and the MySQL seed never drift apart.
// Run: npm run db:seed:gen   (then import seed.sql in phpMyAdmin or `npm run db:reset`)
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import bcrypt from 'bcryptjs';
import { games } from '../../front/src/lib/mock/games.ts';
import { stores } from '../../front/src/lib/mock/stores.ts';
import { listings } from '../../front/src/lib/mock/listings.ts';
import { promoCodes, topupProducts } from '../../front/src/lib/mock/topup.ts';
import { helpArticles } from '../../front/src/lib/mock/help.ts';

/** Password of every demo account (documented in database/README.md). */
const DEMO_PASSWORD = 'valostock-demo';
const BUYER_OPENING_BALANCE = 100_000;

type SqlValue = string | number | boolean | null | undefined | object;

function q(value: SqlValue): string {
  if (value === null || value === undefined) return 'NULL';
  if (typeof value === 'number') return String(Math.trunc(value) === value ? value : value.toFixed(2));
  if (typeof value === 'boolean') return value ? '1' : '0';
  const text = typeof value === 'string' ? value : JSON.stringify(value);
  return `'${text.replace(/\\/g, '\\\\').replace(/'/g, "''")}'`;
}

function insert(table: string, rows: Record<string, SqlValue>[]): string {
  if (rows.length === 0) return '';
  const columns = Object.keys(rows[0]!);
  const values = rows.map((row) => `  (${columns.map((column) => q(row[column])).join(', ')})`);
  return `INSERT INTO ${table} (${columns.join(', ')}) VALUES\n${values.join(',\n')};\n\n`;
}

const MONTHS: Record<string, string> = {
  Jan: '01', Feb: '02', Mar: '03', Apr: '04', Mei: '05', May: '05', Jun: '06',
  Jul: '07', Agu: '08', Aug: '08', Sep: '09', Okt: '10', Oct: '10', Nov: '11', Des: '12', Dec: '12',
};

/** "Mar 2024" → "2024-03-01 00:00:00" */
function joinedToDate(joined: string): string {
  const [month = 'Jan', year = '2025'] = joined.split(' ');
  return `${year}-${MONTHS[month] ?? '01'}-01 00:00:00`;
}

const gameId = (slug: string) => `(SELECT id FROM games WHERE slug = ${q(slug)})`;

const hash = bcrypt.hashSync(DEMO_PASSWORD, 10);

// ── Users: admin, demo buyer, one owner per store (+ one store awaiting review) ──
const OWNER_NAMES: Record<string, string> = { nusagame: 'Rizky Pratama' };
const users: Record<string, SqlValue>[] = [
  { id: 'u-admin', name: 'Admin valostock', email: 'admin@valostock.test', phone: null, password_hash: hash, role: 'ADMIN', balance: 0 },
  { id: 'u-nightfall', name: 'Nightfall', email: 'nightfall@email.com', phone: '081234567890', password_hash: hash, role: 'USER', balance: BUYER_OPENING_BALANCE },
  ...stores.map((store) => ({
    id: `u-owner-${store.slug}`,
    name: OWNER_NAMES[store.slug] ?? `Pemilik ${store.name}`,
    email: store.slug === 'nusagame' ? 'nusagame@email.com' : `${store.slug}@valostock.test`,
    phone: null,
    password_hash: hash,
    role: 'USER',
    balance: 0,
  })),
  { id: 'u-owner-pending', name: 'Dimas Saputra', email: 'tokobaru@valostock.test', phone: null, password_hash: hash, role: 'USER', balance: 0 },
];

// ── Stores (all ACTIVE except one waiting for the admin) ──
const storeRows: Record<string, SqlValue>[] = [
  ...stores.map((store) => ({
    id: `st-${store.slug}`,
    owner_id: `u-owner-${store.slug}`,
    slug: store.slug,
    name: store.name,
    type: store.type,
    level: store.level,
    status: 'ACTIVE',
    owner_legal_name: OWNER_NAMES[store.slug] ?? `Pemilik ${store.name}`,
    description: store.description,
    gradient: store.gradient,
    deposit_amount: 500_000,
    deposit_status: store.depositSecured ? 'HELD' : 'UNPAID',
    identity_verified: store.identityVerified,
    rating: store.rating,
    reviews: store.reviews,
    sold: store.sold,
    followers: store.followers,
    score_desc: store.serviceScore.descAccuracy,
    score_attitude: store.serviceScore.attitude,
    score_delivery: store.serviceScore.deliverySpeed,
    reviewed_by: 'u-admin',
    created_at: joinedToDate(store.joined),
  })),
  {
    id: 'st-tokobaru',
    owner_id: 'u-owner-pending',
    slug: 'tokobaru',
    name: 'TokoBaru',
    type: 'OWNER',
    level: 'AUTHORIZED',
    status: 'PENDING_REVIEW',
    owner_legal_name: 'Dimas Saputra',
    description: 'Toko demo yang menunggu verifikasi admin.',
    gradient: 'from-sky-500 to-indigo-600',
    deposit_amount: 500_000,
    deposit_status: 'HELD',
    identity_verified: false,
    rating: 0, reviews: 0, sold: 0, followers: 0, score_desc: 0, score_attitude: 0, score_delivery: 0,
    reviewed_by: null,
    created_at: '2026-09-20 00:00:00',
  },
];

const storeBalances = stores.map((store) => ({ store_id: `st-${store.slug}`, escrow: 0, available: 0 }));

const vouchers = stores.flatMap((store) =>
  store.vouchers.map((voucher) => ({
    id: `sv-${store.slug}-${voucher.code.toLowerCase()}`,
    store_id: `st-${store.slug}`,
    code: voucher.code,
    kind: voucher.kind,
    value: voucher.value,
    min_spend: voucher.minSpend,
  })),
);

const gameRows = games.map((game) => ({
  slug: game.slug,
  name: game.name,
  publisher: game.publisher,
  tagline: game.tagline,
  description: game.description,
  supports_account: game.supportsAccount,
  supports_topup: game.supportsTopup,
  has_skin_api: game.hasSkinApi,
  is_hot: game.isHot,
  uid_label: game.uidLabel,
  uid_hint: game.uidHint,
  uid_extra_label: game.uidExtraLabel ?? null,
  gradient: game.gradient,
  topup_currency: game.topupCurrency ?? null,
  sort_order: game.sortOrder,
}));

const knownStores = new Set(stores.map((store) => store.slug));
const catalogRows = listings
  .filter((listing) => knownStores.has(listing.storeSlug))
  .map((listing, index) => ({
    id: listing.id,
    vs_code: listing.code,
    store_id: `st-${listing.storeSlug}`,
    game_id: `@@${gameId(listing.game)}`,
    title: listing.title,
    description: null,
    price: listing.price,
    old_price: listing.oldPrice ?? null,
    status: 'LISTED',
    account_checked: listing.verified,
    instant: listing.instant,
    image: listing.image,
    images: listing.images,
    attributes: {
      rank: listing.rank,
      skins: listing.skins,
      totalVp: listing.totalVp,
      verified: listing.verified,
      rating: listing.rating,
      sold: listing.sold,
      server: listing.server,
      skinsList: listing.skinsList,
      remainingVp: listing.remainingVp,
      remainingRp: listing.remainingRp,
      remainingKc: listing.remainingKc,
      agents: listing.agents,
      battlepass: listing.battlepass,
      changeNick: listing.changeNick,
      emailStatus: listing.emailStatus,
      region: listing.region,
      premier: listing.premier,
      level: listing.level,
      episodeAct: listing.episodeAct,
      radianite: listing.radianite,
      verifiedAt: listing.verifiedAt,
    },
    sort_order: index,
  }));

const productRows = topupProducts.map((product, index) => ({
  id: product.id,
  game_id: `@@${gameId(product.gameSlug)}`,
  name: product.name,
  amount_label: product.amountLabel,
  retail_price: product.retailPrice,
  popular: product.popular ?? false,
  sort_order: index,
}));

const promoRows = promoCodes.map((promo) => ({
  code: promo.code,
  kind: promo.kind,
  value: promo.value,
  min_spend: promo.minSpend,
  label: promo.label,
}));

const helpRows = helpArticles.map((article, index) => ({
  slug: article.slug,
  title: article.title,
  category: article.category,
  excerpt: article.excerpt,
  body: article.body,
  popular: article.popular ?? false,
  sort_order: index,
}));

const ledgerRows = [
  { user_id: 'u-nightfall', type: 'ADJUSTMENT', amount: BUYER_OPENING_BALANCE, balance_after: BUYER_OPENING_BALANCE, reference: 'SEED-SALDO-AWAL' },
];

// `@@` marks a raw SQL expression (sub-select) instead of a quoted literal.
const render = (table: string, rows: Record<string, SqlValue>[]) =>
  insert(table, rows).replace(/'@@(\(SELECT id FROM games WHERE slug = ''[^']*''\))'/g, (_m, expr: string) =>
    expr.replace(/''/g, "'"),
  );

const sql = `-- =====================================================================
-- valostock.id — data demo (DIHASILKAN OTOMATIS oleh scripts/generate-seed.ts)
-- Jangan diedit manual: ubah front/src/lib/mock lalu jalankan npm run db:seed:gen.
-- Import SETELAH schema.sql. Password semua akun demo: lihat database/README.md.
-- =====================================================================

USE valostock;
SET NAMES utf8mb4;
SET time_zone = '+00:00';

${render('users', users)}${render('stores', storeRows)}${render('store_balances', storeBalances)}${render('store_vouchers', vouchers)}${render('games', gameRows)}${render('catalogs', catalogRows)}${render('topup_products', productRows)}${render('promo_codes', promoRows)}${render('help_articles', helpRows)}${render('balance_ledger', ledgerRows)}`;

const out = fileURLToPath(new URL('../database/seed.sql', import.meta.url));
writeFileSync(out, sql);
console.log(
  `seed.sql: ${users.length} users, ${storeRows.length} stores, ${gameRows.length} games, ${catalogRows.length} catalogs, ` +
    `${productRows.length} top-up products, ${promoRows.length} promos, ${helpRows.length} help articles`,
);
