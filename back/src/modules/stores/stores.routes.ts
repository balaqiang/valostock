import { Router } from 'express';
import { z } from 'zod';
import { GATEWAY_METHODS } from '../../config/money.js';
import { pool } from '../../db/pool.js';
import { parse } from '../../lib/errors.js';
import { requireUser } from '../../middlewares/auth.js';
import { checkoutLimiter } from '../../middlewares/security.js';
import * as orders from '../orders/orders.service.js';
import { listStoreOrders } from '../orders/orders.repository.js';
import * as service from './stores.service.js';

export const storesRouter = Router();

storesRouter.get('/stores/me', async (req, res) => {
  res.json({ store: await service.myStore(requireUser(req)) });
});

const openSchema = z
  .object({
    name: z.string().trim().min(3, 'minimal 3 karakter').max(100),
    type: z.enum(['OWNER', 'RESELLER']),
    ownerLegalName: z.string().trim().min(3, 'isi nama sesuai KTP').max(100),
    description: z.string().trim().max(1000).optional(),
    acceptRules: z.literal(true, 'Setujui aturan toko terlebih dahulu'),
  })
  .strict();

storesRouter.post('/stores', async (req, res) => {
  const { acceptRules: _accepted, ...input } = parse(openSchema, req.body);
  res.status(201).json({ store: await service.openStore(requireUser(req), input) });
});

storesRouter.post('/stores/me/deposit', checkoutLimiter, async (req, res) => {
  const { method } = parse(z.object({ method: z.enum(GATEWAY_METHODS) }).strict(), req.body);
  res.json(await service.payDeposit(requireUser(req), method));
});

storesRouter.get('/stores/me/catalogs', async (req, res) => {
  res.json({ catalogs: await service.listCatalogs(requireUser(req)) });
});

const catalogSchema = z
  .object({
    gameSlug: z.string().regex(/^[a-z0-9-]{1,50}$/),
    title: z.string().trim().min(5, 'minimal 5 karakter').max(200),
    price: z.number().int().min(10_000, 'minimal Rp10.000').max(1_000_000_000),
    description: z.string().trim().max(5000).optional(),
    image: z.string().max(255).optional(),
    images: z.array(z.string().max(255)).max(10).optional(),
    attributes: z.record(z.string(), z.unknown()).optional(),
  })
  .strict();

storesRouter.post('/stores/me/catalogs', async (req, res) => {
  res.status(201).json({ catalog: await service.createCatalog(requireUser(req), parse(catalogSchema, req.body)) });
});

const catalogPatch = z
  .object({
    title: z.string().trim().min(5).max(200).optional(),
    price: z.number().int().min(10_000).max(1_000_000_000).optional(),
    description: z.string().trim().max(5000).optional(),
    status: z.enum(['LISTED', 'DELISTED']).optional(),
  })
  .strict();

storesRouter.patch('/stores/me/catalogs/:id', async (req, res) => {
  const id = parse(z.string().max(36), req.params.id);
  res.json({ catalog: await service.updateCatalog(requireUser(req), id, parse(catalogPatch, req.body)) });
});

storesRouter.get('/stores/me/orders', async (req, res) => {
  const storeId = await service.ownStoreId(requireUser(req));
  res.json({ orders: (await listStoreOrders(pool, storeId)).map((order) => orders.toOrderView(order, 'STORE')) });
});

storesRouter.get('/stores/me/balance', async (req, res) => {
  res.json(await service.balance(requireUser(req)));
});

storesRouter.get('/stores/me/withdrawals', async (req, res) => {
  res.json({ withdrawals: await service.listWithdrawals(requireUser(req)) });
});

const withdrawSchema = z
  .object({
    amount: z.number().int().positive().max(1_000_000_000),
    bankName: z.string().trim().min(2).max(50),
    accountNumber: z.string().trim().regex(/^\d{6,20}$/, 'nomor rekening 6–20 digit'),
    accountName: z.string().trim().min(3).max(100),
  })
  .strict();

storesRouter.post('/stores/me/withdrawals', checkoutLimiter, async (req, res) => {
  res.status(201).json({ withdrawal: await service.requestWithdrawal(requireUser(req), parse(withdrawSchema, req.body)) });
});
