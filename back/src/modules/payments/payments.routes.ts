import { Router } from 'express';
import { z } from 'zod';
import { env } from '../../config/env.js';
import { notFound, parse } from '../../lib/errors.js';
import { lookupLimiter } from '../../middlewares/security.js';
import * as service from './payments.service.js';

export const paymentsRouter = Router();

const invoiceParam = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^(TU|BL)-\d{6}-[A-Z0-9]{6}$/, 'nomor invoice tidak valid');

const view = (payment: service.PaymentRow) => ({
  invoice: payment.midtrans_order_id,
  purpose: payment.purpose,
  status: payment.status,
  amount: payment.amount,
  method: payment.payment_method,
  redirectUrl: payment.status === 'PENDING' ? payment.redirect_url : null,
  next: service.nextPathFor(payment),
});

/** Called by /payment/finish after Midtrans redirects back: asks Midtrans, never the browser. */
paymentsRouter.get('/payments/:invoice/status', lookupLimiter, async (req, res) => {
  const payment = await service.syncPayment(parse(invoiceParam, req.params.invoice));
  res.json({ payment: view(payment) });
});

const simulateBody = z.object({ result: z.enum(['PAID', 'FAILED']) }).strict();

/** Built-in fake payment page (PAYMENT_MODE=simulation only — 404 otherwise). */
paymentsRouter.post('/payments/:invoice/simulate', async (req, res) => {
  if (env.PAYMENT_MODE !== 'simulation') throw notFound('Halaman');
  const invoice = parse(invoiceParam, req.params.invoice);
  const { result } = parse(simulateBody, req.body);
  const payment = await service.applyResult(invoice, result, { grossAmount: null, transactionId: `SIM-${invoice}` });
  res.json({ payment: view(payment) });
});

/** Midtrans HTTP notification (optional locally — needs a public tunnel URL). */
paymentsRouter.post('/webhooks/midtrans', async (req, res) => {
  const body: unknown = req.body;
  if (typeof body === 'object' && body !== null) await service.handleNotification(body as Record<string, unknown>);
  res.json({ ok: true }); // always 200 so Midtrans doesn't retry forever
});
