import { Router } from 'express';
import { z } from 'zod';
import { GATEWAY_METHODS, TOPUP_METHODS } from '../../config/money.js';
import { parse } from '../../lib/errors.js';
import { requireUser } from '../../middlewares/auth.js';
import { checkoutLimiter, lookupLimiter } from '../../middlewares/security.js';
import * as service from './topup.service.js';

export const topupRouter = Router();

topupRouter.get('/topup/promo', lookupLimiter, async (req, res) => {
  const { code } = parse(z.object({ code: z.string().trim().min(1).max(30) }).strict(), req.query);
  res.json({ promo: await service.checkPromo(code) });
});

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((value) => (value ? value : undefined));

const checkoutSchema = z
  .object({
    productId: z.string().trim().min(1).max(36),
    userGameId: z.string().trim().min(1, 'isi ID akun game').max(100),
    gameZoneId: optionalText(30),
    promoCode: optionalText(30),
    paymentMethod: z.enum(TOPUP_METHODS),
    contactEmail: z
      .union([z.email('email tidak valid'), z.literal('')])
      .optional()
      .transform((value) => value || undefined),
    contactWhatsapp: optionalText(20),
  })
  .strict();

topupRouter.post('/topup/checkout', checkoutLimiter, async (req, res) => {
  const input = parse(checkoutSchema, req.body);
  res.status(201).json(await service.checkout(req.user, input));
});

topupRouter.get('/topup/invoice', lookupLimiter, async (req, res) => {
  const { q } = parse(z.object({ q: z.string().trim().min(5).max(30) }).strict(), req.query);
  res.json({ transactions: [await service.lookupInvoice(q)] });
});

const fillSchema = z
  .object({
    nominal: z.number().int().positive(),
    qty: z.number().int().positive(),
    method: z.enum(GATEWAY_METHODS),
    idempotencyKey: z.string().min(8).max(64),
  })
  .strict();

topupRouter.post('/balance/topup', checkoutLimiter, async (req, res) => {
  const user = requireUser(req);
  res.status(201).json(await service.fillBalance(user, parse(fillSchema, req.body)));
});
