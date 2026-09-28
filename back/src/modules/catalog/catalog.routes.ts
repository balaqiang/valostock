import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../../db/pool.js';
import { notFound, parse } from '../../lib/errors.js';
import * as repo from './catalog.repository.js';

// Public, read-only marketplace data. No business rules → routes call the repository directly.
export const catalogRouter = Router();

const slug = z.string().regex(/^[a-z0-9-]{1,100}$/, 'slug tidak valid');

catalogRouter.get('/games', async (_req, res) => {
  res.json({ games: await repo.listGames(pool) });
});

catalogRouter.get('/games/:slug', async (req, res) => {
  const game = await repo.findGameRow(pool, parse(slug, req.params.slug));
  if (!game) throw notFound('Game');
  res.json({ game: repo.toGame(game) });
});

catalogRouter.get('/games/:slug/topup-products', async (req, res) => {
  res.json({ products: await repo.listTopupProducts(pool, parse(slug, req.params.slug)) });
});

catalogRouter.get('/stores', async (_req, res) => {
  res.json({ stores: await repo.listActiveStores(pool) });
});

// `/stores/me` is handled by the stores router, mounted before this one.
catalogRouter.get('/stores/:slug', async (req, res) => {
  const store = await repo.findActiveStore(pool, parse(slug, req.params.slug));
  if (!store) throw notFound('Toko');
  res.json({ store });
});

const listingQuery = z.object({ game: slug.optional(), store: slug.optional() }).strict();

catalogRouter.get('/listings', async (req, res) => {
  res.json({ listings: await repo.listPublicListings(pool, parse(listingQuery, req.query)) });
});

catalogRouter.get('/listings/:id', async (req, res) => {
  const listing = await repo.findPublicListing(pool, parse(z.string().max(36), req.params.id));
  if (!listing) throw notFound('Katalog');
  res.json({ listing });
});

catalogRouter.get('/help', async (_req, res) => {
  res.json({ articles: await repo.listHelp(pool) });
});

catalogRouter.get('/help/:slug', async (req, res) => {
  const article = await repo.findHelp(pool, parse(slug, req.params.slug));
  if (!article) throw notFound('Artikel');
  res.json({ article });
});
