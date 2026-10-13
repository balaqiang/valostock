import { Router } from 'express';
import { z } from 'zod';
import { BLC_DENOMINATIONS, BLC_MAX_QTY, GATEWAY_METHODS, TOPUP_METHODS } from '../../config/money.js';
import { parse } from '../../lib/errors.js';
import { requireUser } from '../../middlewares/auth.js';
import { checkoutLimiter, lookupLimiter } from '../../middlewares/security.js';
import * as service from './topup.service.js';

export const topupRouter = Router();

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((value) => (value ? value : undefined));

const productId = z.string().trim().min(1).max(36);

const quoteSchema = z
  .object({ productId, method: z.enum(TOPUP_METHODS), promo: optionalText(30) })
  .strict();

topupRouter.get('/topup/quote', lookupLimiter, async (req, res) => {
  const q = parse(quoteSchema, req.query);
  res.json({ quote: await service.quote({ productId: q.productId, paymentMethod: q.method, promoCode: q.promo }) });
});

const checkoutSchema = z
  .object({
    productId,
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
  res.json({ transaction: await service.lookupInvoice(q) });
});

/** Voucher choices for the Balance page (the denominations live only in config/money.ts). */
topupRouter.get('/balance/vouchers', (_req, res) => {
  res.json({ denominations: BLC_DENOMINATIONS, maxQty: BLC_MAX_QTY });
});

const voucherFields = {
  nominal: z.coerce.number().int().positive(),
  qty: z.coerce.number().int().positive(),
  method: z.enum(GATEWAY_METHODS),
};

topupRouter.get('/balance/quote', lookupLimiter, async (req, res) => {
  requireUser(req);
  res.json({ quote: service.quoteBalance(parse(z.object(voucherFields).strict(), req.query)) });
});

topupRouter.post('/balance/topup', checkoutLimiter, async (req, res) => {
  const user = requireUser(req);
  const input = parse(z.object({ ...voucherFields, idempotencyKey: z.string().min(8).max(64) }).strict(), req.body);
  res.status(201).json(await service.fillBalance(user, input));
});
