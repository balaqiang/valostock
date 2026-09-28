import type { ErrorRequestHandler, NextFunction, Request, Response } from 'express';
import { rateLimit } from 'express-rate-limit';
import { env } from '../config/env.js';
import { AppError } from '../lib/errors.js';

const UNSAFE = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/**
 * CSRF defence next to SameSite=Lax cookies: a browser request that changes
 * data must come from the web app. Requests without an Origin header (server
 * to server, e.g. the Midtrans webhook) pass.
 */
export function originCheck(req: Request, _res: Response, next: NextFunction) {
  const origin = req.headers.origin;
  if (UNSAFE.has(req.method) && origin && origin !== env.FRONTEND_URL) {
    return next(new AppError(403, 'BAD_ORIGIN', 'Permintaan ditolak (origin tidak dikenal).'));
  }
  next();
}

function limiter(windowMinutes: number, limit: number) {
  return rateLimit({
    windowMs: windowMinutes * 60 * 1000,
    limit,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    handler: (_req, _res, next) =>
      next(new AppError(429, 'RATE_LIMITED', 'Terlalu banyak percobaan. Coba lagi beberapa menit lagi.')),
  });
}

export const authLimiter = limiter(15, 20);
export const checkoutLimiter = limiter(5, 30);
export const lookupLimiter = limiter(5, 60);

/** Last middleware: AppError → its status; anything else → 500 without internals. */
export const errorHandler: ErrorRequestHandler = (error: unknown, _req, res, _next) => {
  if (error instanceof AppError) {
    res.status(error.status).json({ error: { code: error.code, message: error.message } });
    return;
  }
  if (error instanceof SyntaxError && 'body' in error) {
    res.status(400).json({ error: { code: 'BAD_JSON', message: 'Format JSON tidak valid.' } });
    return;
  }
  if (typeof error === 'object' && error !== null && (error as { code?: string }).code === 'ER_DUP_ENTRY') {
    res.status(409).json({ error: { code: 'DUPLICATE', message: 'Data sudah ada.' } });
    return;
  }
  console.error(error);
  res.status(500).json({ error: { code: 'INTERNAL', message: 'Terjadi kesalahan pada server.' } });
};
