// Supabase Auth behind the API (docs/ARCHITECTURE.md §2). The browser only ever
// talks to this API; tokens are kept in httpOnly cookies (never localStorage).
import { Router } from 'express';
import { z } from 'zod';
import { one, pool, run } from '../../db/pool.js';
import { AppError, badRequest, conflict, parse } from '../../lib/errors.js';
import { ACCESS_COOKIE, clearSessionCookies, requireUser, setSessionCookies } from '../../middlewares/auth.js';
import { authLimiter } from '../../middlewares/security.js';
import { authClient, supabaseAdmin } from '../../supabase/client.js';

export const authRouter = Router();

/** "+62 812-3456-7890" / "6281234567890" → "081234567890". */
export function normalizePhone(raw: string): string {
  const compact = raw.replace(/[\s\-().]/g, '');
  if (compact.startsWith('+62')) return `0${compact.slice(3)}`;
  if (compact.startsWith('62')) return `0${compact.slice(2)}`;
  return compact;
}

const phoneField = z
  .string()
  .trim()
  .transform((value) => (value === '' ? null : normalizePhone(value)))
  .pipe(z.string().regex(/^08\d{8,12}$/, 'nomor HP tidak valid (contoh: 081234567890)').nullable());

const passwordField = z.string().min(8, 'minimal 8 karakter').max(100);

interface ProfileRow {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  role: 'USER' | 'ADMIN';
  balance: number;
  referral_code: string;
  created_at: string;
}

/** GET /auth/me payload. */
export async function currentUser(userId: string) {
  const profile = await one<ProfileRow>(
    pool,
    'select id, email, name, phone, role, balance, referral_code, created_at from profiles where id = $1',
    [userId],
  );
  if (!profile) return null;
  return {
    id: profile.id,
    name: profile.name,
    email: profile.email,
    phone: profile.phone,
    role: profile.role,
    balance: profile.balance,
    referralCode: profile.referral_code,
    created_at: profile.created_at,
  };
}

const registerSchema = z
  .object({
    name: z.string().trim().min(2, 'minimal 2 karakter').max(100),
    email: z.email('email tidak valid').trim().toLowerCase().max(191),
    phone: phoneField.optional().default(null),
    password: passwordField,
    ref: z
      .string()
      .trim()
      .toUpperCase()
      .max(20)
      .optional()
      .transform((value) => value || undefined),
    acceptTerms: z.literal(true, 'Setujui Syarat & Ketentuan terlebih dahulu'),
  })
  .strict();

authRouter.post('/register', authLimiter, async (req, res) => {
  const input = parse(registerSchema, req.body);
  if (await one(pool, 'select 1 from profiles where lower(email) = $1', [input.email])) {
    throw conflict('Email sudah terdaftar.', 'EMAIL_TAKEN');
  }
  if (input.phone && (await one(pool, 'select 1 from profiles where phone = $1', [input.phone]))) {
    throw conflict('Nomor HP sudah terdaftar.', 'PHONE_TAKEN');
  }
  if (input.ref && !(await one(pool, 'select 1 from profiles where referral_code = $1', [input.ref]))) {
    throw badRequest('Kode referral tidak ditemukan.', 'REF_INVALID');
  }
  // The on_auth_user_created trigger creates the profile from this metadata.
  const { data, error } = await authClient().auth.signUp({
    email: input.email,
    password: input.password,
    options: { data: { name: input.name, phone: input.phone ?? '', ref: input.ref ?? '' } },
  });
  if (error || !data.user) throw badRequest(error?.message ?? 'Pendaftaran gagal.', 'SIGNUP_FAILED');
  if (data.session) setSessionCookies(res, data.session);
  res.status(201).json({ user: await currentUser(data.user.id) });
});

const loginSchema = z
  .object({
    identity: z.string().trim().min(3, 'isi email atau nomor HP').max(191),
    password: z.string().min(1, 'isi password').max(100),
  })
  .strict();

authRouter.post('/login', authLimiter, async (req, res) => {
  const { identity, password } = parse(loginSchema, req.body);
  // Phone login: look up the email of that profile, then sign in with it.
  const email = identity.includes('@')
    ? identity.toLowerCase()
    : (await one<{ email: string }>(pool, 'select email from profiles where phone = $1', [normalizePhone(identity)]))?.email;
  const bad = new AppError(401, 'BAD_CREDENTIALS', 'Email/nomor HP atau password salah.');
  if (!email) throw bad;
  const { data, error } = await authClient().auth.signInWithPassword({ email, password });
  if (error || !data.session) throw bad;
  setSessionCookies(res, data.session);
  res.json({ user: await currentUser(data.user.id) });
});

authRouter.post('/logout', async (req, res) => {
  const access: unknown = req.cookies?.[ACCESS_COOKIE];
  if (typeof access === 'string') await supabaseAdmin.auth.admin.signOut(access).catch(() => undefined);
  clearSessionCookies(res);
  res.json({ ok: true });
});

authRouter.get('/me', async (req, res) => {
  res.json({ user: req.user ? await currentUser(req.user.id) : null });
});

const profileSchema = z
  .object({
    name: z.string().trim().min(2).max(100).optional(),
    phone: phoneField.optional(),
  })
  .strict();

authRouter.patch('/profile', async (req, res) => {
  const user = requireUser(req);
  const input = parse(profileSchema, req.body);
  if (input.phone && (await one(pool, 'select 1 from profiles where phone = $1 and id <> $2', [input.phone, user.id]))) {
    throw conflict('Nomor HP sudah dipakai akun lain.', 'PHONE_TAKEN');
  }
  await run(pool, 'update profiles set name = coalesce($1, name), phone = case when $2::boolean then $3 else phone end where id = $4', [
    input.name ?? null,
    input.phone !== undefined,
    input.phone ?? null,
    user.id,
  ]);
  res.json({ user: await currentUser(user.id) });
});

authRouter.post('/change-password', authLimiter, async (req, res) => {
  const user = requireUser(req);
  const { currentPassword, newPassword } = parse(
    z.object({ currentPassword: z.string().min(1).max(100), newPassword: passwordField }).strict(),
    req.body,
  );
  const { error } = await authClient().auth.signInWithPassword({ email: user.email, password: currentPassword });
  if (error) throw badRequest('Password saat ini salah.', 'BAD_PASSWORD');
  const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(user.id, { password: newPassword });
  if (updateError) throw badRequest(updateError.message, 'CHANGE_FAILED');
  res.json({ ok: true });
});
