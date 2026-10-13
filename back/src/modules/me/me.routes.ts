// The logged-in user's own data — always scoped to req.user (anti-IDOR):
// money records, wishlist, follows, recently viewed, notifications, loyalty
// points, referral and recommendations (docs/STORE_RULES.md engagement).
import { Router } from 'express';
import { z } from 'zod';
import { POINTS_REDEEM_UNIT, REFERRAL_REWARD, RUPIAH_PER_REDEEM_UNIT } from '../../config/money.js';
import { env } from '../../config/env.js';
import { all, one, pool, run, withTransaction } from '../../db/pool.js';
import { badRequest, notFound, parse } from '../../lib/errors.js';
import { movePoints, moveUserBalance } from '../../lib/ledger.js';
import { requireUser } from '../../middlewares/auth.js';
import { writeLimiter } from '../../middlewares/security.js';
import { LISTING_SELECT, PUBLIC_WHERE, searchListings, toListing, type ListingRow } from '../public/listings.js';
import { listUserBalanceTx, listUserTopupTx } from '../topup/topup.repository.js';

export const meRouter = Router();

const idParam = z.uuid('id tidak valid');

meRouter.get('/me/transactions', async (req, res) => {
  const user = requireUser(req);
  const [topups, fills] = await Promise.all([listUserTopupTx(pool, user.id), listUserBalanceTx(pool, user.id)]);
  const transactions = [...topups, ...fills].sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 100);
  res.json({ transactions });
});

meRouter.get('/me/balance-ledger', async (req, res) => {
  const user = requireUser(req);
  const rows = await all<{ id: number; user_id: string; type: string; amount: number; balance_after: number; reference: string; created_at: string }>(
    pool,
    'select id, user_id, type, amount, balance_after, reference, created_at from balance_ledger where user_id = $1 order by id desc limit 100',
    [user.id],
  );
  res.json({ ledger: rows.map((row) => ({ ...row, id: String(row.id) })) });
});

// ── Wishlist (+ price-drop alerts) ──

meRouter.get('/me/wishlist', async (req, res) => {
  const user = requireUser(req);
  const rows = await all<ListingRow & { price_at_save: number; notify_price_drop: boolean; saved_at: string }>(
    pool,
    `select l.*, w.price_at_save, w.notify_price_drop, w.created_at as saved_at
     from wishlists w join (${LISTING_SELECT}) l on l.id = w.catalog_id where w.user_id = $1 order by w.created_at desc`,
    [user.id],
  );
  res.json({
    items: rows.map((r) => ({
      listing: toListing(r),
      priceAtSave: r.price_at_save,
      notifyPriceDrop: r.notify_price_drop,
      savedAt: r.saved_at,
      available: ['LISTED', 'LOCKED', 'IN_ORDER'].includes(r.status),
    })),
  });
});

meRouter.post('/me/wishlist', writeLimiter, async (req, res) => {
  const user = requireUser(req);
  const { catalogId } = parse(z.object({ catalogId: z.uuid() }).strict(), req.body);
  const c = await one<{ price: number }>(pool, `select c.price from catalogs c join stores s on s.id = c.store_id join games g on g.id = c.game_id where c.id = $1 and ${PUBLIC_WHERE}`, [catalogId]);
  if (!c) throw notFound('Katalog');
  await run(pool, 'insert into wishlists (user_id, catalog_id, price_at_save) values ($1, $2, $3) on conflict do nothing', [user.id, catalogId, c.price]);
  res.status(201).json({ ok: true });
});

meRouter.patch('/me/wishlist/:catalogId', writeLimiter, async (req, res) => {
  const user = requireUser(req);
  const { notifyPriceDrop } = parse(z.object({ notifyPriceDrop: z.boolean() }).strict(), req.body);
  await run(pool, 'update wishlists set notify_price_drop = $1 where user_id = $2 and catalog_id = $3', [notifyPriceDrop, user.id, parse(idParam, req.params.catalogId)]);
  res.json({ ok: true });
});

meRouter.delete('/me/wishlist/:catalogId', writeLimiter, async (req, res) => {
  const user = requireUser(req);
  await run(pool, 'delete from wishlists where user_id = $1 and catalog_id = $2', [user.id, parse(idParam, req.params.catalogId)]);
  res.json({ ok: true });
});

// ── Follow stores ──

meRouter.get('/me/following', async (req, res) => {
  const user = requireUser(req);
  const rows = await all<{ slug: string; name: string; type: string; level: string; rating: number; sold: number; followers: number; gradient: string; followed_at: string; listed: number }>(
    pool,
    `select s.slug, s.name, s.type, s.level, s.rating, s.sold, s.followers, s.gradient, f.created_at as followed_at,
       (select count(*)::int from catalogs c where c.store_id = s.id and c.status = 'LISTED') as listed
     from store_follows f join stores s on s.id = f.store_id where f.user_id = $1 order by f.created_at desc`,
    [user.id],
  );
  res.json({
    stores: rows.map((s) => ({
      slug: s.slug,
      name: s.name,
      type: s.type,
      level: s.level,
      rating: s.rating,
      sold: s.sold,
      followers: s.followers,
      gradient: s.gradient,
      followedAt: s.followed_at,
      listedCount: s.listed,
    })),
  });
});

const storeSlug = z.string().regex(/^[a-z0-9-]{2,60}$/, 'slug tidak valid');

meRouter.post('/stores/:slug/follow', writeLimiter, async (req, res) => {
  const user = requireUser(req);
  const store = await one<{ id: string; owner_id: string }>(pool, `select id, owner_id from stores where slug = $1 and status = 'ACTIVE'`, [
    parse(storeSlug, req.params.slug),
  ]);
  if (!store) throw notFound('Toko');
  if (store.owner_id === user.id) throw badRequest('Tidak bisa mengikuti tokomu sendiri.');
  await withTransaction(async (tx) => {
    const added = await run(tx, 'insert into store_follows (user_id, store_id) values ($1, $2) on conflict do nothing', [user.id, store.id]);
    if (added) await run(tx, 'update stores set followers = followers + 1 where id = $1', [store.id]);
  });
  res.json({ following: true });
});

meRouter.delete('/stores/:slug/follow', writeLimiter, async (req, res) => {
  const user = requireUser(req);
  const store = await one<{ id: string }>(pool, 'select id from stores where slug = $1', [parse(storeSlug, req.params.slug)]);
  if (!store) throw notFound('Toko');
  await withTransaction(async (tx) => {
    const removed = await run(tx, 'delete from store_follows where user_id = $1 and store_id = $2', [user.id, store.id]);
    if (removed) await run(tx, 'update stores set followers = greatest(followers - 1, 0) where id = $1', [store.id]);
  });
  res.json({ following: false });
});

// ── Recently viewed & recommendations ──

meRouter.get('/me/recently-viewed', async (req, res) => {
  const user = requireUser(req);
  const rows = await all<ListingRow>(
    pool,
    `select l.* from recently_viewed r join (${LISTING_SELECT} where ${PUBLIC_WHERE}) l on l.id = r.catalog_id
     where r.user_id = $1 order by r.viewed_at desc limit 20`,
    [user.id],
  );
  res.json({ listings: rows.map(toListing) });
});

/** Same games as what the user viewed / saved, not yet viewed; falls back to popular listings. */
meRouter.get('/me/recommendations', async (req, res) => {
  const user = requireUser(req);
  const rows = await all<ListingRow>(
    pool,
    `select l.* from (${LISTING_SELECT} where ${PUBLIC_WHERE} and c.status = 'LISTED') l
     where l.game_slug in (
         select g.slug from catalogs c join games g on g.id = c.game_id
         where c.id in (select catalog_id from recently_viewed where user_id = $1 union select catalog_id from wishlists where user_id = $1))
       and l.id not in (select catalog_id from recently_viewed where user_id = $1)
       and l.store_id not in (select id from stores where owner_id = $1)
     order by l.featured desc, l.views desc limit 12`,
    [user.id],
  );
  const listings = rows.length > 0 ? rows.map(toListing) : await searchListings(pool, { sort: 'popular', limit: 12 });
  res.json({ listings });
});

// ── Notifications ──

meRouter.get('/me/notifications', async (req, res) => {
  const user = requireUser(req);
  const kind = parse(z.enum(['ORDER', 'SYSTEM', 'STORE']).optional(), req.query.kind);
  const rows = await all<{ id: string; kind: string; title: string; body: string; link: string | null; is_read: boolean; created_at: string }>(
    pool,
    `select * from notifications where user_id = $1 and ($2::notification_kind is null or kind = $2) order by created_at desc limit 100`,
    [user.id, kind ?? null],
  );
  res.json({
    notifications: rows.map((n) => ({ id: n.id, kind: n.kind, title: n.title, body: n.body, link: n.link, read: n.is_read, createdAt: n.created_at })),
    unread: rows.filter((n) => !n.is_read).length,
  });
});

meRouter.post('/me/notifications/read', writeLimiter, async (req, res) => {
  const user = requireUser(req);
  const { ids } = parse(z.object({ ids: z.array(z.uuid()).max(200).optional() }).strict(), req.body ?? {});
  if (ids && ids.length > 0) {
    await run(pool, 'update notifications set is_read = true where user_id = $1 and id = any($2::uuid[])', [user.id, ids]);
  } else {
    await run(pool, 'update notifications set is_read = true where user_id = $1 and not is_read', [user.id]);
  }
  res.json({ ok: true });
});

// ── Loyalty points (MONEY_RULES §13b) ──

meRouter.get('/me/points', async (req, res) => {
  const user = requireUser(req);
  const [profile, ledger] = await Promise.all([
    one<{ loyalty_points: number }>(pool, 'select loyalty_points from profiles where id = $1', [user.id]),
    all<{ id: number; type: string; points: number; balance_after: number; reference: string; created_at: string }>(
      pool,
      'select id, type, points, balance_after, reference, created_at from loyalty_ledger where user_id = $1 order by id desc limit 100',
      [user.id],
    ),
  ]);
  res.json({
    points: profile?.loyalty_points ?? 0,
    redeemUnit: POINTS_REDEEM_UNIT,
    rupiahPerUnit: RUPIAH_PER_REDEEM_UNIT,
    ledger: ledger.map((l) => ({ id: String(l.id), type: l.type, points: l.points, balanceAfter: l.balance_after, reference: l.reference, createdAt: l.created_at })),
  });
});

/** 100 points → Rp1.000 Balance (closed-loop: usable for top-up only). */
meRouter.post('/me/points/redeem', writeLimiter, async (req, res) => {
  const user = requireUser(req);
  const { points } = parse(z.object({ points: z.number().int().positive().max(10_000_000) }).strict(), req.body);
  if (points % POINTS_REDEEM_UNIT !== 0) throw badRequest(`Tukar poin kelipatan ${POINTS_REDEEM_UNIT}.`);
  const rupiah = (points / POINTS_REDEEM_UNIT) * RUPIAH_PER_REDEEM_UNIT;
  const reference = `REDEEM-${Date.now()}`;
  const result = await withTransaction(async (tx) => {
    const left = await movePoints(tx, user.id, { type: 'REDEEM', points: -points, reference });
    const balance = await moveUserBalance(tx, user.id, { type: 'LOYALTY_CREDIT', amount: rupiah, reference });
    return { points: left, balance };
  });
  res.json({ ...result, credited: rupiah });
});

// ── Referral / affiliate ──

meRouter.get('/me/referral', async (req, res) => {
  const user = requireUser(req);
  const [profile, referred] = await Promise.all([
    one<{ referral_code: string }>(pool, 'select referral_code from profiles where id = $1', [user.id]),
    all<{ name: string; created_at: string; status: string | null; reward: number | null; rewarded_at: string | null }>(
      pool,
      `select p.name, p.created_at, r.status, r.reward, r.rewarded_at from profiles p
       left join referral_rewards r on r.referred_id = p.id where p.referred_by = $1 order by p.created_at desc`,
      [user.id],
    ),
  ]);
  const code = profile?.referral_code ?? '';
  res.json({
    code,
    link: `${env.FRONTEND_URL}/register?ref=${code}`,
    reward: REFERRAL_REWARD,
    referred: referred.map((r) => ({
      name: r.name.replace(/(?<=.{2}).(?=.*.{1})/g, '*'),
      joinedAt: r.created_at,
      status: r.status ?? 'PENDING',
      reward: r.reward ?? 0,
      rewardedAt: r.rewarded_at,
    })),
    totalEarned: referred.reduce((sum, r) => sum + (r.status === 'REWARDED' ? (r.reward ?? 0) : 0), 0),
  });
});
