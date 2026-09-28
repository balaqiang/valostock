# valostock.id — Web (`front/`)

Next.js 16 frontend for the valostock.id prototype. It **only renders UI and calls the Express API** in `../back`
(architecture: `../docs/ARCHITECTURE.md`). No database, no payment keys, no business logic here.

## Run

```bash
cp .env.example .env.local   # NEXT_PUBLIC_API_URL=http://localhost:4000
npm install
npm run dev                  # http://localhost:3000
```

Start the backend first (`../back`, Express on :4000 with MySQL from XAMPP). Every page reads its data from the
API; without it pages render empty and actions show "Server API tidak dapat dihubungi".

## Where data comes from

| Data | Source |
|---|---|
| Session, user, Balance | `GET /api/auth/me` via `src/lib/auth.ts` (httpOnly cookie set by the API) |
| Games, stores, listings, top-up products, help | `src/lib/data/catalog.ts` → public API |
| Orders, rekber messages | `src/lib/data/buyer.ts`, `components/orders/*` → `/api/me/orders`, `/api/orders/:id` |
| Transactions, Balance ledger, admin analytics | `src/lib/data/me.ts` |
| Store dashboard: identity, catalogs, orders, balance, withdrawals | `src/lib/data/store.ts` → `/api/stores/me/*` |
| Payments | the API returns a redirect URL (Midtrans Snap or `/payment/simulate`); `/payment/finish` asks the API for the status |
| Offers, wishlist, follows, points, affiliate, notifications, chats, subscriptions, ads, vouchers, flash sales, bundles, analytics, ratings, external sellers | **Demo only** — `src/lib/mock`, read through `src/lib/data/*` (not in the prototype scope) |

- `src/lib/api.ts` is the only way the browser reaches the backend; `src/lib/api-server.ts` does the same for Server
  Components and forwards the visitor's cookie.
- `src/lib/mock/*` is also the seed source for `back/database/seed.sql` (`npm run db:seed:gen` in `back/`). ESLint blocks
  runtime imports of it outside `src/lib/data`.
- Money shown in the UI (`src/lib/fees.ts`) is a display-only preview — the API recomputes every amount.

## Images

All site images are static files in `public/images/` (served at `/images/...`, including the favicon).

## Scripts

```bash
npm run dev     # dev server
npm run build   # production build (must pass with zero TypeScript errors)
npm run lint
```
