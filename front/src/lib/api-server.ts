// Server Components → Express API. Pages that use these render per request
// (never at build time), so they always show the current database state.
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
