// Store catalogs + admin moderation (DFD 3.0; docs/ARCHITECTURE.md §5.1):
// DRAFT → PENDING_REVIEW (VS code, plan quota) → LISTED / REJECTED (admin, with reasons).
// Editing a LISTED catalog's title/price/photos/attributes sends it back to review.
import { all, json, one, pool, run, withTransaction, type Tx } from '../../db/pool.js';
import { audit } from '../../lib/audit.js';
import { badRequest, conflict, notFound } from '../../lib/errors.js';
import { vsCode } from '../../lib/ids.js';
import { notify, notifyStore } from '../../lib/notify.js';
import type { AuthUser } from '../../middlewares/auth.js';
import { catalogImageUrl, PRIVATE_BUCKET, PUBLIC_BUCKET, removeObjects, signedUrls, uploadObject } from '../../supabase/storage.js';
import { findListingById, LISTING_SELECT, toListing, type ListingRow } from '../public/listings.js';
import { findGameRow, templatesForGame, type FieldTemplate } from '../public/public.repository.js';
import type { OwnStore } from '../store/store.context.js';

export const MAX_IMAGES = 10;
const IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
const MEDIA_TYPES = [...IMAGE_TYPES, 'video/mp4', 'application/pdf'];

/** Statuses a store may edit. LOCKED / IN_ORDER / SOLD are frozen by a transaction. */
const EDITABLE = new Set(['DRAFT', 'PENDING_REVIEW', 'REJECTED', 'LISTED', 'DELISTED']);
/** Statuses that count against the plan's active-listing quota. */
const ACTIVE_STATUSES = ['PENDING_REVIEW', 'LISTED', 'LOCKED', 'IN_ORDER'];

/** docs/ADMIN_PANEL.md §3.2 — rejection / takedown reason templates. */
export const REJECTION_REASONS = [
  'Foto tidak jelas atau bukan milik akun tersebut',
  'Data atribut (rank/level/skin) tidak sesuai foto',
  'Judul/deskripsi menyesatkan atau memakai klaim mutlak',
  'Harga tidak wajar',
  'Mencantumkan kontak/link di luar platform',
  'Kategori/game salah',
  'Duplikat katalog lain (akun yang sama)',
  'Lainnya',
] as const;

// ── Attribute validation against the game's field templates ──

/**
 * Keeps only template keys, coerces types, and (for submission) enforces
 * required fields. Unknown keys are dropped so stores can't inject data.
 */
export function validateAttributes(templates: FieldTemplate[], raw: Record<string, unknown>, requireAll: boolean) {
  const clean: Record<string, string | number | string[]> = {};
  for (const t of templates) {
    const value = raw[t.key];
    const empty = value === undefined || value === null || value === '' || (Array.isArray(value) && value.length === 0);
    if (empty) {
      if (requireAll && t.required) throw badRequest(`${t.label} wajib diisi.`, 'ATTR_REQUIRED');
      continue;
    }
    switch (t.type) {
      case 'NUMBER': {
        const n = typeof value === 'number' ? value : Number(String(value).replace(/[.,\s]/g, ''));
        if (!Number.isFinite(n) || n < 0 || n > 1_000_000_000) throw badRequest(`${t.label} harus berupa angka.`, 'ATTR_INVALID');
        clean[t.key] = Math.round(n);
        break;
      }
      case 'SELECT': {
        const s = String(value).trim();
        if (t.options.length > 0 && !t.options.includes(s)) throw badRequest(`${t.label}: pilihan tidak valid.`, 'ATTR_INVALID');
        clean[t.key] = s;
        break;
      }
      case 'TAGS': {
        const list = (Array.isArray(value) ? value : String(value).split(/[\n,]/))
          .map((v) => String(v).trim())
          .filter(Boolean);
        if (list.length > 300 || list.some((v) => v.length > 80)) throw badRequest(`${t.label}: maksimal 300 item, masing-masing 80 karakter.`);
        clean[t.key] = [...new Set(list)];
        break;
      }
      case 'TEXT': {
        const s = String(value).trim();
        if (s.length > 200) throw badRequest(`${t.label}: maksimal 200 karakter.`, 'ATTR_INVALID');
        clean[t.key] = s;
        break;
      }
    }
  }
  return clean;
}

/** Contact details / off-platform links are not allowed in listings (zero tolerance). */
export function assertNoContact(...texts: (string | undefined)[]) {
  const joined = texts.filter(Boolean).join(' ');
  if (/(wa\.me|whatsapp|t\.me|telegram|discord\.gg|line\.me|(\+62|08)\d{8,12})/i.test(joined)) {
    throw badRequest('Jangan mencantumkan kontak atau link di luar platform. Semua transaksi & negosiasi lewat valostock.', 'OFF_PLATFORM');
  }
}

// ── Queries ──

interface CatalogRow {
  id: string;
  store_id: string;
  game_id: number;
  vs_code: string | null;
  title: string;
  description: string | null;
  price: number;
  status: string;
  attributes: Record<string, unknown>;
  listed_at: string | null;
}

async function lockOwnCatalog(tx: Tx, store: OwnStore, id: string) {
  const row = await one<CatalogRow>(tx, 'select * from catalogs where id = $1 and store_id = $2 for update', [id, store.id]);
  if (!row) throw notFound('Katalog');
  return row;
}

export async function listStoreCatalogs(store: OwnStore, status?: string) {
  const rows = await all<ListingRow>(
    pool,
    `${LISTING_SELECT} where c.store_id = $1 and ($2::catalog_status is null or c.status = $2) order by c.updated_at desc`,
    [store.id, status ?? null],
  );
  return rows.map(toListing);
}

interface ReviewRow {
  id: string;
  decision: string;
  reasons: string[];
  note: string | null;
  created_at: string;
  actor_name: string;
  actor_role: string;
}

export async function reviewHistory(catalogId: string) {
  const rows = await all<ReviewRow>(
    pool,
    `select r.id, r.decision, r.reasons, r.note, r.created_at, p.name as actor_name, p.role as actor_role
     from catalog_reviews r join profiles p on p.id = r.actor_id where r.catalog_id = $1 order by r.created_at desc`,
    [catalogId],
  );
  return rows.map((r) => ({
    id: r.id,
    decision: r.decision,
    reasons: r.reasons,
    note: r.note,
    date: r.created_at,
    actor: r.actor_role === 'ADMIN' ? `Admin (${r.actor_name})` : r.actor_name,
  }));
}

export async function inspectionOf(catalogId: string) {
  const row = await one<{ checklist: Record<string, boolean>; media: string[]; notes: string | null; result: string; created_at: string }>(
    pool,
    'select checklist, media, notes, result, created_at from account_inspections where catalog_id = $1',
    [catalogId],
  );
  if (!row) return null;
  return { checklist: row.checklist, notes: row.notes, result: row.result, date: row.created_at, media: await signedUrls(row.media) };
}

/** Full detail for the owner or an admin: listing + templates + history + inspection. */
export async function catalogDetail(catalogId: string) {
  const listing = await findListingById(pool, catalogId);
  if (!listing) throw notFound('Katalog');
  const game = await findGameRow(pool, listing.game);
  const imageRows = await all<{ id: string; storage_path: string }>(
    pool,
    'select id, storage_path from catalog_images where catalog_id = $1 order by sort_order, created_at',
    [catalogId],
  );
  const [fields, reviews, inspection] = await Promise.all([
    game ? templatesForGame(pool, game.id) : Promise.resolve([]),
    reviewHistory(catalogId),
    inspectionOf(catalogId),
  ]);
  return {
    listing,
    imageItems: imageRows.map((r) => ({ id: r.id, url: catalogImageUrl(r.storage_path) })),
    fields,
    reviews,
    inspection,
    submitCount: reviews.filter((r) => r.decision === 'SUBMITTED').length,
  };
}

// ── Store actions ──

export interface CatalogInput {
  gameSlug: string;
  title: string;
  description?: string;
  price: number;
  oldPrice?: number | null;
  instant?: boolean;
  attributes?: Record<string, unknown>;
}

async function gameFor(slug: string) {
  const game = await findGameRow(pool, slug);
  if (!game || !game.is_active || !game.supports_account) throw badRequest('Game tidak tersedia untuk jual akun.', 'BAD_GAME');
  return { game, templates: await templatesForGame(pool, game.id) };
}

export async function createCatalog(store: OwnStore, input: CatalogInput) {
  if (['REJECTED', 'SUSPENDED', 'CLOSING', 'CLOSED'].includes(store.status)) throw conflict('Toko tidak bisa menambah katalog saat ini.', 'STORE_BLOCKED');
  assertNoContact(input.title, input.description);
  const { game, templates } = await gameFor(input.gameSlug);
  const attributes = validateAttributes(templates, input.attributes ?? {}, false);
  const row = await one<{ id: string }>(
    pool,
    `insert into catalogs (store_id, game_id, title, description, price, old_price, instant, attributes)
     values ($1, $2, $3, $4, $5, $6, $7, $8) returning id`,
    [store.id, game.id, input.title, input.description ?? null, input.price, input.oldPrice ?? null, input.instant ?? false, json(attributes)],
  );
  return catalogDetail(row!.id);
}

/** Saves changes. A LISTED catalog whose title/price/photos/attributes change goes back to PENDING_REVIEW. */
export async function updateCatalog(user: AuthUser, store: OwnStore, id: string, input: Partial<CatalogInput>) {
  assertNoContact(input.title, input.description);
  await withTransaction(async (tx) => {
    const current = await lockOwnCatalog(tx, store, id);
    if (!EDITABLE.has(current.status)) throw conflict('Katalog sedang dalam transaksi atau sudah terjual.', 'CATALOG_FROZEN');
    let gameId = current.game_id;
    if (input.gameSlug) {
      const { game } = await gameFor(input.gameSlug);
      if (game.id !== current.game_id && current.status !== 'DRAFT') throw conflict('Game hanya bisa diganti saat masih draf.');
      gameId = game.id;
    }
    const templates = await templatesForGame(tx, gameId);
    const strict = current.status === 'LISTED' || current.status === 'PENDING_REVIEW';
    const attributes =
      input.attributes !== undefined ? validateAttributes(templates, input.attributes, strict) : (current.attributes as Record<string, unknown>);

    const next = {
      title: input.title ?? current.title,
      description: input.description !== undefined ? input.description || null : current.description,
      price: input.price ?? current.price,
    };
    const keyChanged =
      next.title !== current.title ||
      next.description !== current.description ||
      next.price !== current.price ||
      JSON.stringify(attributes) !== JSON.stringify(current.attributes);

    await run(
      tx,
      `update catalogs set game_id = $1, title = $2, description = $3, price = $4,
         old_price = case when $5::boolean then $6 else old_price end,
         instant = coalesce($7, instant), attributes = $8
       where id = $9`,
      [
        gameId,
        next.title,
        next.description,
        next.price,
        input.oldPrice !== undefined,
        input.oldPrice ?? null,
        input.instant ?? null,
        json(attributes),
        id,
      ],
    );
    if (current.status === 'LISTED' && keyChanged) await backToReview(tx, user, id, 'Diubah setelah tayang (judul/harga/deskripsi/atribut).');
  });
  return catalogDetail(id);
}

async function backToReview(tx: Tx, user: AuthUser, catalogId: string, note: string) {
  await run(tx, `update catalogs set status = 'PENDING_REVIEW', submitted_at = now() where id = $1`, [catalogId]);
  await run(tx, `insert into catalog_reviews (catalog_id, actor_id, decision, note) values ($1, $2, 'SUBMITTED', $3)`, [catalogId, user.id, note]);
}

export async function addImages(user: AuthUser, store: OwnStore, id: string, files: { buffer: Buffer }[]) {
  if (files.length === 0) throw badRequest('Pilih minimal satu foto.');
  const current = await one<CatalogRow>(pool, 'select * from catalogs where id = $1 and store_id = $2', [id, store.id]);
  if (!current) throw notFound('Katalog');
  if (!EDITABLE.has(current.status)) throw conflict('Katalog sedang dalam transaksi atau sudah terjual.', 'CATALOG_FROZEN');
  const count = await one<{ n: number }>(pool, 'select count(*)::int as n from catalog_images where catalog_id = $1', [id]);
  if ((count?.n ?? 0) + files.length > MAX_IMAGES) throw badRequest(`Maksimal ${MAX_IMAGES} foto per katalog.`);

  // Upload first (outside the DB transaction), then record; clean up on failure.
  const paths: string[] = [];
  try {
    for (const file of files) paths.push(await uploadObject(PUBLIC_BUCKET, `${store.id}/${id}`, file, IMAGE_TYPES));
    await withTransaction(async (tx) => {
      const locked = await lockOwnCatalog(tx, store, id);
      const start = (await one<{ m: number }>(tx, 'select coalesce(max(sort_order), -1)::int as m from catalog_images where catalog_id = $1', [id]))!.m;
      for (const [i, path] of paths.entries()) {
        await run(tx, 'insert into catalog_images (catalog_id, storage_path, sort_order) values ($1, $2, $3)', [id, path, start + 1 + i]);
      }
      if (locked.status === 'LISTED') await backToReview(tx, user, id, 'Foto ditambahkan setelah tayang.');
    });
  } catch (error) {
    await removeObjects(PUBLIC_BUCKET, paths).catch(() => undefined);
    throw error;
  }
  return catalogDetail(id);
}

export async function removeImage(user: AuthUser, store: OwnStore, id: string, imageId: string) {
  const path = await withTransaction(async (tx) => {
    const locked = await lockOwnCatalog(tx, store, id);
    if (!EDITABLE.has(locked.status)) throw conflict('Katalog sedang dalam transaksi atau sudah terjual.', 'CATALOG_FROZEN');
    const image = await one<{ storage_path: string }>(tx, 'delete from catalog_images where id = $1 and catalog_id = $2 returning storage_path', [
      imageId,
      id,
    ]);
    if (!image) throw notFound('Foto');
    if (locked.status === 'LISTED') await backToReview(tx, user, id, 'Foto dihapus setelah tayang.');
    return image.storage_path;
  });
  if (!path.startsWith('/')) await removeObjects(PUBLIC_BUCKET, [path]).catch(() => undefined);
  return catalogDetail(id);
}

/** Store submits for review: VS code issued once, required attributes, ≥ 1 photo, plan quota. */
export async function submitCatalog(user: AuthUser, store: OwnStore, id: string) {
  if (store.status !== 'ACTIVE') throw conflict('Toko harus sudah diverifikasi admin sebelum mengajukan katalog.', 'STORE_NOT_ACTIVE');
  await withTransaction(async (tx) => {
    const current = await lockOwnCatalog(tx, store, id);
    if (!['DRAFT', 'REJECTED', 'DELISTED'].includes(current.status)) throw conflict('Katalog ini tidak bisa diajukan dari status sekarang.', 'BAD_STATE');
    assertNoContact(current.title, current.description ?? undefined);
    validateAttributes(await templatesForGame(tx, current.game_id), current.attributes, true);
    const images = await one<{ n: number }>(tx, 'select count(*)::int as n from catalog_images where catalog_id = $1', [id]);
    if (!images?.n) throw badRequest('Tambahkan minimal satu foto akun sebelum mengajukan.', 'NO_IMAGE');

    const plan = await one<{ max_listings: number | null; tier: string }>(tx, 'select max_listings, tier from store_subscriptions where store_id = $1', [
      store.id,
    ]);
    if (plan?.max_listings != null) {
      const active = await one<{ n: number }>(
        tx,
        'select count(*)::int as n from catalogs where store_id = $1 and status = any($2::catalog_status[])',
        [store.id, ACTIVE_STATUSES],
      );
      if ((active?.n ?? 0) >= plan.max_listings) {
        throw conflict(`Batas katalog aktif paket ${plan.tier} (${plan.max_listings}) tercapai. Upgrade langganan atau turunkan katalog lain.`, 'QUOTA');
      }
    }

    let code = current.vs_code;
    for (let attempt = 0; !code && attempt < 5; attempt += 1) {
      const candidate = vsCode();
      if (!(await one(tx, 'select 1 from catalogs where vs_code = $1', [candidate]))) code = candidate;
    }
    if (!code) throw conflict('Gagal membuat VS code, coba lagi.');
    await run(tx, `update catalogs set vs_code = $1, status = 'PENDING_REVIEW', submitted_at = now() where id = $2`, [code, id]);
    await run(tx, `insert into catalog_reviews (catalog_id, actor_id, decision, note) values ($1, $2, 'SUBMITTED', $3)`, [
      id,
      user.id,
      current.status === 'DRAFT' ? null : 'Diajukan ulang setelah diperbaiki.',
    ]);
  });
  return catalogDetail(id);
}

/** Store hides its own LISTED catalog, or withdraws a pending submission back to draft. */
export async function withdrawCatalog(store: OwnStore, id: string) {
  await withTransaction(async (tx) => {
    const current = await lockOwnCatalog(tx, store, id);
    if (current.status === 'LISTED') {
      await run(tx, `update catalogs set status = 'DELISTED', review_note = 'Disembunyikan oleh toko.' where id = $1`, [id]);
      await run(tx, `update featured_listings set status = 'STOPPED', stop_reason = 'Katalog disembunyikan' where catalog_id = $1 and status = 'ACTIVE'`, [id]);
    } else if (current.status === 'PENDING_REVIEW') {
      await run(tx, `update catalogs set status = 'DRAFT' where id = $1`, [id]);
    } else {
      throw conflict('Hanya katalog aktif atau yang menunggu tinjauan yang bisa ditarik.', 'BAD_STATE');
    }
  });
  return catalogDetail(id);
}

/** Delete a catalog that was never submitted (no VS code yet). */
export async function deleteDraft(store: OwnStore, id: string) {
  const paths = await withTransaction(async (tx) => {
    const current = await lockOwnCatalog(tx, store, id);
    if (current.status !== 'DRAFT' || current.vs_code) throw conflict('Hanya draf yang belum pernah diajukan yang bisa dihapus.', 'BAD_STATE');
    const images = await all<{ storage_path: string }>(tx, 'select storage_path from catalog_images where catalog_id = $1', [id]);
    await run(tx, 'delete from catalogs where id = $1', [id]);
    return images.map((i) => i.storage_path).filter((p) => !p.startsWith('/'));
  });
  await removeObjects(PUBLIC_BUCKET, paths).catch(() => undefined);
}

/** Account Inspection (login-only checklist + private media) → "Account Checked" badge when PASSED. */
export async function saveInspection(
  user: AuthUser,
  store: OwnStore,
  id: string,
  input: { checklist: Record<string, boolean>; notes?: string },
  files: { buffer: Buffer }[],
) {
  const current = await one<CatalogRow>(pool, 'select * from catalogs where id = $1 and store_id = $2', [id, store.id]);
  if (!current) throw notFound('Katalog');
  if (current.status === 'SOLD') throw conflict('Katalog sudah terjual.');
  const media: string[] = [];
  try {
    for (const file of files) media.push(await uploadObject(PRIVATE_BUCKET, `inspections/${id}`, file, MEDIA_TYPES));
    const passed = Object.values(input.checklist).length > 0 && Object.values(input.checklist).every(Boolean);
    await withTransaction(async (tx) => {
      const old = await one<{ media: string[] }>(tx, 'select media from account_inspections where catalog_id = $1', [id]);
      const allMedia = [...(old?.media ?? []), ...media].slice(-10);
      await run(
        tx,
        `insert into account_inspections (catalog_id, inspected_by, checklist, media, notes, result)
         values ($1, $2, $3, $4, $5, $6)
         on conflict (catalog_id) do update set inspected_by = excluded.inspected_by, checklist = excluded.checklist,
           media = excluded.media, notes = excluded.notes, result = excluded.result, created_at = now()`,
        [id, user.id, json(input.checklist), json(allMedia), input.notes ?? null, passed ? 'PASSED' : 'FAILED'],
      );
      await run(tx, 'update catalogs set account_checked = $1 where id = $2', [passed, id]);
    });
  } catch (error) {
    await removeObjects(PRIVATE_BUCKET, media).catch(() => undefined);
    throw error;
  }
  return catalogDetail(id);
}

// ── Admin moderation (docs/ADMIN_PANEL.md §3.2) ──

export async function adminCatalogQueue(filter: { status?: string; game?: string; store?: string; q?: string; olderThanHours?: number }) {
  const rows = await all<ListingRow & { submit_count: number; store_type: string; store_level: string }>(
    pool,
    `select * from (${LISTING_SELECT}) l
     join lateral (select count(*)::int as submit_count from catalog_reviews r where r.catalog_id = l.id and r.decision = 'SUBMITTED') rc on true
     join lateral (select type as store_type, level as store_level from stores where id = l.store_id) st on true
     where ($1::catalog_status is null or l.status = $1)
       and ($2::text is null or l.game_slug = $2)
       and ($3::text is null or l.store_slug = $3)
       and ($4::text is null or l.title ilike $4 or l.vs_code ilike $4)
       and ($5::int is null or l.submitted_at < now() - make_interval(hours => $5))
     order by case when l.status = 'PENDING_REVIEW' then l.submitted_at end asc nulls last, l.created_at desc
     limit 200`,
    [filter.status ?? null, filter.game ?? null, filter.store ?? null, filter.q ? `%${filter.q}%` : null, filter.olderThanHours ?? null],
  );
  return rows.map((r) => ({ ...toListing(r), submitCount: r.submit_count, storeType: r.store_type, storeLevel: r.store_level }));
}

interface ModerationTarget {
  id: string;
  status: string;
  store_id: string;
  store_status: string;
  title: string;
  price: number;
  vs_code: string | null;
  listed_at: string | null;
  store_name: string;
}

async function lockForModeration(tx: Tx, id: string) {
  const row = await one<ModerationTarget>(
    tx,
    `select c.id, c.status, c.store_id, s.status as store_status, c.title, c.price, c.vs_code, c.listed_at, s.name as store_name
     from catalogs c join stores s on s.id = c.store_id where c.id = $1 for update of c`,
    [id],
  );
  if (!row) throw notFound('Katalog');
  return row;
}

export async function approveCatalog(admin: AuthUser, id: string, note: string | undefined, ip: string | undefined) {
  await withTransaction(async (tx) => {
    const c = await lockForModeration(tx, id);
    if (c.status !== 'PENDING_REVIEW') throw conflict('Katalog ini tidak sedang menunggu tinjauan.', 'BAD_STATE');
    if (c.store_status !== 'ACTIVE') throw conflict('Toko belum/tidak aktif — katalog tidak bisa ditayangkan.', 'STORE_NOT_ACTIVE');
    const firstListing = c.listed_at === null;
    await run(tx, `update catalogs set status = 'LISTED', listed_at = coalesce(listed_at, now()), review_note = null where id = $1`, [id]);
    await run(tx, `insert into catalog_reviews (catalog_id, actor_id, decision, note) values ($1, $2, 'APPROVED', $3)`, [id, admin.id, note ?? null]);
    await audit(tx, { actorId: admin.id, action: 'catalog.approve', targetType: 'catalog', targetId: id, detail: { vsCode: c.vs_code, note }, ip });
    await notifyStore(tx, c.store_id, {
      title: 'Katalog disetujui',
      body: `${c.vs_code} · ${c.title} sudah tayang di marketplace.`,
      link: `/store-dashboard/catalogs/${id}`,
    });
    if (firstListing) {
      const followers = await all<{ user_id: string }>(tx, 'select user_id from store_follows where store_id = $1', [c.store_id]);
      for (const f of followers) {
        await notify(tx, f.user_id, { kind: 'STORE', title: `Katalog baru dari ${c.store_name}`, body: c.title, link: `/catalog/${id}` });
      }
    }
    // Price-drop alerts for wishlists saved at a higher price.
    const drops = await all<{ user_id: string; price_at_save: number }>(
      tx,
      'select user_id, price_at_save from wishlists where catalog_id = $1 and notify_price_drop and price_at_save > $2',
      [id, c.price],
    );
    for (const w of drops) {
      await notify(tx, w.user_id, {
        kind: 'SYSTEM',
        title: 'Harga turun!',
        body: `${c.title}: Rp${w.price_at_save.toLocaleString('id-ID')} → Rp${c.price.toLocaleString('id-ID')}`,
        link: `/catalog/${id}`,
      });
    }
    if (drops.length) await run(tx, 'update wishlists set price_at_save = $1 where catalog_id = $2 and price_at_save > $1', [c.price, id]);
  });
}

function reviewNote(reasons: string[], note: string | undefined) {
  if (reasons.includes('Lainnya') && !note) throw badRequest('Alasan "Lainnya" wajib disertai catatan.', 'NOTE_REQUIRED');
  return [reasons.join('; '), note].filter(Boolean).join(' — ');
}

export async function rejectCatalog(admin: AuthUser, id: string, reasons: string[], note: string | undefined, ip: string | undefined) {
  const summary = reviewNote(reasons, note);
  await withTransaction(async (tx) => {
    const c = await lockForModeration(tx, id);
    if (c.status !== 'PENDING_REVIEW') throw conflict('Katalog ini tidak sedang menunggu tinjauan.', 'BAD_STATE');
    await run(tx, `update catalogs set status = 'REJECTED', review_note = $1 where id = $2`, [summary, id]);
    await run(tx, `insert into catalog_reviews (catalog_id, actor_id, decision, reasons, note) values ($1, $2, 'REJECTED', $3, $4)`, [
      id,
      admin.id,
      reasons,
      note ?? null,
    ]);
    await audit(tx, { actorId: admin.id, action: 'catalog.reject', targetType: 'catalog', targetId: id, detail: { reasons, note }, ip });
    await notifyStore(tx, c.store_id, {
      title: 'Katalog ditolak',
      body: `${c.vs_code} · ${c.title}: ${summary}. Perbaiki lalu ajukan ulang.`,
      link: `/store-dashboard/catalogs/${id}`,
    });
  });
}

export async function takedownCatalog(admin: AuthUser, id: string, reasons: string[], note: string | undefined, ip: string | undefined) {
  const summary = reviewNote(reasons, note);
  await withTransaction(async (tx) => {
    const c = await lockForModeration(tx, id);
    if (c.status !== 'LISTED') throw conflict('Hanya katalog LISTED yang bisa diturunkan (yang sedang dalam transaksi tidak).', 'BAD_STATE');
    await run(tx, `update catalogs set status = 'DELISTED', review_note = $1 where id = $2`, [summary, id]);
    await run(tx, `update featured_listings set status = 'STOPPED', stop_reason = 'Katalog diturunkan admin' where catalog_id = $1 and status = 'ACTIVE'`, [id]);
    await run(tx, `insert into catalog_reviews (catalog_id, actor_id, decision, reasons, note) values ($1, $2, 'TAKEDOWN', $3, $4)`, [
      id,
      admin.id,
      reasons,
      note ?? null,
    ]);
    await audit(tx, { actorId: admin.id, action: 'catalog.takedown', targetType: 'catalog', targetId: id, detail: { reasons, note }, ip });
    await notifyStore(tx, c.store_id, {
      title: 'Katalog diturunkan admin',
      body: `${c.vs_code} · ${c.title}: ${summary}.`,
      link: `/store-dashboard/catalogs/${id}`,
    });
  });
}
