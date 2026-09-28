import { Router } from 'express';
import { z } from 'zod';
import { all, one, pool, run } from '../../db/pool.js';
import { notFound, parse } from '../../lib/errors.js';
import { lookupLimiter } from '../../middlewares/security.js';
import { catalogImageUrl } from '../../supabase/storage.js';
import { findPublicListing, listingsByIds, searchListings } from './listings.js';
import * as repo from './public.repository.js';

// Public, read-only marketplace data (+ view counting and "helpful" votes).
export const publicRouter = Router();

const slug = z.string().regex(/^[a-z0-9-]{1,120}$/, 'slug tidak valid');
const uuidParam = z.uuid('id tidak valid');

publicRouter.get('/games', async (_req, res) => {
  res.json({ games: await repo.listGames(pool) });
});

publicRouter.get('/games/:slug', async (req, res) => {
  const game = await repo.findGameRow(pool, parse(slug, req.params.slug));
  if (!game || !game.is_active) throw notFound('Game');
  res.json({ game: repo.toGame(game), fields: await repo.templatesForGame(pool, game.id) });
});

publicRouter.get('/games/:slug/fields', async (req, res) => {
  const game = await repo.findGameRow(pool, parse(slug, req.params.slug));
  if (!game) throw notFound('Game');
  res.json({ fields: await repo.templatesForGame(pool, game.id) });
});

publicRouter.get('/games/:slug/topup-products', async (req, res) => {
  const rows = await all<{ id: string; name: string; amount_label: string; retail_price: number; popular: boolean }>(
    pool,
    `select p.* from topup_products p join games g on g.id = p.game_id
     where g.slug = $1 and p.is_active and g.is_active order by p.sort_order`,
    [parse(slug, req.params.slug)],
  );
  res.json({
    products: rows.map((p) => ({
      id: p.id,
      gameSlug: req.params.slug,
      name: p.name,
      amountLabel: p.amount_label,
      retailPrice: p.retail_price,
      popular: p.popular || undefined,
    })),
  });
});

publicRouter.get('/stores', async (_req, res) => {
  res.json({ stores: await repo.listActiveStores(pool) });
});

// `/stores/me` is handled by the store router, mounted before this one.
publicRouter.get('/stores/:slug', async (req, res) => {
  const store = await repo.findActiveStore(pool, parse(slug, req.params.slug));
  if (!store) throw notFound('Toko');
  const [bundles, ratings] = await Promise.all([
    repo.activeBundles(pool, { storeId: store.id }),
    all<{ overall: number; desc_accuracy: number; attitude: number; delivery_speed: number; comment: string | null; store_reply: string | null; created_at: string; buyer_name: string }>(
      pool,
      `select r.overall, r.desc_accuracy, r.attitude, r.delivery_speed, r.comment, r.store_reply, r.created_at, p.name as buyer_name
       from ratings r join profiles p on p.id = r.buyer_id where r.store_id = $1 order by r.created_at desc limit 20`,
      [store.id],
    ),
  ]);
  res.json({
    store,
    bundles: bundles.map((b) => ({ id: b.id, title: b.title, bundlePrice: b.bundle_price, itemsTotal: b.items_total, catalogIds: b.catalog_ids })),
    ratings: ratings.map((r) => ({
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

const searchQuery = z
  .object({
    game: slug.optional(),
    store: slug.optional(),
    q: z.string().trim().max(80).optional(),
    minPrice: z.coerce.number().int().min(0).optional(),
    maxPrice: z.coerce.number().int().min(0).optional(),
    sort: z.enum(['newest', 'price_asc', 'price_desc', 'popular']).optional(),
    limit: z.coerce.number().int().min(1).max(200).optional(),
  })
  .catchall(z.string().max(80));

/**
 * GET /listings?game=valorant&attr.rank=Immortal%203&min.skins=50
 * Attribute filters are only accepted for the game's filterable template keys.
 */
publicRouter.get('/listings', lookupLimiter, async (req, res) => {
  const { game, store, q, minPrice, maxPrice, sort, limit, ...rest } = parse(searchQuery, req.query);
  const attrs: Record<string, string> = {};
  const attrMin: Record<string, number> = {};
  if (game) {
    const gameRow = await repo.findGameRow(pool, game);
    const templates = gameRow ? await repo.templatesForGame(pool, gameRow.id) : [];
    for (const [param, value] of Object.entries(rest)) {
      const [prefix, key] = param.split('.');
      const template = templates.find((t) => t.key === key && t.filterable);
      if (!template || !value) continue;
      if (prefix === 'attr' && template.type !== 'NUMBER') attrs[template.key] = String(value);
      if (prefix === 'min' && template.type === 'NUMBER' && Number.isFinite(Number(value))) attrMin[template.key] = Number(value);
    }
  }
  res.json({ listings: await searchListings(pool, { game, store, q, minPrice, maxPrice, sort, limit, attrs, attrMin }) });
});

publicRouter.get('/listings/:id', async (req, res) => {
  const listing = await findPublicListing(pool, parse(uuidParam, req.params.id));
  if (!listing) throw notFound('Katalog');
  const [store, bundles, inspection] = await Promise.all([
    repo.findActiveStore(pool, listing.storeSlug),
    repo.activeBundles(pool, { catalogId: listing.id }),
    one<{ result: string; created_at: string; checklist: Record<string, boolean> }>(
      pool,
      'select result, created_at, checklist from account_inspections where catalog_id = $1',
      [listing.id],
    ),
  ]);
  const bundleItems = await listingsByIds(pool, [...new Set(bundles.flatMap((b) => b.catalog_ids))]);
  res.json({
    listing,
    store,
    inspection: inspection ? { result: inspection.result, date: inspection.created_at, checklist: inspection.checklist } : null,
    bundles: bundles.map((b) => ({
      id: b.id,
      title: b.title,
      bundlePrice: b.bundle_price,
      itemsTotal: b.items_total,
      items: bundleItems.filter((i) => b.catalog_ids.includes(i.id)).map((i) => ({ id: i.id, title: i.title, price: i.basePrice, image: i.image })),
    })),
  });
});

/** Counts a view and records "recently viewed" for logged-in buyers. */
publicRouter.post('/listings/:id/view', async (req, res) => {
  const id = parse(uuidParam, req.params.id);
  await run(pool, `update catalogs set views = views + 1 where id = $1 and status in ('LISTED', 'LOCKED', 'IN_ORDER')`, [id]);
  if (req.user) {
    await run(
      pool,
      `insert into recently_viewed (user_id, catalog_id) values ($1, $2)
       on conflict (user_id, catalog_id) do update set viewed_at = now()`,
      [req.user.id, id],
    );
  }
  res.json({ ok: true });
});

publicRouter.get('/help', async (_req, res) => {
  res.json({ articles: await repo.listHelp(pool) });
});

publicRouter.get('/help/:slug', async (req, res) => {
  const article = await repo.findHelp(pool, parse(slug, req.params.slug));
  if (!article) throw notFound('Artikel');
  res.json({ article });
});

publicRouter.post('/help/:slug/helpful', lookupLimiter, async (req, res) => {
  await run(pool, 'update help_articles set helpful_count = helpful_count + 1 where slug = $1', [parse(slug, req.params.slug)]);
  res.json({ ok: true });
});

publicRouter.get('/news', async (_req, res) => {
  res.json({ articles: await repo.listNews(pool) });
});

publicRouter.get('/news/:slug', async (req, res) => {
  const article = await repo.findNews(pool, parse(slug, req.params.slug));
  if (!article) throw notFound('Berita');
  res.json({ article });
});

/** Home page: featured + newest listings per game (featured first). */
publicRouter.get('/home', async (_req, res) => {
  const [games, listings] = await Promise.all([repo.listGames(pool), searchListings(pool, { sort: 'newest', limit: 24 })]);
  res.json({ games, listings, featured: listings.filter((l) => l.featured) });
});

export { catalogImageUrl };
