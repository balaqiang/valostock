import { Router } from 'express';
import { z } from 'zod';
import { parse } from '../../lib/errors.js';
import { endSession, startSession } from '../../middlewares/auth.js';
import { authLimiter } from '../../middlewares/security.js';
import * as service from './auth.service.js';

export const authRouter = Router();

const registerSchema = z
  .object({
    name: z.string().trim().min(2, 'minimal 2 karakter').max(100),
    email: z.email('email tidak valid').trim().toLowerCase().max(191),
    phone: z
      .string()
      .trim()
      .transform((value) => (value === '' ? null : service.normalizePhone(value)))
      .pipe(z.string().regex(/^08\d{8,12}$/, 'nomor HP tidak valid (contoh: 081234567890)').nullable())
      .optional()
      .default(null),
    password: z.string().min(8, 'minimal 8 karakter').max(100),
    acceptTerms: z.literal(true, 'Setujui Syarat & Ketentuan terlebih dahulu'),
  })
  .strict();

authRouter.post('/register', authLimiter, async (req, res) => {
  const input = parse(registerSchema, req.body);
  const user = await service.register(input);
  startSession(res, user.id);
  res.status(201).json({ user });
});

const loginSchema = z
  .object({
    identity: z.string().trim().min(3, 'isi email atau nomor HP').max(191),
    password: z.string().min(1, 'isi password').max(100),
  })
  .strict();

authRouter.post('/login', authLimiter, async (req, res) => {
  const { identity, password } = parse(loginSchema, req.body);
  const user = await service.login(identity, password);
  startSession(res, user.id);
  res.json({ user });
});

authRouter.post('/logout', (_req, res) => {
  endSession(res);
  res.json({ ok: true });
});

authRouter.get('/me', async (req, res) => {
  res.json({ user: req.user ? await service.me(req.user.id) : null });
});
