import { Router } from 'express';
import { z } from 'zod';
import { badRequest, parse } from '../../lib/errors.js';
import { requireAdmin } from '../../middlewares/auth.js';
import * as service from './admin.service.js';

export const adminRouter = Router();

const id = z.uuid('id tidak valid').or(z.string().regex(/^st-[a-z0-9-]+$/));
const decision = z.enum(['approve', 'reject']);
const noteBody = z.object({ note: z.string().trim().max(255).optional() }).strict();

adminRouter.get('/admin/stores', async (req, res) => {
  requireAdmin(req);
  const { status } = parse(
    z.object({ status: z.enum(['PENDING_DEPOSIT', 'PENDING_REVIEW', 'ACTIVE', 'REJECTED', 'SUSPENDED']).optional() }).strict(),
    req.query,
  );
  res.json({ stores: await service.listStores(status) });
});

adminRouter.post('/admin/stores/:id/:decision', async (req, res) => {
  const admin = requireAdmin(req);
  const action = parse(decision, req.params.decision);
  const { note } = parse(noteBody, req.body ?? {});
  if (action === 'reject' && !note) throw badRequest('Isi alasan penolakan.');
  await service.reviewStore(admin, parse(id, req.params.id), action, note, req.ip);
  res.json({ ok: true });
});

adminRouter.get('/admin/withdrawals', async (req, res) => {
  requireAdmin(req);
  const { status } = parse(z.object({ status: z.enum(['PENDING', 'COMPLETED', 'REJECTED']).optional() }).strict(), req.query);
  res.json({ withdrawals: await service.listWithdrawals(status) });
});

adminRouter.post('/admin/withdrawals/:id/:decision', async (req, res) => {
  const admin = requireAdmin(req);
  const action = parse(decision, req.params.decision);
  const { note } = parse(noteBody, req.body ?? {});
  if (action === 'reject' && !note) throw badRequest('Isi alasan penolakan.');
  await service.reviewWithdrawal(admin, parse(z.uuid(), req.params.id), action, note, req.ip);
  res.json({ ok: true });
});

adminRouter.get('/admin/analytics', async (req, res) => {
  requireAdmin(req);
  res.json(await service.analytics());
});
