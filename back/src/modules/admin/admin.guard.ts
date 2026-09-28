import type { Request } from 'express';
import { z } from 'zod';
import { requirePermission, type AuthUser } from '../../middlewares/auth.js';

/** Admin with the given permission (docs/ADMIN_PANEL.md §2) — checked on the server for every call. */
export const admin = (req: Request, permission: string): Promise<AuthUser> => requirePermission(req, permission);

/** Client IP for the audit log. */
export const ipOf = (req: Request): string | undefined => req.ip ?? undefined;

export const idParam = z.uuid('id tidak valid');
export const reasonText = z.string().trim().min(3, 'alasan wajib diisi').max(1000);
export const optionalNote = z
  .string()
  .trim()
  .max(1000)
  .optional()
  .transform((v) => v || undefined);
