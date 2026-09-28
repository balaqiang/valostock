import type { ZodType } from 'zod';

/** An error with a user-facing message (Indonesian) and an HTTP status. */
export class AppError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export const badRequest = (message: string, code = 'BAD_REQUEST') => new AppError(400, code, message);
export const unauthorized = (message = 'Silakan masuk terlebih dahulu.') => new AppError(401, 'UNAUTHORIZED', message);
export const forbidden = (message = 'Kamu tidak punya akses ke data ini.') => new AppError(403, 'FORBIDDEN', message);
export const notFound = (what = 'Data') => new AppError(404, 'NOT_FOUND', `${what} tidak ditemukan.`);
export const conflict = (message: string, code = 'CONFLICT') => new AppError(409, code, message);

/** Validate untrusted input; the first issue becomes a 400 message. */
export function parse<T>(schema: ZodType<T>, input: unknown): T {
  const result = schema.safeParse(input);
  if (!result.success) {
    const issue = result.error.issues[0];
    const field = issue?.path.join('.');
    throw badRequest(field ? `${field}: ${issue?.message}` : (issue?.message ?? 'Data tidak valid.'), 'VALIDATION');
  }
  return result.data;
}
