// The only way the web app reaches the Express API (back/). Business logic,
// money math and secrets live there — this file only moves JSON.
// Cookies are httpOnly and set by the API; `credentials: "include"` sends them.

export const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000").replace(/\/$/, "");

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/** Error body of the API: `{ error: { code, message } }` (docs/ARCHITECTURE.md §3.2). */
type ErrorBody = { error?: { code?: string; message?: string } };

/** Browser-side call to the API. Throws ApiError with a user-facing message. */
export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      ...init,
      credentials: "include",
      headers: {
        Accept: "application/json",
        // JSON bodies only — FormData (file uploads) sets its own multipart boundary.
        ...(typeof init.body === "string" ? { "Content-Type": "application/json" } : {}),
        ...init.headers,
      },
    });
  } catch {
    throw new ApiError(
      "Server API tidak dapat dihubungi. Pastikan backend (back/) sedang berjalan.",
      0,
      "API_UNREACHABLE",
    );
  }

  const body: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    const error = (body as ErrorBody | null)?.error;
    throw new ApiError(error?.message ?? `Permintaan gagal (${res.status}).`, res.status, error?.code);
  }
  return body as T;
}
