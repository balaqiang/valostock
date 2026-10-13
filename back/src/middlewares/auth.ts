// Supabase Auth behind the API (docs/ARCHITECTURE.md §2). Tokens live in
// httpOnly cookies: vs_at (access JWT) and vs_rt (refresh token).
import type { NextFunction, Request, Response } from 'express';
import type { Session } from '@supabase/supabase-js';
import { env } from '../config/env.js';
import { one, pool } from '../db/pool.js';
import { forbidden, unauthorized } from '../lib/errors.js';
import { authClient, supabaseAdmin } from '../supabase/client.js';

export const ACCESS_COOKIE = 'vs_at';
export const REFRESH_COOKIE = 'vs_rt';
const REFRESH_TTL_MS = 30 * 24 * 60 * 60 * 1000;
/** Set by front/src/lib/api-server.ts on server-side (SSR) requests. */
export const SSR_HEADER = 'x-valostock-ssr';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: 'USER' | 'ADMIN';
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

const cookieBase = () => ({
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: env.NODE_ENV === 'production',
  path: '/',
});

export function setSessionCookies(res: Response, session: Session) {
  res.cookie(ACCESS_COOKIE, session.access_token, { ...cookieBase(), maxAge: session.expires_in * 1000 });
  res.cookie(REFRESH_COOKIE, session.refresh_token, { ...cookieBase(), maxAge: REFRESH_TTL_MS });
}

export function clearSessionCookies(res: Response) {
  res.clearCookie(ACCESS_COOKIE, { path: '/' });
  res.clearCookie(REFRESH_COOKIE, { path: '/' });
}

async function userIdFromAccessToken(token: string): Promise<string | null> {
  const { data, error } = await supabaseAdmin.auth.getUser(token);
  return error || !data.user ? null : data.user.id;
}

/**
 * Resolves the session on every request. An expired access token is refreshed
 * with the refresh token — only for browser requests: refresh tokens rotate, so
 * refreshing on a server-side (SSR) request would hand the new cookies to the
 * Next.js server instead of the browser and log the user out.
 * Never rejects: routes decide with requireUser / requireAdmin.
 */
export async function loadUser(req: Request, res: Response, next: NextFunction) {
  const access: unknown = req.cookies?.[ACCESS_COOKIE];
  const refresh: unknown = req.cookies?.[REFRESH_COOKIE];
  let userId = typeof access === 'string' ? await userIdFromAccessToken(access) : null;

  if (!userId && typeof refresh === 'string' && !req.headers[SSR_HEADER]) {
    const { data, error } = await authClient().auth.refreshSession({ refresh_token: refresh });
    if (!error && data.session) {
      setSessionCookies(res, data.session);
      userId = data.session.user.id;
    } else {
      clearSessionCookies(res);
    }
  }

  if (userId) {
    const profile = await one<AuthUser>(pool, 'select id, email, name, role from profiles where id = $1', [userId]);
    if (profile) req.user = profile;
  }
  next();
}

/** The logged-in user, or 401. */
export function requireUser(req: Request): AuthUser {
  if (!req.user) throw unauthorized();
  return req.user;
}

/** An admin (profiles.role = ADMIN), or 401/403. */
export function requireAdmin(req: Request): AuthUser {
  const user = requireUser(req);
  if (user.role !== 'ADMIN') throw forbidden('Khusus admin.');
  return user;
}
