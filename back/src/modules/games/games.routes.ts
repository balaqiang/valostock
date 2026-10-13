// Public, read-only game catalogue: the games that can be topped up and their active products (DFD 3.0).
import { Router } from 'express';
import { z } from 'zod';
import { all, one, pool } from '../../db/pool.js';
import { notFound, parse } from '../../lib/errors.js';

export const gamesRouter = Router();

interface GameRow {
  id: number;
  slug: string;
  name: string;
  publisher: string;
  tagline: string;
  is_hot: boolean;
  uid_label: string;
  uid_hint: string;
  uid_extra_label: string | null;
  uid_extra_options: string[] | null;
  gradient: string;
  topup_currency: string | null;
  image: string | null;
}

const toGame = (g: GameRow) => ({
  id: g.id,
  slug: g.slug,
  name: g.name,
  publisher: g.publisher,
  tagline: g.tagline,
  isHot: g.is_hot,
  uidLabel: g.uid_label,
  uidHint: g.uid_hint,
  uidExtraLabel: g.uid_extra_label,
  uidExtraOptions: g.uid_extra_options,
  gradient: g.gradient,
  topupCurrency: g.topup_currency,
  image: g.image,
});

const GAME_COLUMNS = `id, slug, name, publisher, tagline, is_hot, uid_label, uid_hint, uid_extra_label, uid_extra_options,
  gradient, topup_currency, image`;

gamesRouter.get('/games', async (_req, res) => {
  const rows = await all<GameRow>(pool, `select ${GAME_COLUMNS} from games where is_active order by sort_order, name`);
  res.json({ games: rows.map(toGame) });
});

interface ProductRow {
  id: string;
  name: string;
  amount_label: string;
  retail_price: number;
  popular: boolean;
  section: 'SPECIAL' | 'INSTANT';
  icon: string | null;
}

/** One game + its active products, for the top-up form. */
gamesRouter.get('/games/:slug', async (req, res) => {
  const slug = parse(z.string().regex(/^[a-z0-9-]{2,50}$/, 'slug tidak valid'), req.params.slug);
  const game = await one<GameRow>(pool, `select ${GAME_COLUMNS} from games where slug = $1 and is_active`, [slug]);
  if (!game) throw notFound('Game');
  const products = await all<ProductRow>(
    pool,
    `select id, name, amount_label, retail_price, popular, section, icon from topup_products
     where game_id = $1 and is_active order by sort_order`,
    [game.id],
  );
  res.json({
    game: toGame(game),
    products: products.map((p) => ({
      id: p.id,
      name: p.name,
      amountLabel: p.amount_label,
      retailPrice: p.retail_price,
      section: p.section,
      icon: p.icon,
      popular: p.popular,
    })),
  });
});
