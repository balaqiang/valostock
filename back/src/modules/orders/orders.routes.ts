import { Router } from 'express';
import { z } from 'zod';
import { GATEWAY_METHODS } from '../../config/money.js';
import { all, json, one, pool, run, withTransaction } from '../../db/pool.js';
import { conflict, forbidden, parse } from '../../lib/errors.js';
import { notify, notifyStore } from '../../lib/notify.js';
import { permissionsOf, requireUser } from '../../middlewares/auth.js';
import { checkoutLimiter, uploadLimiter, writeLimiter } from '../../middlewares/security.js';
import { evidenceUpload } from '../../middlewares/upload.js';
import { PRIVATE_BUCKET, removeObjects, signedUrls, uploadObject } from '../../supabase/storage.js';
import { activeLock } from '../offers/offers.routes.js';
import { USABLE_VOUCHER } from '../public/public.repository.js';
import { ownStore } from '../store/store.context.js';
import * as service from './orders.service.js';

export const ordersRouter = Router();

const orderId = z.uuid('id pesanan tidak valid');
const ATTACHMENT_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'video/mp4', 'application/pdf'];

ordersRouter.get('/me/orders', async (req, res) => {
  res.json({ orders: await service.listBuyerOrders(requireUser(req).id) });
});

ordersRouter.get('/stores/me/orders', async (req, res) => {
  const { store } = await ownStore(req);
  const status = parse(
    z.enum(['PENDING_PAYMENT', 'PAID', 'IN_REKBER', 'SAFE', 'COMPLETED', 'CANCELLED', 'DISPUTED', 'REFUNDED']).optional(),
    req.query.status,
  );
  res.json({ orders: await service.listStoreOrders(store.id, status) });
});

/** Everything the listing page needs to show the right buy buttons for this visitor. */
ordersRouter.get('/catalogs/:id/buy-context', async (req, res) => {
  const id = parse(orderId, req.params.id);
  const catalog = await one<{ store_id: string }>(pool, 'select store_id from catalogs where id = $1', [id]);
  if (!catalog) {
    res.json({ lock: null, offer: null, wishlisted: false, following: false, vouchers: [], openOrderId: null, isOwner: false });
    return;
  }
  const lock = await activeLock(pool, id);
  const vouchers = await all<{ code: string; kind: string; value: number; min_spend: number }>(
    pool,
    `select v.code, v.kind, v.value, v.min_spend from store_vouchers v where v.store_id = $1 and ${USABLE_VOUCHER} order by v.value desc`,
    [catalog.store_id],
  );
  const user = req.user;
  if (!user) {
    res.json({
      lock: lock ? { mine: false, expiresAt: lock.expires_at } : null,
      offer: null,
      wishlisted: false,
      following: false,
      vouchers,
      openOrderId: null,
      isOwner: false,
    });
    return;
  }
  const [offer, wish, follow, open, owner] = await Promise.all([
    one<{ id: string; amount: number; counter_amount: number | null; status: string; expires_at: string }>(
      pool,
      `select id, amount, counter_amount, status, expires_at from offers
       where catalog_id = $1 and buyer_id = $2 and status in ('PENDING', 'COUNTERED', 'ACCEPTED') and expires_at > now()`,
      [id, user.id],
    ),
    one(pool, 'select 1 from wishlists where user_id = $1 and catalog_id = $2', [user.id, id]),
    one(pool, 'select 1 from store_follows where user_id = $1 and store_id = $2', [user.id, catalog.store_id]),
    one<{ id: string }>(
      pool,
      `select o.id from orders o join order_items oi on oi.order_id = o.id where o.buyer_id = $1 and oi.catalog_id = $2 and o.status = 'PENDING_PAYMENT'`,
      [user.id, id],
    ),
    one(pool, 'select 1 from stores where id = $1 and owner_id = $2', [catalog.store_id, user.id]),
  ]);
  res.json({
    lock: lock ? { mine: lock.buyer_id === user.id, expiresAt: lock.expires_at } : null,
    offer: offer && {
      id: offer.id,
      amount: offer.amount,
      counterAmount: offer.counter_amount,
      status: offer.status,
      expiresAt: offer.expires_at,
      finalAmount: offer.status === 'ACCEPTED' ? (offer.counter_amount ?? offer.amount) : null,
    },
    wishlisted: Boolean(wish),
    following: Boolean(follow),
    vouchers: vouchers.map((v) => ({ code: v.code, kind: v.kind, value: v.value, minSpend: v.min_spend })),
    openOrderId: open?.id ?? null,
    isOwner: Boolean(owner),
  });
});

const createSchema = z
  .object({
    catalogId: z.uuid().optional(),
    bundleId: z.uuid().optional(),
    offerId: z.uuid().optional(),
    voucherCode: z
      .string()
      .trim()
      .max(30)
      .optional()
      .transform((v) => v || undefined),
  })
  .strict();

ordersRouter.post('/orders', checkoutLimiter, async (req, res) => {
  const user = requireUser(req);
  const id = await service.createOrder(user, parse(createSchema, req.body));
  const { order } = await service.getOrderFor(user, id);
  res.status(201).json({ order: service.toOrderView(order, 'BUYER') });
});

ordersRouter.get('/orders/:id', async (req, res) => {
  const { order, role } = await service.getOrderFor(requireUser(req), parse(orderId, req.params.id));
  res.json({ order: service.toOrderView(order, role) });
});

ordersRouter.post('/orders/:id/pay', checkoutLimiter, async (req, res) => {
  const { method } = parse(z.object({ method: z.enum(GATEWAY_METHODS) }).strict(), req.body);
  res.json(await service.payOrder(requireUser(req), parse(orderId, req.params.id), method));
});

ordersRouter.post('/orders/:id/cancel', writeLimiter, async (req, res) => {
  await service.cancelOrder(requireUser(req), parse(orderId, req.params.id));
  res.json({ ok: true });
});

// ── Rekber room ──

const REKBER_VISIBLE = new Set(['PAID', 'IN_REKBER', 'SAFE', 'COMPLETED', 'DISPUTED', 'REFUNDED']);
const REKBER_WRITABLE = new Set(['PAID', 'IN_REKBER', 'SAFE', 'DISPUTED']);

ordersRouter.get('/orders/:id/messages', async (req, res) => {
  const { order } = await service.getOrderFor(requireUser(req), parse(orderId, req.params.id));
  if (!REKBER_VISIBLE.has(order.status)) {
    res.json({ messages: [] });
    return;
  }
  const rows = await all<{ id: number; sender_role: string; sender_name: string | null; body: string; attachments: string[]; created_at: string }>(
    pool,
    `select m.id, m.sender_role, p.name as sender_name, m.body, m.attachments, m.created_at
     from rekber_messages m left join profiles p on p.id = m.sender_id where m.order_id = $1 order by m.id`,
    [order.id],
  );
  const urls = new Map((await signedUrls(rows.flatMap((r) => r.attachments))).map((u) => [u.path, u.url]));
  res.json({
    messages: rows.map((m) => ({
      id: m.id,
      senderRole: m.sender_role,
      senderName: m.sender_role === 'SYSTEM' ? 'Sistem' : m.sender_role === 'ADMIN' ? 'Admin valostock' : (m.sender_name ?? '-'),
      body: m.body,
      attachments: m.attachments.map((path) => ({ path, url: urls.get(path) ?? null })),
      createdAt: m.created_at,
    })),
  });
});

/** multipart or JSON: `body` + optional `files` (private bucket, signed URLs). */
ordersRouter.post('/orders/:id/messages', uploadLimiter, evidenceUpload.array('files', 5), async (req, res) => {
  const user = requireUser(req);
  const { order, role } = await service.getOrderFor(user, parse(orderId, req.params.id));
  if (role === 'ADMIN') {
    const perms = await permissionsOf(user.id);
    if (!perms.has('orders:intervene')) throw forbidden('Butuh izin orders:intervene.');
  }
  if (!REKBER_WRITABLE.has(order.status)) throw conflict('Rekber Room belum/sudah tidak aktif.', 'BAD_STATE');
  const files = Array.isArray(req.files) ? (req.files as { buffer: Buffer }[]) : [];
  const text = parse(z.string().trim().max(2000).optional(), (req.body as { body?: string }).body || undefined);
  if (!text && files.length === 0) throw conflict('Pesan kosong.', 'EMPTY');
  const paths: string[] = [];
  try {
    for (const file of files) paths.push(await uploadObject(PRIVATE_BUCKET, `rekber/${order.id}`, file, ATTACHMENT_TYPES));
    await withTransaction(async (tx) => {
      await run(tx, 'insert into rekber_messages (order_id, sender_id, sender_role, body, attachments) values ($1, $2, $3, $4, $5)', [
        order.id,
        user.id,
        role,
        text || '(lampiran)',
        json(paths),
      ]);
      // The store's first message is the hand-over → the order is now in rekber.
      if (role === 'STORE') {
        const moved = await run(tx, `update orders set status = 'IN_REKBER', delivered_at = now() where id = $1 and status = 'PAID'`, [order.id]);
        if (moved) {
          await notify(tx, order.buyer_id, {
            kind: 'ORDER',
            title: 'Data akun dikirim',
            body: `${order.order_number}: toko sudah mengirim data akun. Amankan akun lalu tekan "Akun aman".`,
            link: `/orders/${order.id}`,
          });
        }
      } else if (role === 'BUYER') {
        await notifyStore(tx, order.store_id, { kind: 'ORDER', title: 'Pesan rekber baru', body: order.order_number, link: `/store-dashboard/orders/${order.id}` });
      }
    });
  } catch (error) {
    await removeObjects(PRIVATE_BUCKET, paths).catch(() => undefined);
    throw error;
  }
  res.status(201).json({ ok: true });
});

ordersRouter.post('/orders/:id/safe', writeLimiter, async (req, res) => {
  await service.markSafe(requireUser(req), parse(orderId, req.params.id));
  res.json({ ok: true });
});

ordersRouter.post('/orders/:id/complete', writeLimiter, async (req, res) => {
  await service.completeOrder(requireUser(req), parse(orderId, req.params.id));
  res.json({ ok: true });
});

const ratingSchema = z
  .object({
    overall: z.union([z.literal(-1), z.literal(0), z.literal(1)]),
    descAccuracy: z.number().int().min(1).max(5),
    attitude: z.number().int().min(1).max(5),
    deliverySpeed: z.number().int().min(1).max(5),
    comment: z.string().trim().max(1000).optional(),
  })
  .strict();

ordersRouter.post('/orders/:id/rating', writeLimiter, async (req, res) => {
  await service.rateOrder(requireUser(req), parse(orderId, req.params.id), parse(ratingSchema, req.body));
  res.status(201).json({ ok: true });
});
