# valostock.id — Web (`front/`)

Next.js 16 frontend for valostock.id. It **only renders UI and calls the Express API** in `../back`
(architecture: `../docs/ARCHITECTURE.md`). No database, no payment keys, no business logic here.

## Run

```bash
cp .env.example .env.local   # NEXT_PUBLIC_API_URL=http://localhost:4000
npm install
npm run dev                  # http://localhost:3000
```

Start the backend first (`../back`, Express on :4000 with MySQL from XAMPP) — login, top-up checkout,
Balance, invoice check, transactions and the store dashboard all go through its API. Without it the
public marketplace pages still render; API-backed actions show "Server API tidak dapat dihubungi".

## Where data comes from

| Data | Source |
|---|---|
| Session, user, balance | `GET /api/auth/me` via `src/lib/auth.ts` (httpOnly cookies set by the API) |
| Transactions, balance ledger, admin analytics | Express API via `src/lib/data/me.ts` |
| Top-up checkout, promo check, Balance fill, invoice check | Express API via `src/lib/api.ts` → Midtrans Snap redirect |
| Store identity for the dashboard | `GET /api/stores/me` via `requireStore` |
| Games, stores, listings, help, dashboard contents | **Temporary:** demo data in `src/lib/mock`, read through `src/lib/data/*` until the API serves them |

- `src/lib/api.ts` is the only way to reach the backend (browser); `src/lib/api-server.ts` does the same for
  Server Components and forwards the visitor's cookies.
- `src/lib/mock/*` is also the seed source for `back/prisma/seed.ts`. ESLint blocks runtime imports of it
  outside `src/lib/data`.
- Money shown in the UI (`src/lib/fees.ts`) is a display-only preview — the API recomputes every amount.

## Images

All site images are static files in `public/images/` (served at `/images/...`, including the favicon).
Private media (inspection, evidence, chat) never goes here — it lives in the backend's private storage.

## Scripts

```bash
npm run dev     # dev server
npm run build   # production build (must pass with zero TypeScript errors)
npm run lint
```
