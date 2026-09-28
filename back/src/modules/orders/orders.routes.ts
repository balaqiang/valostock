import { Router } from 'express';
import { z } from 'zod';
import { GATEWAY_METHODS } from '../../config/money.js';
import { parse } from '../../lib/errors.js';
import { requireUser } from '../../middlewares/auth.js';
import { checkoutLimiter } from '../../middlewares/security.js';
import * as service from './orders.service.js';

export const ordersRouter = Router();

const orderId = z.uuid('id pesanan tidak valid');

ordersRouter.get('/me/orders', async (req, res) => {
  res.json({ orders: await service.listMine(requireUser(req)) });
});

ordersRouter.post('/orders', checkoutLimiter, async (req, res) => {
  const { catalogId } = parse(z.object({ catalogId: z.string().trim().min(1).max(36) }).strict(), req.body);
  res.status(201).json({ order: await service.createOrder(requireUser(req), catalogId) });
});

ordersRouter.get('/orders/:id', async (req, res) => {
  const user = requireUser(req);
  const { order, role } = await service.getOrderFor(user, parse(orderId, req.params.id));
  res.json({ order: service.toOrderView(order, role) });
});

ordersRouter.post('/orders/:id/pay', checkoutLimiter, async (req, res) => {
  const { method } = parse(z.object({ method: z.enum(GATEWAY_METHODS) }).strict(), req.body);
  res.json(await service.payOrder(requireUser(req), parse(orderId, req.params.id), method));
});

ordersRouter.post('/orders/:id/cancel', async (req, res) => {
  await service.cancelOrder(requireUser(req), parse(orderId, req.params.id));
  res.json({ ok: true });
});

ordersRouter.get('/orders/:id/messages', async (req, res) => {
  res.json({ messages: await service.listMessages(requireUser(req), parse(orderId, req.params.id)) });
});

ordersRouter.post('/orders/:id/messages', async (req, res) => {
  const { body } = parse(z.object({ body: z.string().trim().min(1, 'pesan kosong').max(2000) }).strict(), req.body);
  await service.sendMessage(requireUser(req), parse(orderId, req.params.id), body);
  res.status(201).json({ ok: true });
});

ordersRouter.post('/orders/:id/safe', async (req, res) => {
  await service.markSafe(requireUser(req), parse(orderId, req.params.id));
  res.json({ ok: true });
});

ordersRouter.post('/orders/:id/complete', async (req, res) => {
  await service.completeOrder(requireUser(req), parse(orderId, req.params.id));
  res.json({ ok: true });
});
