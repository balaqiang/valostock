// Generates supabase/seed.sql (applied by `npx supabase db reset`) from the demo data
// in front/src/lib/mock + a few seed-only rows (MLBB catalogs, moderation examples).
// Run: npm run db:seed:gen   then   npx supabase db reset
import { createHash } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { games } from '../../front/src/lib/mock/games.ts';
import { stores } from '../../front/src/lib/mock/stores.ts';
import { listings } from '../../front/src/lib/mock/listings.ts';
import { promoCodes, topupProducts } from '../../front/src/lib/mock/topup.ts';
import { helpArticles } from '../../front/src/lib/mock/help.ts';
import { newsArticles } from '../../front/src/app/(marketplace)/news/mock-data.ts';

/** Password of every demo account (local development only, see supabase/README.md). */
const DEMO_PASSWORD = 'valostock-demo';
/** Password of the API's Postgres role (local development only). */
const API_ROLE_PASSWORD = 'valostock_api_dev';
const BUYER_OPENING_BALANCE = 100_000;

// ── helpers ──

/** Deterministic RFC-4122 v4-shaped UUID, so seed rows can reference each other. */
function sid(key: string): string {
  const h = createHash('md5').update(`valostock:${key}`).digest('hex');
  const variant = (8 + (parseInt(h[16]!, 16) & 3)).toString(16);
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-${variant}${h.slice(17, 20)}-${h.slice(20, 32)}`;
}

type Raw = { raw: string };
const raw = (sql: string): Raw => ({ raw: sql });
type Value = string | number | boolean | null | undefined | Raw | object;

function q(value: Value): string {
  if (value === null || value === undefined) return 'null';
  if (typeof value === 'object' && 'raw' in (value as Raw)) return (value as Raw).raw;
  if (typeof value === 'number') return String(value);
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'string') return `'${value.replace(/'/g, "''")}'`;
  return `'${JSON.stringify(value).replace(/'/g, "''")}'::jsonb`;
}

function insert(table: string, rows: Record<string, Value>[]): string {
  if (rows.length === 0) return '';
  const cols = Object.keys(rows[0]!);
  const values = rows.map((row) => `  (${cols.map((c) => q(row[c])).join(', ')})`);
  return `insert into public.${table} (${cols.join(', ')}) values\n${values.join(',\n')};\n\n`;
}

const textArray = (items: string[]) => raw(`array[${items.map((i) => q(i)).join(', ')}]::text[]`);
const ago = (interval: string) => raw(`now() - interval '${interval}'`);
const ahead = (interval: string) => raw(`now() + interval '${interval}'`);
const gameId = (slug: string) => raw(`(select id from public.games where slug = ${q(slug)})`);

const MONTHS: Record<string, string> = {
  Jan: '01', Feb: '02', Mar: '03', Apr: '04', Mei: '05', May: '05', Jun: '06',
  Jul: '07', Agu: '08', Aug: '08', Sep: '09', Okt: '10', Oct: '10', Nov: '11', Des: '12', Dec: '12',
};
const joinedToDate = (joined: string) => {
  const [m = 'Jan', y = '2025'] = joined.split(' ');
  return `${y}-${MONTHS[m] ?? '01'}-01T00:00:00Z`;
};

// ── users (Supabase Auth) ──

interface DemoUser {
  key: string;
  email: string;
  name: string;
  phone?: string;
  role?: 'ADMIN';
  adminRoles?: string[];
}

const OWNER_NAMES: Record<string, string> = { nusagame: 'Rizky Pratama' };
const users: DemoUser[] = [
  { key: 'admin', email: 'admin@valostock.test', name: 'Admin valostock', role: 'ADMIN', adminRoles: ['SUPER_ADMIN'] },
  { key: 'moderator', email: 'moderator@valostock.test', name: 'Moderator Katalog', role: 'ADMIN', adminRoles: ['CATALOG_MODERATOR', 'STORE_VERIFIER'] },
  { key: 'finance', email: 'finance@valostock.test', name: 'Tim Keuangan', role: 'ADMIN', adminRoles: ['FINANCE'] },
  { key: 'support', email: 'support@valostock.test', name: 'Tim Support', role: 'ADMIN', adminRoles: ['SUPPORT'] },
  { key: 'nightfall', email: 'nightfall@email.com', name: 'Nightfall', phone: '081234567890' },
  { key: 'raven', email: 'raven@email.com', name: 'raven_qz', phone: '081298765432' },
  ...stores.map((s) => ({
    key: `owner-${s.slug}`,
    email: s.slug === 'nusagame' ? 'nusagame@email.com' : `${s.slug}@valostock.test`,
    name: OWNER_NAMES[s.slug] ?? `Pemilik ${s.name}`,
  })),
  { key: 'owner-tokobaru', email: 'tokobaru@valostock.test', name: 'Dimas Saputra' },
];
const uid = (key: string) => sid(`user:${key}`);

function authUserSql(u: DemoUser): string {
  const id = uid(u.key);
  const meta = { name: u.name, phone: u.phone ?? '' };
  return `insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, email_change, email_change_token_new, recovery_token)
values ('00000000-0000-0000-0000-000000000000', ${q(id)}, 'authenticated', 'authenticated', ${q(u.email)},
  extensions.crypt(${q(DEMO_PASSWORD)}, extensions.gen_salt('bf')), now(),
  '{"provider":"email","providers":["email"]}', ${q(JSON.stringify(meta))}, now(), now(), '', '', '', '');
insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
values (gen_random_uuid(), ${q(id)}, ${q(id)},
  ${q(JSON.stringify({ sub: id, email: u.email, email_verified: true }))}::jsonb, 'email', now(), now(), now());
`;
}

// ── RBAC (docs/ADMIN_PANEL.md §2) ──

const permissions: [string, string, string][] = [
  ['dashboard:view', 'dashboard', 'Melihat dashboard'],
  ['catalogs:view', 'catalogs', 'Melihat katalog'],
  ['catalogs:moderate', 'catalogs', 'Menyetujui/menolak katalog'],
  ['catalogs:takedown', 'catalogs', 'Menurunkan katalog'],
  ['stores:view', 'stores', 'Melihat toko'],
  ['stores:verify', 'stores', 'Memverifikasi toko'],
  ['stores:suspend', 'stores', 'Menangguhkan toko'],
  ['reports:manage', 'reports', 'Menangani laporan pengguna'],
  ['orders:view', 'orders', 'Melihat pesanan'],
  ['orders:intervene', 'orders', 'Membatalkan pesanan / pesan admin di rekber'],
  ['disputes:resolve', 'disputes', 'Memutus sengketa'],
  ['payments:view', 'payments', 'Melihat pembayaran, invoice, log webhook'],
  ['finance:view', 'finance', 'Melihat laporan keuangan'],
  ['payouts:approve', 'finance', 'Menyetujui penarikan dan transfer'],
  ['ads:manage', 'ads', 'Mengelola iklan dan langganan'],
  ['master:manage', 'master', 'Mengelola game, template kolom, produk top-up, promo'],
  ['content:manage', 'content', 'Mengelola berita dan artikel bantuan'],
  ['users:view', 'users', 'Melihat pengguna'],
  ['users:ban', 'users', 'Memblokir/mengaktifkan pengguna'],
  ['audit:view', 'audit', 'Melihat audit log dan analitik'],
  ['rbac:manage', 'rbac', 'Mengelola admin dan peran'],
];
const allPerms = permissions.map(([key]) => key);
const roles: { key: string; name: string; perms: string[] }[] = [
  { key: 'SUPER_ADMIN', name: 'Super Admin', perms: allPerms },
  { key: 'CATALOG_MODERATOR', name: 'Moderator Katalog', perms: ['dashboard:view', 'catalogs:view', 'catalogs:moderate', 'catalogs:takedown', 'stores:view', 'reports:manage'] },
  { key: 'STORE_VERIFIER', name: 'Verifikator Toko', perms: ['dashboard:view', 'stores:view', 'stores:verify', 'stores:suspend', 'catalogs:view', 'users:view'] },
  { key: 'FINANCE', name: 'Keuangan', perms: ['dashboard:view', 'finance:view', 'payouts:approve', 'payments:view', 'orders:view', 'ads:manage'] },
  { key: 'SUPPORT', name: 'Support & Sengketa', perms: ['dashboard:view', 'orders:view', 'orders:intervene', 'disputes:resolve', 'reports:manage', 'users:view', 'payments:view'] },
  { key: 'CONTENT_EDITOR', name: 'Editor Konten', perms: ['dashboard:view', 'content:manage', 'master:manage'] },
];
const roleId = (key: string) => sid(`role:${key}`);

// ── games & field templates ──

const VALORANT_RANKS = ['Iron', 'Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond', 'Ascendant', 'Immortal']
  .flatMap((tier) => [1, 2, 3].map((n) => `${tier} ${n}`))
  .concat('Radiant');
const MLBB_RANKS = ['Warrior', 'Elite', 'Master', 'Grandmaster', 'Epic', 'Legend', 'Mythic', 'Mythical Honor', 'Mythical Glory', 'Mythical Immortal'];

type Template = { key: string; label: string; type: 'TEXT' | 'NUMBER' | 'SELECT' | 'TAGS'; required?: boolean; options?: string[]; filterable?: boolean; help?: string };
const templates: Record<string, Template[]> = {
  valorant: [
    { key: 'rank', label: 'Rank', type: 'SELECT', required: true, options: VALORANT_RANKS, filterable: true },
    { key: 'level', label: 'Account Level', type: 'NUMBER', required: true },
    { key: 'server', label: 'Server', type: 'SELECT', required: true, options: ['Indonesia', 'Asia Pacific', 'Singapore', 'Malaysia', 'Philippines'], filterable: true },
    { key: 'region', label: 'Region', type: 'TEXT', help: 'Kode region akun, mis. IDN' },
    { key: 'skins', label: 'Jumlah Skin', type: 'NUMBER', required: true, filterable: true },
    { key: 'totalVp', label: 'Total VP Terpakai', type: 'NUMBER' },
    { key: 'remainingVp', label: 'Sisa VP', type: 'NUMBER' },
    { key: 'agents', label: 'Agent Terbuka', type: 'TEXT', help: 'mis. FULL atau 18 Agent' },
    { key: 'skinsList', label: 'Skin Unggulan', type: 'TAGS', help: 'Pisahkan dengan koma' },
    { key: 'emailStatus', label: 'Status Email', type: 'TEXT', help: 'mis. Terverifikasi — bisa diganti' },
  ],
  'mobile-legends': [
    { key: 'rank', label: 'Rank Tertinggi', type: 'SELECT', required: true, options: MLBB_RANKS, filterable: true },
    { key: 'level', label: 'Level Akun', type: 'NUMBER', required: true },
    { key: 'server', label: 'Server', type: 'SELECT', required: true, options: ['Indonesia', 'Malaysia', 'Singapore', 'Philippines'], filterable: true },
    { key: 'heroCount', label: 'Jumlah Hero', type: 'NUMBER', required: true, filterable: true },
    { key: 'skins', label: 'Jumlah Skin', type: 'NUMBER', required: true, filterable: true },
    { key: 'skinsList', label: 'Skin Unggulan', type: 'TAGS', help: 'Pisahkan dengan koma' },
    { key: 'emailStatus', label: 'Status Login', type: 'TEXT', help: 'mis. Moonton + Google, bisa diganti' },
  ],
};

// ── stores & catalogs ──

const storeId = (slug: string) => sid(`store:${slug}`);
const catalogId = (key: string) => sid(`catalog:${key}`);
const imageRows: Record<string, Value>[] = [];
const reviewRows: Record<string, Value>[] = [];
const catalogRows: Record<string, Value>[] = [];

function addCatalog(c: {
  key: string; store: string; game: string; vs: string | null; title: string; description: string; price: number;
  oldPrice?: number; status: 'LISTED' | 'PENDING_REVIEW' | 'REJECTED'; attributes: Record<string, unknown>;
  checked: boolean; instant: boolean; images: string[]; reject?: { reasons: string[]; note: string };
}) {
  const id = catalogId(c.key);
  catalogRows.push({
    id, vs_code: c.vs, store_id: storeId(c.store), game_id: gameId(c.game), title: c.title, description: c.description,
    price: c.price, old_price: c.oldPrice ?? null, status: c.status, attributes: c.attributes,
    account_checked: c.checked, instant: c.instant, review_note: c.reject?.note ?? null,
    submitted_at: ago('3 days'), listed_at: c.status === 'LISTED' ? ago('2 days') : null, sort_order: catalogRows.length,
  });
  c.images.forEach((path, i) => imageRows.push({ catalog_id: id, storage_path: path, sort_order: i }));
  const owner = uid(`owner-${c.store}`);
  reviewRows.push({ catalog_id: id, actor_id: owner, decision: 'SUBMITTED', reasons: textArray([]), note: null, created_at: ago('3 days') });
  if (c.status === 'LISTED') {
    reviewRows.push({ catalog_id: id, actor_id: uid('moderator'), decision: 'APPROVED', reasons: textArray([]), note: 'Foto dan atribut sesuai.', created_at: ago('2 days') });
  }
  if (c.status === 'REJECTED' && c.reject) {
    reviewRows.push({ catalog_id: id, actor_id: uid('moderator'), decision: 'REJECTED', reasons: textArray(c.reject.reasons), note: c.reject.note, created_at: ago('2 days') });
  }
}

const knownStores = new Set(stores.map((s) => s.slug));
for (const l of listings.filter((item) => knownStores.has(item.storeSlug))) {
  addCatalog({
    key: l.id, store: l.storeSlug, game: l.game, vs: `VS${l.code}`, title: l.title,
    description: `Akun ${l.rank} server ${l.server}, ${l.skins} skin (${l.totalVp.toLocaleString('id-ID')} VP). Email ${l.emailStatus.toLowerCase()}. Serah terima lewat Rekber Room.`,
    price: l.price, oldPrice: l.oldPrice, status: 'LISTED',
    attributes: {
      rank: l.rank, level: l.level, server: l.server, region: l.region, skins: l.skins, totalVp: l.totalVp,
      remainingVp: l.remainingVp, agents: l.agents, skinsList: l.skinsList, emailStatus: l.emailStatus,
      remainingRp: l.remainingRp, remainingKc: l.remainingKc, battlepass: l.battlepass, changeNick: l.changeNick,
      premier: l.premier, episodeAct: l.episodeAct, radianite: l.radianite, verifiedAt: l.verifiedAt,
    },
    checked: l.verified, instant: l.instant, images: l.images.length > 0 ? l.images : [l.image],
  });
}

// Seed-only catalogs: Mobile Legends + moderation examples (pending / rejected).
addCatalog({
  key: 'ml-001', store: 'gudangakun', game: 'mobile-legends', vs: 'VSML001',
  title: 'Akun MLBB Mythical Glory — 112 Hero, 245 Skin', price: 1_850_000, status: 'LISTED', checked: true, instant: false,
  description: 'Rank tertinggi Mythical Glory season lalu, 112 hero, 245 skin termasuk 6 skin Legend. Login Moonton + Google, bisa diganti.',
  attributes: { rank: 'Mythical Glory', level: 102, server: 'Indonesia', heroCount: 112, skins: 245, skinsList: ['Gusion Cosmic Gleam', 'Alucard Obsidian Blade', 'Fanny Skylark'], emailStatus: 'Moonton + Google, bisa diganti' },
  images: ['/images/games/mobile-legends-1.png'],
});
addCatalog({
  key: 'ml-002', store: 'skyvault', game: 'mobile-legends', vs: 'VSML002',
  title: 'Akun MLBB Mythic — Skin Collector 180 Skin', price: 950_000, status: 'LISTED', checked: false, instant: true,
  description: 'Akun kolektor skin, 98 hero, starlight aktif bulan ini. Cocok untuk main santai.',
  attributes: { rank: 'Mythic', level: 88, server: 'Indonesia', heroCount: 98, skins: 180, skinsList: ['Chou Street Fighter', 'Lesley Cyber Spectacle'], emailStatus: 'Moonton, bisa diganti' },
  images: ['/images/games/mobile-legends-2.png'],
});
addCatalog({
  key: 'ml-003', store: 'nusagame', game: 'mobile-legends', vs: 'VSML003',
  title: 'Akun MLBB Legend — 85 Hero, Starlight Aktif', price: 420_000, status: 'PENDING_REVIEW', checked: false, instant: false,
  description: 'Akun Legend V, 85 hero, 120 skin, starlight aktif. Menunggu verifikasi admin.',
  attributes: { rank: 'Legend', level: 71, server: 'Indonesia', heroCount: 85, skins: 120, skinsList: ['Layla Blue Spectrum'], emailStatus: 'Moonton, bisa diganti' },
  images: ['/images/games/mobile-legends-3.png'],
});
addCatalog({
  key: 'vl-pending', store: 'verdantshop', game: 'valorant', vs: 'VSDMD20',
  title: 'Akun Valorant Diamond 2 — Reaver Vandal & Prime Phantom', price: 1_250_000, status: 'PENDING_REVIEW', checked: false, instant: false,
  description: 'Diamond 2, 34 skin termasuk Reaver Vandal dan Prime Phantom. Email bisa diganti.',
  attributes: { rank: 'Diamond 2', level: 140, server: 'Indonesia', skins: 34, totalVp: 21_000, remainingVp: 120, agents: 'FULL', skinsList: ['Reaver Vandal', 'Prime Phantom'], emailStatus: 'Terverifikasi — bisa diganti' },
  images: ['/images/products/5.jpeg'],
});
addCatalog({
  key: 'vl-rejected', store: 'astralstore', game: 'valorant', vs: 'VSIMR01',
  title: 'Akun Valorant Immortal 1 — chat WA untuk nego harga', price: 3_100_000, status: 'REJECTED', checked: false, instant: false,
  description: 'Hubungi WhatsApp kami untuk harga spesial.',
  attributes: { rank: 'Immortal 1', level: 210, server: 'Indonesia', skins: 60, agents: 'FULL', skinsList: [], emailStatus: 'Terverifikasi' },
  images: ['/images/products/6.jpeg'],
  reject: { reasons: ['Mencantumkan kontak/link di luar platform'], note: 'Hapus ajakan menghubungi WhatsApp dari judul dan deskripsi — semua negosiasi lewat fitur Tawar.' },
});

// ── assemble ──

const storeRows = [
  ...stores.map((s) => ({
    id: storeId(s.slug), owner_id: uid(`owner-${s.slug}`), slug: s.slug, name: s.name, type: s.type, level: s.level,
    status: 'ACTIVE', owner_legal_name: OWNER_NAMES[s.slug] ?? `Pemilik ${s.name}`, description: s.description,
    gradient: s.gradient, deposit_amount: 500_000, deposit_status: 'HELD', identity_verified: true,
    rating: s.rating, reviews: s.reviews, sold: s.sold, followers: s.followers,
    score_desc: s.serviceScore.descAccuracy, score_attitude: s.serviceScore.attitude, score_delivery: s.serviceScore.deliverySpeed,
    reviewed_by: uid('moderator'), reviewed_at: raw(`'${joinedToDate(s.joined)}'::timestamptz + interval '1 day'`),
    created_at: raw(`'${joinedToDate(s.joined)}'::timestamptz`),
  })),
  {
    id: storeId('tokobaru'), owner_id: uid('owner-tokobaru'), slug: 'tokobaru', name: 'TokoBaru', type: 'OWNER', level: 'AUTHORIZED',
    status: 'PENDING_REVIEW', owner_legal_name: 'Dimas Saputra', description: 'Toko demo yang menunggu verifikasi admin.',
    gradient: 'from-sky-500 to-indigo-600', deposit_amount: 500_000, deposit_status: 'HELD', identity_verified: false,
    rating: 0, reviews: 0, sold: 0, followers: 0, score_desc: 0, score_attitude: 0, score_delivery: 0,
    reviewed_by: null, reviewed_at: null, created_at: ago('1 day'),
  },
];

const subscriptionRows = storeRows.map((s) =>
  s.slug === 'nusagame'
    ? { store_id: s.id, tier: 'PRO', commission_rate: 0.045, max_listings: 60, free_featured_slots: 2, current_period_end: ahead('30 days') }
    : { store_id: s.id, tier: 'FREE', commission_rate: 0.05, max_listings: 15, free_featured_slots: 0, current_period_end: null },
);
const balanceRows = stores.map((s) => ({ store_id: storeId(s.slug), escrow: 0, available: 0 }));

const voucherRows = stores.flatMap((s) =>
  s.vouchers.map((v) => ({ store_id: storeId(s.slug), code: v.code, kind: v.kind, value: v.value, min_spend: v.minSpend, quota: 100, expires_at: ahead('60 days') })),
);

const nusaListed = listings.filter((l) => l.storeSlug === 'nusagame');
const flashRows = nusaListed.slice(0, 1).map((l) => ({
  store_id: storeId('nusagame'), catalog_id: catalogId(l.id), sale_price: Math.round((l.price * 0.9) / 1000) * 1000,
  starts_at: ago('1 hour'), ends_at: ahead('3 days'),
}));
const bundleItems = nusaListed.slice(1, 3);
const bundleRows = bundleItems.length === 2
  ? [{ id: sid('bundle:nusa-duo'), store_id: storeId('nusagame'), title: 'Paket Duo Valorant NusaGame', bundle_price: Math.round((bundleItems.reduce((t, l) => t + l.price, 0) * 0.9) / 1000) * 1000, status: 'ACTIVE' }]
  : [];
const bundleItemRows = bundleRows.length ? bundleItems.map((l) => ({ bundle_id: sid('bundle:nusa-duo'), catalog_id: catalogId(l.id) })) : [];
const astral = listings.find((l) => l.storeSlug === 'astralstore');
const featuredRows = astral
  ? [{ store_id: storeId('astralstore'), catalog_id: catalogId(astral.id), duration_days: 7, price: 0, is_free: true, status: 'ACTIVE', starts_at: ago('1 day'), ends_at: ahead('6 days') }]
  : [];

const gameRows = games.map((g) => ({
  slug: g.slug, name: g.name, publisher: g.publisher, tagline: g.tagline, description: g.description,
  supports_account: g.supportsAccount, supports_topup: g.supportsTopup, has_skin_api: g.hasSkinApi, is_hot: g.isHot,
  uid_label: g.uidLabel, uid_hint: g.uidHint, uid_extra_label: g.uidExtraLabel ?? null, gradient: g.gradient,
  topup_currency: g.topupCurrency ?? null, sort_order: g.sortOrder,
}));
const templateRows = Object.entries(templates).flatMap(([slug, list]) =>
  list.map((t, i) => ({
    game_id: gameId(slug), key: t.key, label: t.label, type: t.type, required: t.required ?? false,
    options: t.options ?? null, filterable: t.filterable ?? false, help_text: t.help ?? null, sort_order: i,
  })),
);
const productRows = topupProducts.map((p, i) => ({
  id: p.id, game_id: gameId(p.gameSlug), name: p.name, amount_label: p.amountLabel, retail_price: p.retailPrice, popular: p.popular ?? false, sort_order: i,
}));
const promoRows = promoCodes.map((p) => ({ code: p.code, kind: p.kind, value: p.value, min_spend: p.minSpend, label: p.label, quota: 1000 }));
const helpRows = helpArticles.map((a, i) => ({ slug: a.slug, title: a.title, category: a.category, excerpt: a.excerpt, body: a.body, popular: a.popular ?? false, sort_order: i }));
const newsRows = newsArticles.map((a) => ({
  slug: a.slug, title: a.title, category: a.category, excerpt: a.excerpt, cover: a.cover, body: a.body, status: 'PUBLISHED',
  author_id: uid('admin'), published_at: raw(`'${a.date}T03:00:00Z'::timestamptz`), created_at: raw(`'${a.date}T03:00:00Z'::timestamptz`),
}));

const profileUpdates = users
  .map((u) => {
    const sets = [u.role ? `role = 'ADMIN'` : null, u.key === 'nightfall' ? `referral_code = 'NIGHTFALL10'` : null].filter(Boolean);
    return sets.length ? `update public.profiles set ${sets.join(', ')} where id = ${q(uid(u.key))};\n` : '';
  })
  .join('');

const sql = `-- =====================================================================
-- valostock.id — demo data (GENERATED by back/scripts/generate-seed.ts — do not edit by hand)
-- Applied by \`npx supabase db reset\` after supabase/migrations. Local development only.
-- Demo password for every account: see supabase/README.md.
-- =====================================================================

-- Password of the API's own Postgres role (local only).
alter role valostock_api with password ${q(API_ROLE_PASSWORD)};

-- ── Supabase Auth users (the on_auth_user_created trigger creates public.profiles) ──
${users.map(authUserSql).join('\n')}
${profileUpdates}
-- ── RBAC ──
${insert('permissions', permissions.map(([key, module, description]) => ({ key, module, description })))}${insert('admin_roles', roles.map((r) => ({ id: roleId(r.key), key: r.key, name: r.name })))}${insert('role_permissions', roles.flatMap((r) => r.perms.map((p) => ({ role_id: roleId(r.key), permission_key: p }))))}${insert('admin_user_roles', users.flatMap((u) => (u.adminRoles ?? []).map((r) => ({ user_id: uid(u.key), role_id: roleId(r), assigned_by: uid('admin') }))))}
-- ── Games & catalogs ──
${insert('games', gameRows)}${insert('game_field_templates', templateRows)}${insert('stores', storeRows)}${insert('store_subscriptions', subscriptionRows)}${insert('store_balances', balanceRows)}${insert('catalogs', catalogRows)}${insert('catalog_images', imageRows)}${insert('catalog_reviews', reviewRows)}
-- ── Promotions ──
${insert('store_vouchers', voucherRows)}${insert('flash_sales', flashRows)}${insert('bundles', bundleRows)}${insert('bundle_items', bundleItemRows)}${insert('featured_listings', featuredRows)}
-- ── Top-up, content ──
${insert('topup_products', productRows)}${insert('promo_codes', promoRows)}${insert('help_articles', helpRows)}${insert('news_articles', newsRows)}
-- ── Opening Balance for the demo buyer (with its ledger row) ──
update public.profiles set balance = ${BUYER_OPENING_BALANCE} where id = ${q(uid('nightfall'))};
${insert('balance_ledger', [{ user_id: uid('nightfall'), type: 'ADJUSTMENT', amount: BUYER_OPENING_BALANCE, balance_after: BUYER_OPENING_BALANCE, reference: 'SEED-SALDO-AWAL' }])}`;

const out = fileURLToPath(new URL('../../supabase/seed.sql', import.meta.url));
writeFileSync(out, sql);
console.log(
  `supabase/seed.sql: ${users.length} users, ${roles.length} roles, ${storeRows.length} stores, ${gameRows.length} games, ` +
    `${templateRows.length} field templates, ${catalogRows.length} catalogs, ${productRows.length} top-up products, ` +
    `${helpRows.length} help + ${newsRows.length} news articles`,
);
