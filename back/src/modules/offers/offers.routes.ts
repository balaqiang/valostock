// Direct offers / negotiation (DFD 6.0): buyer offers → store accepts / counters /
// rejects → an ACCEPTED price is valid 24 h for checkout. Plus the optional paid
// Lock (Rp5.000, 30 minutes) that reserves a catalog for one buyer.
import { Router, type Request } from 'express';
import { z } from 'zod';
import { GATEWAY_METHODS, LOCK_FEE, OFFER_HOURS } from '../../config/money.js';
import { all, one, pool, run, withTransaction, type Db } from '../../db/pool.js';
import { badRequest, conflict, forbidden, notFound, parse } from '../../lib/errors.js';
import { documentNumber } from '../../lib/ids.js';
import { notify, notifyStore } from '../../lib/notify.js';
import { requireUser } from '../../middlewares/auth.js';
import { checkoutLimiter, writeLimiter } from '../../middlewares/security.js';
import { catalogImageUrl } from '../../supabase/storage.js';
import * as payments from '../payments/payments.service.js';
import { ownStore } from '../store/store.context.js';

export const offersRouter = Router();

const idParam = z.uuid('id tidak valid');

interface OfferRow {
  id: string;
  catalog_id: string;
  buyer_id: string;
  store_id: string;
  amount: number;
  counter_amount: number | null;
  status: string;
  expires_at: string;
  responded_at: string | null;
  created_at: string;
  title: string;
  vs_code: string | null;
  price: number;
  image: string | null;
  store_name: string;
  store_slug: string;
  buyer_name: string;
}

const OFFER_SELECT = `select o.*, c.title, c.vs_code, c.price, s.name as store_name, s.slug as store_slug, p.name as buyer_name,
    (select ci.storage_path from catalog_images ci where ci.catalog_id = c.id order by ci.sort_order limit 1) as image
  from offers o join catalogs c on c.id = o.catalog_id join stores s on s.id = o.store_id join profiles p on p.id = o.buyer_id`;

/** Open offers past their deadline read as EXPIRED even before the job runs. */
const effectiveStatus = (o: OfferRow) =>
  ['PENDING', 'COUNTERED', 'ACCEPTED'].includes(o.status) && new Date(o.expires_at).getTime() < Date.now() ? 'EXPIRED' : o.status;

export const toOffer = (o: OfferRow) => ({
  id: o.id,
  catalog: { id: o.catalog_id, title: o.title, vsCode: o.vs_code, price: o.price, image: o.image ? catalogImageUrl(o.image) : '/images/Valorant_Points.png' },
  store: { name: o.store_name, slug: o.store_slug },
  buyer: { name: o.buyer_name },
  amount: o.amount,
  counterAmount: o.counter_amount,
  finalAmount: o.status === 'ACCEPTED' ? (o.counter_amount ?? o.amount) : null,
  status: effectiveStatus(o),
  expiresAt: o.expires_at,
  respondedAt: o.responded_at,
  createdAt: o.created_at,
});

async function loadOffer(db: Db, id: string, forUpdate = false) {
  const row = await one<OfferRow>(db, `${OFFER_SELECT} where o.id = $1${forUpdate ? ' for update of o' : ''}`, [id]);
  if (!row) throw notFound('Tawaran');
  return row;
}

async function storeOffer(req: Request, forUpdate: boolean, db: Db) {
  const { store } = await ownStore(req);
  const offer = await loadOffer(db, parse(idParam, req.params.id), forUpdate);
  if (offer.store_id !== store.id) throw notFound('Tawaran');
  return offer;
}

const isExpired = (o: OfferRow) => new Date(o.expires_at).getTime() < Date.now();

offersRouter.get('/me/offers', async (req, res) => {
  const user = requireUser(req);
  const rows = await all<OfferRow>(pool, `${OFFER_SELECT} where o.buyer_id = $1 order by o.created_at desc limit 100`, [user.id]);
  res.json({ offers: rows.map(toOffer) });
});

offersRouter.get('/stores/me/offers', async (req, res) => {
  const { store } = await ownStore(req);
  const rows = await all<OfferRow>(pool, `${OFFER_SELECT} where o.store_id = $1 order by o.created_at desc limit 200`, [store.id]);
  res.json({ offers: rows.map(toOffer) });
});

const createSchema = z.object({ catalogId: z.uuid(), amount: z.number().int().min(10_000).max(1_000_000_000) }).strict();

offersRouter.post('/offers', writeLimiter, async (req, res) => {
  const user = requireUser(req);
  const input = parse(createSchema, req.body);
  const id = await withTransaction(async (tx) => {
    const c = await one<{ id: string; price: number; status: string; store_id: string; store_status: string; owner_id: string; title: string }>(
      tx,
      `select c.id, c.price, c.status, c.store_id, s.status as store_status, s.owner_id, c.title
       from catalogs c join stores s on s.id = c.store_id where c.id = $1`,
      [input.catalogId],
    );
    if (!c || c.store_status !== 'ACTIVE' || c.status !== 'LISTED') throw notFound('Katalog');
    if (c.owner_id === user.id) throw badRequest('Tidak bisa menawar katalog tokomu sendiri.');
    if (input.amount >= c.price) throw badRequest('Tawaran harus di bawah harga katalog, atau langsung beli saja.');
    if (input.amount < Math.ceil(c.price * 0.5)) throw badRequest('Tawaran minimal 50% dari harga katalog.');
    // An expired/finished offer doesn't block a new one (partial unique index covers open ones only).
    await run(
      tx,
      `update offers set status = 'EXPIRED' where catalog_id = $1 and buyer_id = $2 and status in ('PENDING', 'COUNTERED', 'ACCEPTED') and expires_at < now()`,
      [c.id, user.id],
    );
    if (await one(tx, `select 1 from offers where catalog_id = $1 and buyer_id = $2 and status in ('PENDING', 'COUNTERED', 'ACCEPTED')`, [c.id, user.id])) {
      throw conflict('Kamu masih punya tawaran aktif untuk akun ini.', 'OFFER_OPEN');
    }
    const row = await one<{ id: string }>(
      tx,
      `insert into offers (catalog_id, buyer_id, store_id, amount, expires_at) values ($1, $2, $3, $4, now() + make_interval(hours => $5)) returning id`,
      [c.id, user.id, c.store_id, input.amount, OFFER_HOURS],
    );
    await notifyStore(tx, c.store_id, {
      kind: 'ORDER',
      title: 'Tawaran baru',
      body: `${c.title}: Rp${input.amount.toLocaleString('id-ID')} (harga Rp${c.price.toLocaleString('id-ID')}). Balas dalam ${OFFER_HOURS} jam.`,
      link: '/store-dashboard/offers',
    });
    return row!.id;
  });
  res.status(201).json({ offer: toOffer(await loadOffer(pool, id)) });
});

type StoreAction = 'accept' | 'reject' | 'counter';

async function storeRespond(req: Request, action: StoreAction, counter?: number) {
  const offerId = await withTransaction(async (tx) => {
    const offer = await storeOffer(req, true, tx);
    if (isExpired(offer)) throw conflict('Tawaran sudah kedaluwarsa.', 'EXPIRED');
    if (action === 'reject') {
      if (!['PENDING', 'COUNTERED'].includes(offer.status)) throw conflict('Tawaran ini sudah dijawab.', 'BAD_STATE');
      await run(tx, `update offers set status = 'REJECTED', responded_at = now() where id = $1`, [offer.id]);
    } else {
      if (offer.status !== 'PENDING') throw conflict('Tawaran ini sudah dijawab.', 'BAD_STATE');
      if (action === 'accept') {
        await run(tx, `update offers set status = 'ACCEPTED', responded_at = now(), expires_at = now() + make_interval(hours => $1) where id = $2`, [
          OFFER_HOURS,
          offer.id,
        ]);
      } else {
        if (!counter || counter <= offer.amount || counter >= offer.price) throw badRequest('Harga tawaran balik harus di antara tawaran pembeli dan harga katalog.');
        await run(
          tx,
          `update offers set status = 'COUNTERED', counter_amount = $1, responded_at = now(), expires_at = now() + make_interval(hours => $2) where id = $3`,
          [counter, OFFER_HOURS, offer.id],
        );
      }
    }
    const text = {
      accept: `Tawaranmu Rp${offer.amount.toLocaleString('id-ID')} diterima. Checkout dalam ${OFFER_HOURS} jam dengan harga ini.`,
      reject: 'Tawaranmu ditolak toko.',
      counter: `Toko memberi tawaran balik Rp${(counter ?? 0).toLocaleString('id-ID')}.`,
    }[action];
    await notify(tx, offer.buyer_id, { kind: 'ORDER', title: `Tawaran: ${offer.title}`, body: text, link: '/account/offers' });
    return offer.id;
  });
  return toOffer(await loadOffer(pool, offerId));
}

offersRouter.post('/offers/:id/accept', writeLimiter, async (req, res) => {
  res.json({ offer: await storeRespond(req, 'accept') });
});

offersRouter.post('/offers/:id/reject', writeLimiter, async (req, res) => {
  res.json({ offer: await storeRespond(req, 'reject') });
});

offersRouter.post('/offers/:id/counter', writeLimiter, async (req, res) => {
  const { amount } = parse(z.object({ amount: z.number().int().min(10_000).max(1_000_000_000) }).strict(), req.body);
  res.json({ offer: await storeRespond(req, 'counter', amount) });
});

/** Buyer accepts the store's counter-offer → ACCEPTED at the counter price. */
offersRouter.post('/offers/:id/accept-counter', writeLimiter, async (req, res) => {
  const user = requireUser(req);
  const id = parse(idParam, req.params.id);
  await withTransaction(async (tx) => {
    const offer = await loadOffer(tx, id, true);
    if (offer.buyer_id !== user.id) throw notFound('Tawaran');
    if (offer.status !== 'COUNTERED' || isExpired(offer)) throw conflict('Tawaran balik sudah tidak berlaku.', 'BAD_STATE');
    await run(tx, `update offers set status = 'ACCEPTED', expires_at = now() + make_interval(hours => $1) where id = $2`, [OFFER_HOURS, id]);
    await notifyStore(tx, offer.store_id, {
      kind: 'ORDER',
      title: 'Tawaran balik diterima',
      body: `${offer.buyer_name} menerima Rp${(offer.counter_amount ?? 0).toLocaleString('id-ID')} untuk ${offer.title}.`,
      link: '/store-dashboard/offers',
    });
  });
  res.json({ offer: toOffer(await loadOffer(pool, id)) });
});

offersRouter.post('/offers/:id/cancel', writeLimiter, async (req, res) => {
  const user = requireUser(req);
  const id = parse(idParam, req.params.id);
  const changed = await run(pool, `update offers set status = 'CANCELLED' where id = $1 and buyer_id = $2 and status in ('PENDING', 'COUNTERED', 'ACCEPTED')`, [
    id,
    user.id,
  ]);
  if (changed === 0) throw conflict('Tawaran ini sudah tidak aktif.', 'BAD_STATE');
  res.json({ offer: toOffer(await loadOffer(pool, id)) });
});

// ── Lock (Rp5.000 / 30 minutes) ──

/** Active lock on a catalog (paid, not expired), if any. */
export const activeLock = (db: Db, catalogId: string) =>
  one<{ id: string; buyer_id: string; expires_at: string }>(
    db,
    `select id, buyer_id, expires_at from catalog_locks where catalog_id = $1 and status = 'ACTIVE' and expires_at > now()`,
    [catalogId],
  );

offersRouter.post('/catalogs/:id/lock', checkoutLimiter, async (req, res) => {
  const user = requireUser(req);
  const catalogId = parse(idParam, req.params.id);
  const { method } = parse(z.object({ method: z.enum(GATEWAY_METHODS) }).strict(), req.body);
  const invoice = documentNumber('LK');
  await withTransaction(async (tx) => {
    const c = await one<{ status: string; store_status: string; owner_id: string }>(
      tx,
      'select c.status, s.status as store_status, s.owner_id from catalogs c join stores s on s.id = c.store_id where c.id = $1 for update of c',
      [catalogId],
    );
    if (!c || c.status !== 'LISTED' || c.store_status !== 'ACTIVE') throw conflict('Akun ini tidak bisa dikunci saat ini.', 'CATALOG_UNAVAILABLE');
    if (c.owner_id === user.id) throw forbidden('Tidak bisa mengunci katalog tokomu sendiri.');
    const lock = await activeLock(tx, catalogId);
    if (lock) throw conflict(lock.buyer_id === user.id ? 'Akun ini sudah kamu kunci.' : 'Akun sedang dikunci pembeli lain.', 'LOCKED');
    const row = await one<{ id: string }>(tx, `insert into catalog_locks (catalog_id, buyer_id, fee) values ($1, $2, $3) returning id`, [
      catalogId,
      user.id,
      LOCK_FEE,
    ]);
    await payments.recordPayment(tx, { invoice, purpose: 'LOCK', refId: row!.id, userId: user.id, amount: LOCK_FEE, method, meta: { catalogId } });
  });
  res.status(201).json({ invoice, payment: await payments.openPaymentPage(invoice, { name: user.name, email: user.email }) });
});
