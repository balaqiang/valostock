// Server Components → Express API. Pages that use these render per request
// (never at build time), so they always show the current database state.
import { cache } from "react";
import { headers } from "next/headers";
import { connection } from "next/server";
import { API_URL } from "@/lib/api";

/**
 * Marks server-side requests: the API then never rotates the refresh token on
 * them (the new cookies would reach this server, not the browser, and the
 * visitor would be logged out). The browser refreshes on its own calls.
 */
const SSR_HEADER = { "x-valostock-ssr": "1" };

async function getJson<T>(path: string, cookie: string | null): Promise<T | null> {
  try {
    const res = await fetch(`${API_URL}${path}`, {
      headers: { Accept: "application/json", ...SSR_HEADER, ...(cookie ? { Cookie: cookie } : {}) },
      cache: "no-store",
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

/**
 * GET a JSON resource for the current visitor, forwarding their session
 * cookie so the API authenticates the request itself. Returns null when the
 * visitor is not allowed (401/403/404) or the API is unreachable — pages
 * render their empty/guest state instead of crashing.
 */
export async function serverApiGet<T>(path: string): Promise<T | null> {
  return getJson<T>(path, (await headers()).get("cookie"));
}

/** Public data (no cookie). */
export async function publicApiGet<T>(path: string): Promise<T | null> {
  await connection();
  return getJson<T>(path, null);
}

export type ApiStatus = "ok" | "api-down" | "db-down";

/**
 * Whether the Express API (and through it the Supabase database) answers.
 * Pages treat an unreachable API like "no data", so this lets the UI say why
 * instead of showing empty lists or "no access". Cached per request.
 */
export const getApiStatus = cache(async (): Promise<ApiStatus> => {
  try {
    // Generous timeout: the first query after idle may open a new connection to a remote (Cloud) database.
    const res = await fetch(`${API_URL}/api/health`, { cache: "no-store", signal: AbortSignal.timeout(8000) });
    return res.ok ? "ok" : "db-down";
  } catch {
    return "api-down";
  }
});
