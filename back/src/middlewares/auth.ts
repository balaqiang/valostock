import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { one, pool } from '../db/pool.js';
import { forbidden, unauthorized } from '../lib/errors.js';

export const SESSION_COOKIE = 'vs_token';
const SESSION_TTL_SECONDS = 24 * 60 * 60;

export interface AuthUser {
  id: string;
  name: string;
  email: string;
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

/** Sets the httpOnly session cookie (JWT, 1 day). */
export function startSession(res: Response, userId: string) {
  const token = jwt.sign({ sub: userId }, env.JWT_SECRET, { algorithm: 'HS256', expiresIn: SESSION_TTL_SECONDS });
  res.cookie(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_TTL_SECONDS * 1000,
  });
}

export function endSession(res: Response) {
  res.clearCookie(SESSION_COOKIE, { path: '/' });
}

/**
 * Reads the session cookie on every request. The user row is re-loaded so a
 * deleted user or a changed role takes effect immediately. Never rejects —
 * routes decide with requireUser / requireAdmin.
 */
export async function loadUser(req: Request, _res: Response, next: NextFunction) {
  const token: unknown = req.cookies?.[SESSION_COOKIE];
  if (typeof token !== 'string') return next();
  try {
    const payload = jwt.verify(token, env.JWT_SECRET, { algorithms: ['HS256'] });
    if (typeof payload === 'object' && typeof payload.sub === 'string') {
      const user = await one<AuthUser>(pool, 'SELECT id, name, email, role FROM users WHERE id = ?', [payload.sub]);
      if (user) req.user = user;
    }
  } catch {
    // Invalid or expired token → treated as a guest.
  }
  next();
}

/** The logged-in user, or 401. */
export function requireUser(req: Request): AuthUser {
  if (!req.user) throw unauthorized();
  return req.user;
}

export function requireAdmin(req: Request): AuthUser {
  const user = requireUser(req);
  if (user.role !== 'ADMIN') throw forbidden('Khusus admin.');
  return user;
}
