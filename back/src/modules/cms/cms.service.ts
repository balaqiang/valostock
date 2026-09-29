// Site CMS (docs/ADMIN_PANEL.md §3.10, DFD 2.7): editable texts, home banners,
// game banners and CMS image uploads. Every change is audit-logged.
import { all, one, pool, run, withTransaction, type Db } from '../../db/pool.js';
import { audit } from '../../lib/audit.js';
import { badRequest, notFound } from '../../lib/errors.js';
import { removeObjects, SITE_BUCKET, siteMediaUrl, uploadObject } from '../../supabase/storage.js';
import type { AuthUser } from '../../middlewares/auth.js';
import { checkText, SITE_TEXT_GROUPS, SITE_TEXTS } from './cms.registry.js';

export const IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp'];

// ── Texts ──

interface SettingRow {
  key: string;
  value: string;
  updated_at: string;
  updated_by_name: string | null;
}

const settingRows = (db: Db) =>
  all<SettingRow>(db, `select s.key, s.value, s.updated_at, p.name as updated_by_name from site_settings s left join profiles p on p.id = s.updated_by`);

/** Every registered text with its current value (changed or built-in). */
export async function siteTexts(db: Db = pool): Promise<Record<string, string>> {
  const texts: Record<string, string> = {};
  for (const [key, item] of SITE_TEXTS) texts[key] = item.value;
  for (const row of await settingRows(db)) if (SITE_TEXTS.has(row.key)) texts[row.key] = row.value;
  return texts;
}

/** Admin view: registry grouped, with default, current value and who changed it. */
export async function textGroups() {
  const rows = new Map((await settingRows(pool)).map((r) => [r.key, r]));
  return SITE_TEXT_GROUPS.map((group) => ({
    ...group,
    items: group.items.map((item) => {
      const row = rows.get(item.key);
      return {
        key: item.key,
        label: item.label,
        kind: item.kind,
        max: item.max,
        optional: item.optional ?? false,
        hint: item.hint ?? null,
        defaultValue: item.value,
        value: row?.value ?? item.value,
        changed: Boolean(row),
        updatedAt: row?.updated_at ?? null,
        updatedBy: row?.updated_by_name ?? null,
      };
    }),
  }));
}

/** `null` = back to the built-in text; a value equal to the default also removes the row. */
export async function updateTexts(actor: AuthUser, values: Record<string, string | null>, ip?: string) {
  const errors: string[] = [];
  const changes: { key: string; value: string | null }[] = [];
  for (const [key, raw] of Object.entries(values)) {
    const item = SITE_TEXTS.get(key);
    if (!item) {
      errors.push(`Teks "${key}" tidak dikenal.`);
      continue;
    }
    if (raw === null) {
      changes.push({ key, value: null });
      continue;
    }
    const checked = checkText(item, raw);
    if ('error' in checked) errors.push(checked.error);
    else changes.push({ key, value: checked.value === item.value ? null : checked.value });
  }
  if (errors.length) throw badRequest(errors.join(' '), 'INVALID_TEXT');
  if (changes.length === 0) throw badRequest('Tidak ada teks yang dikirim.');

  await withTransaction(async (tx) => {
    for (const change of changes) {
      if (change.value === null) await run(tx, 'delete from site_settings where key = $1', [change.key]);
      else
        await run(
          tx,
          `insert into site_settings (key, value, updated_by, updated_at) values ($1, $2, $3, now())
           on conflict (key) do update set value = excluded.value, updated_by = excluded.updated_by, updated_at = now()`,
          [change.key, change.value, actor.id],
        );
    }
    await audit(tx, {
      actorId: actor.id,
      action: 'cms.texts.update',
      targetType: 'site_settings',
      targetId: changes.map((c) => c.key).join(',').slice(0, 200),
      detail: { changes },
      ip,
    });
  });
  return { updated: changes.length };
}

// ── Banners ──

interface BannerRow {
  id: string;
  placement: 'HOME_HERO';
  title: string;
  subtitle: string | null;
  image: string;
  cta_label: string | null;
  link_url: string | null;
  sort_order: number;
  is_active: boolean;
  starts_at: string | null;
  ends_at: string | null;
  updated_at: string;
}

export interface BannerInput {
  title: string;
  subtitle: string | null;
  image: string;
  ctaLabel: string | null;
  linkUrl: string | null;
  sortOrder: number;
  isActive: boolean;
  startsAt: string | null;
  endsAt: string | null;
}

const bannerStatus = (b: BannerRow, now = Date.now()) => {
  if (!b.is_active) return 'INACTIVE' as const;
  if (b.starts_at && Date.parse(b.starts_at) > now) return 'SCHEDULED' as const;
  if (b.ends_at && Date.parse(b.ends_at) <= now) return 'ENDED' as const;
  return 'LIVE' as const;
};

const toBanner = (b: BannerRow) => ({
  id: b.id,
  placement: b.placement,
  title: b.title,
  subtitle: b.subtitle,
  image: b.image,
  imageUrl: siteMediaUrl(b.image),
  ctaLabel: b.cta_label,
  linkUrl: b.link_url,
  sortOrder: b.sort_order,
  isActive: b.is_active,
  startsAt: b.starts_at,
  endsAt: b.ends_at,
  status: bannerStatus(b),
  updatedAt: b.updated_at,
});

/** Public: banners that are active and inside their time window, in order. */
export async function liveBanners(db: Db = pool) {
  const rows = await all<BannerRow>(
    db,
    `select * from banners
     where placement = 'HOME_HERO' and is_active
       and (starts_at is null or starts_at <= now()) and (ends_at is null or ends_at > now())
     order by sort_order, created_at`,
  );
  return rows.map((b) => {
    const { id, title, subtitle, imageUrl, ctaLabel, linkUrl } = toBanner(b);
    return { id, title, subtitle, imageUrl, ctaLabel, linkUrl };
  });
}

export async function listBanners() {
  return (await all<BannerRow>(pool, `select * from banners order by sort_order, created_at`)).map(toBanner);
}

function checkWindow(startsAt: string | null, endsAt: string | null) {
  if (startsAt && endsAt && Date.parse(endsAt) <= Date.parse(startsAt)) throw badRequest('Waktu selesai harus setelah waktu mulai.');
}
function checkCta(ctaLabel: string | null, linkUrl: string | null) {
  if ((ctaLabel === null) !== (linkUrl === null)) throw badRequest('Label tombol dan link harus diisi bersama (atau dikosongkan bersama).');
}

export async function createBanner(actor: AuthUser, input: BannerInput, ip?: string) {
  checkWindow(input.startsAt, input.endsAt);
  checkCta(input.ctaLabel, input.linkUrl);
  const row = await one<{ id: string }>(
    pool,
    `insert into banners (title, subtitle, image, cta_label, link_url, sort_order, is_active, starts_at, ends_at, created_by)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) returning id`,
    [input.title, input.subtitle, input.image, input.ctaLabel, input.linkUrl, input.sortOrder, input.isActive, input.startsAt, input.endsAt, actor.id],
  );
  await audit(pool, { actorId: actor.id, action: 'cms.banner.create', targetType: 'banner', targetId: row!.id, detail: input, ip });
  return { id: row!.id };
}

export async function updateBanner(actor: AuthUser, id: string, input: Partial<BannerInput>, ip?: string) {
  const replaced = await withTransaction(async (tx) => {
    const current = await one<BannerRow>(tx, 'select * from banners where id = $1 for update', [id]);
    if (!current) throw notFound('Banner');
    const next = {
      title: input.title ?? current.title,
      subtitle: input.subtitle !== undefined ? input.subtitle : current.subtitle,
      image: input.image ?? current.image,
      ctaLabel: input.ctaLabel !== undefined ? input.ctaLabel : current.cta_label,
      linkUrl: input.linkUrl !== undefined ? input.linkUrl : current.link_url,
      sortOrder: input.sortOrder ?? current.sort_order,
      isActive: input.isActive ?? current.is_active,
      startsAt: input.startsAt !== undefined ? input.startsAt : current.starts_at,
      endsAt: input.endsAt !== undefined ? input.endsAt : current.ends_at,
    };
    checkWindow(next.startsAt, next.endsAt);
    checkCta(next.ctaLabel, next.linkUrl);
    await run(
      tx,
      `update banners set title = $1, subtitle = $2, image = $3, cta_label = $4, link_url = $5, sort_order = $6,
         is_active = $7, starts_at = $8, ends_at = $9, updated_at = now() where id = $10`,
      [next.title, next.subtitle, next.image, next.ctaLabel, next.linkUrl, next.sortOrder, next.isActive, next.startsAt, next.endsAt, id],
    );
    await audit(tx, { actorId: actor.id, action: 'cms.banner.update', targetType: 'banner', targetId: id, detail: input, ip });
    return current.image !== next.image ? current.image : null;
  });
  if (replaced) await removeIfUnused(replaced);
  return { ok: true };
}

export async function deleteBanner(actor: AuthUser, id: string, ip?: string) {
  const image = await withTransaction(async (tx) => {
    const current = await one<BannerRow>(tx, 'select * from banners where id = $1 for update', [id]);
    if (!current) throw notFound('Banner');
    await run(tx, 'delete from banners where id = $1', [id]);
    await audit(tx, { actorId: actor.id, action: 'cms.banner.delete', targetType: 'banner', targetId: id, detail: { title: current.title }, ip });
    return current.image;
  });
  await removeIfUnused(image);
  return { ok: true };
}

// ── Game banners ──

export async function setGameBanner(actor: AuthUser, gameId: number, image: string | null, ip?: string) {
  const previous = await withTransaction(async (tx) => {
    const game = await one<{ image: string | null; slug: string }>(tx, 'select image, slug from games where id = $1 for update', [gameId]);
    if (!game) throw notFound('Game');
    await run(tx, 'update games set image = $1 where id = $2', [image, gameId]);
    await audit(tx, { actorId: actor.id, action: 'cms.game_banner.update', targetType: 'game', targetId: String(gameId), detail: { slug: game.slug, from: game.image, to: image }, ip });
    return game.image;
  });
  if (previous && previous !== image) await removeIfUnused(previous);
  return { ok: true, imageUrl: image ? siteMediaUrl(image) : null };
}

// ── Uploads ──

export async function uploadImage(actor: AuthUser, kind: 'banners' | 'games', file: { buffer: Buffer } | undefined, ip?: string) {
  if (!file) throw badRequest('Pilih satu gambar (png, jpeg, atau webp, maks. 2 MB).', 'NO_FILE');
  const path = await uploadObject(SITE_BUCKET, `cms/${kind}`, file, IMAGE_TYPES);
  await audit(pool, { actorId: actor.id, action: 'cms.upload', targetType: 'site_media', targetId: path, ip });
  return { path, url: siteMediaUrl(path) };
}

/** Deletes an uploaded CMS object once no banner or game points at it any more (static /images/ files are kept). */
async function removeIfUnused(path: string) {
  if (!path.startsWith('cms/')) return;
  const used = await one(pool, 'select 1 from banners where image = $1 union all select 1 from games where image = $1 limit 1', [path]);
  if (!used) await removeObjects(SITE_BUCKET, [path]);
}
