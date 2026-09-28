# valostock.id — Web (`front/`)

Next.js 16 frontend. It **only renders UI and calls the Express API** in `../back` (see `../docs/ARCHITECTURE.md`,
API contract in §3.1). No database access, no Supabase keys, no money or trust logic here.

## Run

```bash
cp .env.example .env.local   # NEXT_PUBLIC_API_URL=http://localhost:4000
npm install
npm run dev                  # http://localhost:3000
```

Start Supabase (`npx supabase start` in the repo root) and the API (`../back`, `npm run dev`) first. Without the API,
pages render their empty state and actions show "Server API tidak dapat dihubungi".

## Where data comes from

| Data | Source |
|---|---|
| Session, user, permissions | `GET /api/auth/me` via `src/lib/auth.ts` (httpOnly cookies set by the API) and `src/lib/hooks/use-session.ts` in the browser |
| Games, field templates, stores, listings, top-up products, help, news | `src/lib/data/catalog.ts` |
| Orders, disputes, offers, wishlist, follows, notifications, chat, points, referral, reports | `src/lib/data/buyer.ts` |
| Store dashboard (`/api/stores/me/*`) | `src/lib/data/store.ts` |
| Admin panel (`/api/admin/*`) | `src/lib/data/admin.ts` |
| Top-up / Balance history | `src/lib/data/me.ts` |
| Payments | the API returns a redirect URL (Midtrans Snap or `/payment/simulate`); `/payment/finish` asks the API for the status |

- `src/lib/api.ts` is the only way the browser reaches the backend (JSON or `FormData` uploads);
  `src/lib/api-server.ts` does the same for Server Components, forwards the visitor's cookie and marks the request as
  SSR (`x-valostock-ssr`) so the API never rotates the refresh token on the server.
- Response types: `src/types/api.ts` and `src/types/domain.ts`.
- `src/lib/mock/*` is **only** the seed source for `supabase/seed.sql` (`npm run db:seed:gen` in `back/`); pages never
  import it.
- Fee numbers shown before checkout (`src/lib/fees.ts`) are display-only previews — the API computes every amount.

## Structure

- `src/app/(marketplace)`, `(auth)`, `(buyer)` — public site, auth pages, buyer area, orders and disputes.
- `src/app/(store)/store-dashboard` — store dashboard (template-driven catalog form, photo upload, moderation status).
- `src/app/admin` — admin panel (sidebar filtered by permissions, see `../docs/ADMIN_PANEL.md`).
- `src/components/dashboard` — shared dashboard kit (`ui.tsx`, `action-button.tsx`, `api-form.tsx`, `review-history.tsx`).

## Images

Site images are static files in `public/images/`. Catalog photos come from the public Supabase Storage bucket
(`http://127.0.0.1:55321/storage/v1/object/public/catalog-images/…`, allowed in `next.config.ts`).

## Scripts

```bash
npm run dev     # dev server
npm run build   # production build (zero TypeScript errors)
npm run lint
```
