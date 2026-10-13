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

/** Local development / automated tests get 10× headroom; production keeps the strict limits. */
const LIMIT_SCALE = env.NODE_ENV === 'production' ? 1 : 10;

function limiter(windowMinutes: number, limit: number) {
  return rateLimit({
    windowMs: windowMinutes * 60 * 1000,
    limit: limit * LIMIT_SCALE,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    handler: (_req, _res, next) =>
      next(new AppError(429, 'RATE_LIMITED', 'Terlalu banyak percobaan. Coba lagi beberapa menit lagi.')),
  });
}

export const authLimiter = limiter(15, 30);
export const checkoutLimiter = limiter(5, 40);
export const lookupLimiter = limiter(5, 120);

const PG_ERRORS: Record<string, [number, string, string]> = {
  '23505': [409, 'DUPLICATE', 'Data sudah ada.'],
  '23503': [400, 'BAD_REFERENCE', 'Data terkait tidak ditemukan.'],
  '23514': [400, 'CHECK_FAILED', 'Data tidak memenuhi aturan.'],
  '22P02': [400, 'BAD_INPUT', 'Format data tidak valid.'],
};

/** Last middleware: AppError → its status; known DB errors → 4xx; anything else → 500 without internals. */
export const errorHandler: ErrorRequestHandler = (error: unknown, _req, res, _next) => {
  if (error instanceof AppError) {
    res.status(error.status).json({ error: { code: error.code, message: error.message } });
    return;
  }
  if (error instanceof SyntaxError && 'body' in error) {
    res.status(400).json({ error: { code: 'BAD_JSON', message: 'Format JSON tidak valid.' } });
    return;
  }
  const code = typeof error === 'object' && error !== null ? (error as { code?: string }).code : undefined;
  if (code && PG_ERRORS[code]) {
    const [status, errCode, message] = PG_ERRORS[code];
    res.status(status).json({ error: { code: errCode, message } });
    return;
  }
  console.error(error);
  res.status(500).json({ error: { code: 'INTERNAL', message: 'Terjadi kesalahan pada server.' } });
};
