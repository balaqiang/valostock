import { Router } from 'express';
import { z } from 'zod';
import { all, pool } from '../../db/pool.js';
import { parse } from '../../lib/errors.js';
import { permissionsOf, requireUser } from '../../middlewares/auth.js';
import { uploadLimiter, writeLimiter } from '../../middlewares/security.js';
import { evidenceUpload } from '../../middlewares/upload.js';
import { ownStore } from '../store/store.context.js';
import * as service from './disputes.service.js';

export const disputesRouter = Router();

const idParam = z.uuid('id tidak valid');
const files = (req: { files?: unknown }) => (Array.isArray(req.files) ? (req.files as { buffer: Buffer }[]) : []);

const openSchema = z
  .object({
    reason: z.enum(['NOT_DELIVERED', 'NOT_AS_DESCRIBED', 'RECALLED', 'OTHER']),
    description: z.string().trim().min(10, 'jelaskan masalahnya (min. 10 karakter)').max(2000),
  })
  .strict();

/** multipart: reason, description, files[] (evidence). */
disputesRouter.post('/orders/:id/dispute', uploadLimiter, evidenceUpload.array('files', 5), async (req, res) => {
  const id = await service.openDispute(requireUser(req), parse(idParam, req.params.id), parse(openSchema, req.body), files(req));
  res.status(201).json({ disputeId: id });
});

disputesRouter.get('/me/disputes', async (req, res) => {
  const user = requireUser(req);
  const rows = await all<Parameters<typeof service.toDisputeSummary>[0]>(
    pool,
    `${service.DISPUTE_SELECT} where o.buyer_id = $1 order by d.created_at desc`,
    [user.id],
  );
  res.json({ disputes: rows.map(service.toDisputeSummary) });
});

disputesRouter.get('/stores/me/disputes', async (req, res) => {
  const { store } = await ownStore(req);
  const rows = await all<Parameters<typeof service.toDisputeSummary>[0]>(
    pool,
    `${service.DISPUTE_SELECT} where o.store_id = $1 order by d.created_at desc`,
    [store.id],
  );
  res.json({ disputes: rows.map(service.toDisputeSummary) });
});

disputesRouter.get('/disputes/:id', async (req, res) => {
  res.json(await service.disputeDetail(requireUser(req), parse(idParam, req.params.id)));
});

disputesRouter.post('/disputes/:id/events', uploadLimiter, evidenceUpload.array('files', 5), async (req, res) => {
  const user = requireUser(req);
  const { body } = parse(z.object({ body: z.string().trim().min(2).max(2000) }).strict(), req.body);
  const adminAllowed = user.role === 'ADMIN' && (await permissionsOf(user.id)).has('disputes:resolve');
  await service.addEvent(user, parse(idParam, req.params.id), body, files(req), adminAllowed);
  res.status(201).json({ ok: true });
});

disputesRouter.post('/disputes/:id/cancel', writeLimiter, async (req, res) => {
  await service.cancelDispute(requireUser(req), parse(idParam, req.params.id));
  res.json({ ok: true });
});
