// Site CMS routes (docs/ARCHITECTURE.md API contract; ADMIN_PANEL.md §3.10).
import { Router } from 'express';
import { z } from 'zod';
import { imageUpload } from '../../middlewares/upload.js';
import { uploadLimiter, writeLimiter } from '../../middlewares/security.js';
import { parse } from '../../lib/errors.js';
import { admin, idParam, ipOf } from '../admin/admin.guard.js';
import * as cms from './cms.service.js';

export const cmsRouter = Router();

/** Public: every registered text (changed or built-in) + home banners that are live now. */
cmsRouter.get('/site', async (_req, res) => {
  const [texts, banners] = await Promise.all([cms.siteTexts(), cms.liveBanners()]);
  res.json({ texts, banners });
});

// ── Admin (content:manage) ──

cmsRouter.get('/admin/cms/texts', async (req, res) => {
  await admin(req, 'content:manage');
  res.json({ groups: await cms.textGroups() });
});

cmsRouter.patch('/admin/cms/texts', writeLimiter, async (req, res) => {
  const user = await admin(req, 'content:manage');
  const { values } = parse(
    z.object({ values: z.record(z.string().max(60), z.string().max(4000).nullable()) }).strict(),
    req.body,
  );
  res.json(await cms.updateTexts(user, values, ipOf(req)));
});

const imagePath = z.string().trim().regex(/^(\/images\/|cms\/)[A-Za-z0-9/_.()-]+$/, 'gambar harus hasil unggah (cms/…) atau file situs (/images/…)');
const linkUrl = z
  .string()
  .trim()
  .max(300)
  .regex(/^(\/(?!\/)\S*|https:\/\/\S+)$/, 'link: path situs (/…) atau https://…');
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullable()
    .transform((v) => (v ? v : null));
const dateTime = z.iso.datetime({ offset: true }).nullable();

const bannerFields = {
  title: z.string().trim().min(2, 'judul minimal 2 karakter').max(120),
  subtitle: optionalText(240),
  image: imagePath,
  ctaLabel: optionalText(40),
  linkUrl: linkUrl.nullable().or(z.literal('').transform(() => null)),
  sortOrder: z.number().int().min(0).max(1000),
  isActive: z.boolean(),
  startsAt: dateTime,
  endsAt: dateTime,
};

cmsRouter.get('/admin/cms/banners', async (req, res) => {
  await admin(req, 'content:manage');
  res.json({ banners: await cms.listBanners() });
});

cmsRouter.post('/admin/cms/banners', writeLimiter, async (req, res) => {
  const user = await admin(req, 'content:manage');
  const input = parse(
    z
      .object(bannerFields)
      .partial({ subtitle: true, ctaLabel: true, linkUrl: true, sortOrder: true, isActive: true, startsAt: true, endsAt: true })
      .strict(),
    req.body,
  );
  const result = await cms.createBanner(
    user,
    {
      title: input.title,
      image: input.image,
      subtitle: input.subtitle ?? null,
      ctaLabel: input.ctaLabel ?? null,
      linkUrl: input.linkUrl ?? null,
      sortOrder: input.sortOrder ?? 0,
      isActive: input.isActive ?? true,
      startsAt: input.startsAt ?? null,
      endsAt: input.endsAt ?? null,
    },
    ipOf(req),
  );
  res.status(201).json(result);
});

cmsRouter.patch('/admin/cms/banners/:id', writeLimiter, async (req, res) => {
  const user = await admin(req, 'content:manage');
  const input = parse(z.object(bannerFields).partial().strict(), req.body);
  res.json(await cms.updateBanner(user, parse(idParam, req.params.id), input, ipOf(req)));
});

cmsRouter.delete('/admin/cms/banners/:id', writeLimiter, async (req, res) => {
  const user = await admin(req, 'content:manage');
  res.json(await cms.deleteBanner(user, parse(idParam, req.params.id), ipOf(req)));
});

cmsRouter.put('/admin/cms/games/:id/banner', writeLimiter, async (req, res) => {
  const user = await admin(req, 'content:manage');
  const gameId = parse(z.coerce.number().int().positive(), req.params.id);
  const { image } = parse(z.object({ image: imagePath.nullable() }).strict(), req.body);
  res.json(await cms.setGameBanner(user, gameId, image, ipOf(req)));
});

cmsRouter.post('/admin/cms/uploads', uploadLimiter, imageUpload.single('image'), async (req, res) => {
  const user = await admin(req, 'content:manage');
  const { kind } = parse(z.object({ kind: z.enum(['banners', 'games']) }).strict(), req.query);
  res.status(201).json(await cms.uploadImage(user, kind, req.file, ipOf(req)));
});
