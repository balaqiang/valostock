// Admin panel data. Every endpoint re-checks the admin role on the server;
// null means "not allowed" (401/403) or the API is unreachable.
import { serverApiGet } from '@/lib/api-server';

export const adminGet = <T>(path: string) => serverApiGet<T>(`/api/admin${path}`);
