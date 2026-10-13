# valostock.id — Web (`front/`)

Next.js 16 frontend. It **only renders UI and calls the Express API** in `../back` (see `../docs/ARCHITECTURE.md`,
API contract in §3.1). No database access, no Supabase keys, no money logic here — every price and total is quoted by
the API.

## Run

```bash
cp .env.example .env.local   # NEXT_PUBLIC_API_URL=http://localhost:4000
npm install
npm run dev                  # http://localhost:3000
```

Start the API (`../back`, `npm run dev`) first. Without it, pages render their empty state and actions show
"Server API tidak dapat dihubungi".

## Where data comes from

| Data | Source |
|---|---|
| Session and user | `GET /api/auth/me` via `src/lib/auth.ts` (httpOnly cookies set by the API) and `src/lib/hooks/use-session.ts` in the browser |
| Games and their products | `src/lib/data/games.ts` |
| Own transactions and Balance ledger | `src/lib/data/me.ts` |
| Admin panel (`/api/admin/*`) | `src/lib/data/admin.ts` |
| Order summary, Balance total | `GET /api/topup/quote`, `GET /api/balance/quote` from the form components |
| Payments | the API returns a redirect URL (Midtrans Snap or `/payment/simulate`); `/payment/finish` asks the API for the status |

- `src/lib/api.ts` is the only way the browser reaches the backend; `src/lib/api-server.ts` does the same for Server
  Components, forwards the visitor's cookie and marks the request as SSR (`x-valostock-ssr`) so the API never rotates
  the refresh token on the server.
- Response types: `src/types/api.ts`.

## Structure

- `src/app` — Beranda (`/`), `topup/[game]`, `topup/invoice`, `(auth)` login/register, `payment`, `balance`, `account`,
  `admin`, `legal` (route tree: `../docs/SITEMAP.md`).
- `src/components/layout` — navbar, footer, `SiteShell` page frame.
- `src/components/dashboard` — small admin kit (`ui.tsx`, `action-button.tsx`, `api-form.tsx`).
- Images are static files in `public/images/` (logo, game banners, product icons, payment logos).

## Scripts

```bash
npm run dev     # dev server
npm run build   # production build (zero TypeScript errors)
npm run lint
```
