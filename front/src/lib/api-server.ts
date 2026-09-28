// Server Components → Express API, forwarding the visitor's cookies so the
// API authenticates the request itself (the web app never reads tokens).
import { headers } from "next/headers";
import { API_URL } from "@/lib/api";

/**
 * GET a JSON resource for the current visitor. Returns null when the visitor
 * is not allowed (401/403/404) or the API is unreachable — pages render their
 * empty/guest state instead of crashing.
 */
export async function serverApiGet<T>(path: string): Promise<T | null> {
  const cookie = (await headers()).get("cookie");
  try {
    const res = await fetch(`${API_URL}${path}`, {
      headers: { Accept: "application/json", ...(cookie ? { Cookie: cookie } : {}) },
      cache: "no-store",
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}
