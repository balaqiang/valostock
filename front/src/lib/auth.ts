import { cache } from 'react';
import { notFound, redirect } from 'next/navigation';
import { serverApiGet } from '@/lib/api-server';
import type { PublicUser } from '@/types/api';

// Sessions are owned by the Express API (httpOnly access + refresh cookies).
// These helpers only ask the API who the visitor is; the page guards below are
// a redirect convenience — every protected API route re-checks on its own.

/** Current logged-in user for Server Components, or null. Cached per request. */
export const getCurrentUser = cache(async (): Promise<PublicUser | null> => {
  const data = await serverApiGet<{ user: PublicUser | null }>('/api/auth/me');
  return data?.user ?? null;
});

/** For `auth`-guarded pages: the current user, or a redirect to /login. */
export async function requireUser(returnTo: string): Promise<PublicUser> {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(returnTo)}`);
  return user;
}

/** For `admin`-guarded pages: 404 for everyone who isn't an admin. */
export async function requireAdmin(returnTo: string): Promise<PublicUser> {
  const user = await requireUser(returnTo);
  if (user.role !== 'ADMIN') notFound();
  return user;
}
