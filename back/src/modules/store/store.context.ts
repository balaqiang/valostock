// The store of the logged-in user. Every store endpoint is scoped through
// these helpers — never through a store id taken from the URL (anti-IDOR).
import type { Request } from 'express';
import { one, pool, type Db } from '../../db/pool.js';
import { forbidden, notFound } from '../../lib/errors.js';
import { requireUser, type AuthUser } from '../../middlewares/auth.js';

export interface OwnStore {
  id: string;
  owner_id: string;
  slug: string;
  name: string;
  type: 'OWNER' | 'RESELLER';
  level: 'AUTHORIZED' | 'VERIFIED' | 'PLATINUM';
  status: 'PENDING_DEPOSIT' | 'PENDING_REVIEW' | 'ACTIVE' | 'REJECTED' | 'SUSPENDED' | 'CLOSING' | 'CLOSED';
  owner_legal_name: string;
  description: string | null;
  gradient: string;
  deposit_amount: number;
  deposit_status: 'UNPAID' | 'HELD' | 'RELEASED';
  identity_verified: boolean;
  rating: number;
  reviews: number;
  sold: number;
  followers: number;
  score_desc: number;
  score_attitude: number;
  score_delivery: number;
  review_note: string | null;
  created_at: string;
}

export const findStoreOf = (db: Db, userId: string) => one<OwnStore>(db, 'select * from stores where owner_id = $1', [userId]);

/** The caller's store (any status), or 404. */
export async function ownStore(req: Request): Promise<{ user: AuthUser; store: OwnStore }> {
  const user = requireUser(req);
  const store = await findStoreOf(pool, user.id);
  if (!store) throw notFound('Toko');
  return { user, store };
}

/** The caller's store, which must be ACTIVE (admin-verified) to sell or move money. */
export async function activeStore(req: Request): Promise<{ user: AuthUser; store: OwnStore }> {
  const ctx = await ownStore(req);
  if (ctx.store.status === 'SUSPENDED') throw forbidden('Toko sedang ditangguhkan admin.');
  if (ctx.store.status === 'CLOSING' || ctx.store.status === 'CLOSED') throw forbidden('Toko sedang/sudah ditutup.');
  if (ctx.store.status !== 'ACTIVE') throw forbidden('Toko belum aktif, tunggu verifikasi admin.');
  return ctx;
}

export const toStoreContext = (s: OwnStore) => ({
  id: s.id,
  slug: s.slug,
  name: s.name,
  type: s.type,
  level: s.level,
  status: s.status,
  ownerLegalName: s.owner_legal_name,
  description: s.description ?? '',
  gradient: s.gradient,
  depositAmount: s.deposit_amount,
  depositStatus: s.deposit_status,
  identityVerified: s.identity_verified,
  rating: s.rating,
  reviews: s.reviews,
  sold: s.sold,
  followers: s.followers,
  serviceScore: { descAccuracy: s.score_desc, attitude: s.score_attitude, deliverySpeed: s.score_delivery },
  reviewNote: s.review_note,
  createdAt: s.created_at,
});
