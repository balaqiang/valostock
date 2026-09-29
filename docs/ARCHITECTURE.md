# ARCHITECTURE — valostock.id (Express.js API + Next.js Web · Supabase Postgres/Auth/Storage)

**Source of Truth: Code Structure**
Version 8.0 · College-assignment project · Runs locally with Docker (own Supabase project)

> **v8.0 changes:**
> - **Database: MySQL/XAMPP → PostgreSQL 17 in a dedicated local Supabase project** (`supabase/` in this repo, project_id `valostock`, ports 55321–55329). The Supabase project of another app on this machine (`yowana`, ports 543xx) is never touched.
> - **Auth: Supabase Auth (GoTrue).** The Express API calls GoTrue for register/login/refresh/reset and keeps the tokens in **httpOnly cookies**; each `auth.users` row has a `public.profiles` row.
> - **Storage: Supabase Storage** — `catalog-images` (public) for listing photos, `private-media` (private, signed URLs) for inspection media, rekber/dispute attachments.
> - **Catalog moderation:** stores submit catalogs, an **admin verifies each product** before it is sold (`DRAFT → PENDING_REVIEW → LISTED`, or `REJECTED` with a reason).
> - **Admin panel** with RBAC — see [`ADMIN_PANEL.md`](ADMIN_PANEL.md).
> - **All product features work:** offers, ratings + service score, disputes, store vouchers, wishlist, follows, in-app notifications, loyalty points, recently viewed, subscriptions, featured ads, flash sales, bundles, inspections, analytics, external sellers + transfer requests, store chat, user reports, affiliate, news/help CMS.
> - **Still simulated (external services):** Midtrans Iris payouts, Digiflazz top-up delivery, WhatsApp/Discord/Telegram notifications. Midtrans **Snap** runs in Sandbox or in the built-in simulation mode.
> - System modelling stays **Data Flow** (`docs/modeling/`), no UML.

---

## 1. Services

```
tugas/
├── docs/          → source of truth (+ docs/modeling for the assignment)
├── supabase/      → local Supabase project "valostock": config.toml, migrations/*.sql, seed.sql
├── back/          → Express.js API (all business logic)                       :4000
└── front/         → Next.js 16 web (UI + API client only)                     :3000
```

| Supabase service (project `valostock`) | Local URL |
|---|---|
| API gateway (Auth, Storage, REST) | `http://127.0.0.1:55321` |
| Postgres | `postgresql://postgres:postgres@127.0.0.1:55322/postgres` |
| Studio (table editor, SQL, storage browser) | `http://127.0.0.1:55323` |
| Mailpit (auth emails: confirm, reset password) | `http://127.0.0.1:55324` |

```mermaid
flowchart LR
    B[Browser] -->|pages| F[front · Next.js :3000]
    B -->|fetch + httpOnly cookies| A[back · Express :4000]
    F -->|server fetch, forwards cookies| A
    A -->|pg · parameterised SQL| DB[(Postgres · Supabase :55322)]
    A -->|supabase-js · service role| AU[Supabase Auth / GoTrue]
    A -->|supabase-js · service role| ST[Supabase Storage]
    AU --- DB
    A -->|Snap + Status API| MT[Midtrans Sandbox]
    MT -.->|webhook, optional| A
    ADM[Developer] -.->|Studio :55323| DB
```

The web app has **no Supabase keys and no database access**. Everything goes through the Express API. The browser never talks to Supabase directly, so all business rules stay in one place.

---

## 2. Authentication — Supabase Auth behind the API

| Step | What happens |
|---|---|
| Register | `POST /api/auth/register` → API calls GoTrue `signUp` (email + password, `data: { name, phone, ref }`). A DB trigger `on_auth_user_created` inserts `public.profiles`. Local config: email confirmation **off** for easy demos (on in production). |
| Login | `POST /api/auth/login` (email **or phone** + password) → GoTrue `signInWithPassword` → API sets `vs_at` (access token, httpOnly, 1 day — `jwt_expiry` in `supabase/config.toml`) + `vs_rt` (refresh token, httpOnly, 30 days). Banned profiles are refused. |
| Each request | `loadUser` verifies `vs_at` with `supabase.auth.getUser()`. If it expired and the request comes from the **browser**, it uses `vs_rt` → `refreshSession` → new cookies. Server-side (SSR) requests from Next.js carry `x-valostock-ssr: 1` and never refresh — refresh tokens rotate, so new cookies would land on the Next.js server and log the visitor out (the login page refreshes in the browser and continues). Then loads `profiles` (role, ban flag). |
| Logout | GoTrue admin `signOut` (revokes the session) + clear cookies. |
| Profile | `PATCH /api/auth/profile` (name, phone) · `POST /api/auth/change-password` (re-checks the current password). |
| Forgot password | `POST /api/auth/forgot` → GoTrue sends the reset email (visible in Mailpit locally) → `/reset-password` page → `POST /api/auth/reset`. |
| Admin roles | `profiles.role = 'ADMIN'` + RBAC tables (`admin_roles`, `permissions`, …). Checked by `requirePermission('catalogs:moderate')` on every admin endpoint. |

Why not the browser SDK: tokens stay in httpOnly cookies (never readable by JavaScript), and the frontend stays a plain API client.

---

## 3. Backend — `back/` (Express.js)

**Stack:** Node.js 20+ · Express 5 · TypeScript strict (`tsx` / `tsc`) · **pg** (node-postgres) · **@supabase/supabase-js** (Auth + Storage, service role) · zod · helmet · cors · cookie-parser · express-rate-limit · multer (uploads, memory storage) · node-cron (light jobs).

```
back/src/
├── server.ts  app.ts
├── config/        env.ts (zod), money.ts (MONEY_RULES — the only place fees are computed)
├── db/            pool.ts (pg Pool, all/one/run, json(), withTransaction)
├── supabase/      client.ts (service-role client + anon auth client), storage.ts (magic-byte check, upload, signed URLs)
├── middlewares/   auth.ts (loadUser, requireUser, requirePermission) · security.ts (origin check, rate limits, error mapper) · upload.ts (multer)
├── lib/           errors · ids · ledger (store, Balance, loyalty, referral) · audit · notify · name-match
├── jobs/          scheduler.ts — payment expiry, unpaid orders, auto-complete, offer/lock/ad/plan expiry
└── modules/
    ├── auth/        register (+ref), login (email/phone), logout, me, forgot/reset, profile, change-password
    ├── public/      games + field templates, stores, listings search (template filters), listing detail, help, news, home
    ├── catalogs/    catalogs.service.ts — template validation, images, submit, inspection, admin approve/reject/takedown
    ├── store/       store.routes.ts (onboarding, deposit, profile, dashboard, analytics, catalogs, balance, withdrawals,
    │                subscription, external sellers, transfers, ratings) · promotions.routes.ts (vouchers, flash sales,
    │                bundles, featured ads) · store.context.ts (ownStore / activeStore guards)
    ├── offers/      offers + paid lock
    ├── orders/      checkout pricing, pay, rekber (attachments), safe, complete (escrow release), rating, buy-context
    ├── disputes/    open with evidence, statements, cancel, admin resolution (+ sanctions)
    ├── chat/        buyer ↔ store chat (contact filter) + user reports
    ├── me/          wishlist, follows, recently viewed, recommendations, notifications, points, referral, money history
    ├── payments/    Midtrans Snap / simulation, settlement per purpose, webhook
    ├── topup/       top-up checkout, promo, invoice check, Balance fill
    └── admin/       moderation · transactions & finance · master data & content · users, RBAC, audit, analytics
```

Layering: `*.routes.ts` (zod validation, response shape) → `*.service.ts` (rules + transactions) → SQL in the service or a `*.repository.ts`. SQL never appears in routes or in `front/`.

**Database rules**
- Parameterised SQL only (`$1, $2 …`). One `withTransaction` per money operation; balance rows locked with `SELECT … FOR UPDATE`.
- Every balance change writes a ledger row with `balance_after` (`store_ledger`, `balance_ledger`, `loyalty_ledger`).
- Idempotency: unique keys (`payments.midtrans_order_id`, `webhook_events(source, external_id)`, `balance_topups(user_id, idempotency_key)`) + "only move out of PENDING" guards.
- **RLS is enabled on every table with no policies** → the anon/authenticated roles of Supabase's REST API cannot read anything. Only the API's own Postgres connection (dedicated role `valostock_api`) and the service role can.

**Jobs (node-cron, every minute, idempotent; `JOBS_ENABLED=false` turns them off):** payments still PENDING after 65 min are checked with Midtrans (midtrans mode) and otherwise EXPIRED — which cancels their order / top-up / lock through the normal settlement; unpaid orders are cancelled after 60 min (catalogs back to LISTED); orders SAFE for 5 h are completed (escrow release, points, referral); open offers, active locks and featured listings past their end are expired; paid plans past their period fall back to FREE. Flash sales need no job (active = `now()` between start and end) and dispute deadlines are compared on read ("overdue").

### 3.1 API contract (all under `/api`, JSON; errors are `{ error: { code, message } }`)

| Group | Endpoints | Guard |
|---|---|---|
| Auth | `POST auth/register · login · logout · forgot · reset · change-password`, `GET auth/me`, `PATCH auth/profile` | public / session |
| Public | `GET games`, `games/:slug`, `games/:slug/fields`, `games/:slug/topup-products`, `stores`, `stores/:slug`, `listings?game&store&q&minPrice&maxPrice&sort&attr.<key>&min.<key>`, `listings/:id`, `home`, `help`, `help/:slug`, `news`, `news/:slug`, `site` (CMS texts + active home banners); `POST listings/:id/view`, `help/:slug/helpful` | public |
| Store owner | `POST stores`, `GET/PATCH stores/me`, `POST stores/me/deposit`, `GET stores/me/dashboard · analytics · balance · withdrawals · subscription · ratings · orders · offers · disputes · conversations`, catalogs `GET/POST stores/me/catalogs`, `GET/PATCH/DELETE …/:id`, `POST …/:id/images · submit · withdraw · inspection`, `DELETE …/:id/images/:imageId`, promotions `stores/me/vouchers · flash-sales · bundles · ads`, resellers `stores/me/external-sellers · transfers`, `POST stores/me/withdrawals · subscription · close · deposit-topup · catalogs/bulk` | owner of the store (never by id from the URL) |
| Buying | `GET catalogs/:id/buy-context`, `POST offers`, `POST offers/:id/accept · counter · reject · accept-counter · cancel`, `POST catalogs/:id/lock`, `POST orders`, `GET orders/:id`, `POST orders/:id/pay · cancel · safe · complete · rating · dispute`, `GET/POST orders/:id/messages` | buyer / store owner / admin of that order |
| Disputes | `GET disputes/:id`, `POST disputes/:id/events · cancel` | the two parties or an admin |
| Buyer data | `GET me/orders · offers · disputes · wishlist · following · recently-viewed · recommendations · notifications · points · referral · reports · transactions · balance-ledger`; wishlist/follow/notification/points writes | session |
| Chat & reports | `GET/POST chat/conversations`, `GET/POST chat/conversations/:id/messages`, `POST reports` | participants / session |
| Top-up | `GET topup/promo`, `POST topup/checkout`, `GET topup/invoice?q`, `POST balance/topup` | public / session |
| Payments | `GET payments/:invoice/status`, `POST payments/:invoice/simulate` (simulation mode only), `POST webhooks/midtrans` | public (state comes from Midtrans) |
| Admin | `admin/queue-counts · dashboard`, `admin/catalogs(/:id)(/approve|reject|takedown)`, `admin/stores(/:id)(/approve|reject|suspend|reactivate|level)`, `admin/reports(/:id)`, `admin/orders(/:id/cancel)`, `admin/disputes(/:id/resolve)`, `admin/topups · payments · finance · ads(/:id/stop)`, `admin/withdrawals/:id · transfers/:id · refunds(/:id/complete)`, `admin/topups/:id/refund`, `admin/users/:id/balance-adjust`, `admin/stores/:id/sanctions · close-decision`, `admin/games(/:id)(/fields) · fields/:id · topup-products · promo-codes · news · help`, `admin/cms/settings · banners(/:id) · uploads · games/:id/banner`, `admin/users(/:id)(/ban|unban) · admins(/:id/roles) · audit · analytics` | `requirePermission('<modul:aksi>')` per ADMIN_PANEL §2 |

Tests: `npm run test:smoke` (14 end-to-end steps), `npm run test:features` (9 steps: flash sale, voucher, bundle, reseller transfer, lock, ads, reports, master data, ban/RBAC), `npm run test:sweep` (every read endpoint per role).

---

## 4. Frontend — `front/` (Next.js 16)

- `src/lib/api.ts` (browser) and `src/lib/api-server.ts` (Server Components, forwards cookies) are the only ways to reach the backend.
- All pages read real data from the API. `src/lib/mock` is only the **seed source** for `supabase/seed.sql` (generated by `back/scripts/generate-seed.ts`).
- Data layer: `src/lib/data/catalog.ts` (public), `buyer.ts`, `store.ts`, `admin.ts`, `me.ts` — typed getters over `serverApiGet`; response types in `src/types/api.ts` and `src/types/domain.ts`.
- Admin panel: `/admin/*` with a sidebar layout (see `ADMIN_PANEL.md`) — menu filtered by the admin's permissions, queue badges from `GET /api/admin/queue-counts`. Store dashboard: `/store-dashboard/*` (stores in `PENDING_REVIEW` may already prepare draft catalogs). Buyer area: `/account/*`, orders `/orders/[id]`, disputes `/disputes/[id]`.
- Shared dashboard pieces: `components/dashboard/ui.tsx` (header, stat card, panel, table, status tabs), `action-button.tsx` (one API call + confirm/prompt + refresh), `api-form.tsx` (small JSON forms), `review-history.tsx`.
- The catalog form is generated from the game's field templates; the per-game account pages build their filters from the same templates (`attr.<key>` / `min.<key>`), filtered by the API.
- Images: site images from `public/images`; catalog photos from Supabase Storage public URLs (`127.0.0.1:55321/storage/v1/object/public/catalog-images/...`, allowed in `next.config.ts`).

---

## 5. Key flows

### 5.1 Catalog moderation (new)

```mermaid
stateDiagram-v2
    [*] --> DRAFT: store saves
    DRAFT --> PENDING_REVIEW: store submits (store ACTIVE, listing quota)
    PENDING_REVIEW --> LISTED: admin approves
    PENDING_REVIEW --> REJECTED: admin rejects + reason
    PENDING_REVIEW --> DRAFT: store withdraws the submission
    REJECTED --> PENDING_REVIEW: store edits & resubmits
    LISTED --> PENDING_REVIEW: store edits title/price/photos/attributes
    LISTED --> DELISTED: store hides / admin takes down
    DELISTED --> PENDING_REVIEW: store resubmits
    LISTED --> LOCKED: buyer creates order
    LOCKED --> LISTED: order cancelled / unpaid 60 min
    LOCKED --> IN_ORDER: payment PAID
    IN_ORDER --> SOLD: order completed
    IN_ORDER --> LISTED: order refunded (dispute won by buyer)
```

Every decision is stored in `catalog_reviews` (who, when, decision, reason) and `audit_logs`. The VS code is issued when the catalog is first submitted.

### 5.2 Account purchase

`LISTED` catalog (optionally reserved first with a paid **Lock** Rp5.000 / 30 min; price = accepted offer / bundle / flash-sale price, minus store voucher) → order `PENDING_PAYMENT` (catalogs `LOCKED`) → Midtrans Snap → `PAID` (escrow hold) → store sends account in rekber → `IN_REKBER` → buyer "Akun aman" → `SAFE` → buyer "Selesai" (or automatically **5 hours after SAFE**, per MONEY_RULES §9) → `COMPLETED`: escrow released, commission by the store's subscription tier (5% / 4.5% / 4%), loyalty points earned, rating unlocked. A dispute can be opened while the order is `PAID/IN_REKBER/SAFE` (escrow still held) or during the 14/30-day protection window after completion.

### 5.3 Payments — Midtrans Snap (Sandbox) + simulation mode

Unchanged from v7: one `payments` row per payment, `purpose` ∈ `TOPUP · BALANCE_FILL · ORDER · STORE_DEPOSIT · SUBSCRIPTION · AD · LOCK`. Status only comes from the Midtrans Status API, a signed webhook, or (simulation mode only) the simulate endpoint.

### 5.4 Store verification

Profile → deposit (Midtrans) → `PENDING_REVIEW` → admin approves (`ACTIVE`, deposit booked as `DEPOSIT_HOLD`) or rejects with a note. No KYC provider.

```mermaid
stateDiagram-v2
    [*] --> PENDING_DEPOSIT: store profile
    PENDING_DEPOSIT --> PENDING_REVIEW: deposit PAID
    PENDING_REVIEW --> ACTIVE: admin approves
    PENDING_REVIEW --> REJECTED: admin rejects + reason
    ACTIVE --> SUSPENDED: admin sanction / report
    SUSPENDED --> ACTIVE: admin reactivates
    ACTIVE --> CLOSING: store requests closure (nothing pending, balance withdrawn)
    CLOSING --> CLOSED: admin approves (DEPOSIT_REFUND)
    CLOSING --> ACTIVE: admin rejects + reason
```

### 5.5 Refunds and corrections

Money that arrives for something that no longer exists goes to the `refunds` queue (order paid after cancel, lock paid for an unavailable account, undelivered top-up of a guest); an admin completes it (Midtrans refund simulated). Undelivered top-ups of logged-in buyers are refunded to Balance. Admins can correct a Balance (`ADJUSTMENT`) and fine a store from its deposit (`DEPOSIT_DEDUCTION`). All of it is ledger + audit.

---

## 6. Local development

```bash
# 1. Supabase project for valostock (own containers, ports 553xx)
npx supabase start            # in the repo root (reads supabase/config.toml)
npx supabase db reset         # applies supabase/migrations + supabase/seed.sql
# 2. API
cd back && cp .env.example .env && npm install && npm run dev      # :4000
# 3. Web
cd front && cp .env.example .env.local && npm install && npm run dev # :3000
```

`npx supabase status` prints the local keys for `back/.env` (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY`).

### 6.1 Without Docker — Supabase Cloud

The same code runs against a free **Supabase Cloud** project; only `back/.env` changes (step-by-step guide in Indonesian: [`SETUP_CLOUD.md`](SETUP_CLOUD.md)).

- `npm run cloud:setup -- "<session pooler URL as postgres>" [--reset]` pushes `supabase/migrations` + `seed.sql` with the Supabase CLI (`db push --db-url`, no Docker), replaces the public dev password of `valostock_api` with a random one, checks the role (BYPASSRLS) and both Storage buckets, and writes `DATABASE_URL` (pooler, user `valostock_api.<ref>`) + `DATABASE_SSL=require` into `back/.env`.
- Storage buckets are created by a migration (same limits as `config.toml`), so a Cloud project gets them from `db push`.
- `DATABASE_SSL`: `off` (default, local Docker) or `require` (encrypted; the Supabase CA is not in Node's trust store, so the certificate chain is not verified).
- Auth settings that `config.toml` sets locally must be set in the dashboard: **Confirm email off**, Site URL `http://localhost:3000`.
- Security model is unchanged: RLS on every table without policies, the API connects as `valostock_api`; the `anon` key cannot read data.

---

## 7. Principles

1. Backend owns everything; the web app never computes or mutates money/trust.
2. Ledger-first money; every change in one transaction with a ledger row.
3. Payment status only from Midtrans (or simulation mode).
4. Nothing is sold before an admin approved the store **and** the product.
5. Anti double-sell: unique VS code + catalog state machine.
6. Per-resource authorisation (buyer / store owner / admin permission) on every endpoint; RLS as a second wall.
7. Balance is closed-loop (top-up only).
8. Every admin decision is audit-logged.

## 8. Future work

Real Midtrans Iris payouts + account validation, real Digiflazz fulfilment, WhatsApp/Discord/Telegram delivery, Google OAuth, 2FA for admins, production hosting (managed Supabase or VPS), legal review of escrow custody, penetration test.
