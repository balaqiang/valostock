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
| Login | `POST /api/auth/login` → GoTrue `signInWithPassword` → API sets `vs_at` (access token, httpOnly, ~1h) + `vs_rt` (refresh token, httpOnly, 30d). |
| Each request | `loadUser` verifies `vs_at` with `supabase.auth.getClaims()` (JWKS / JWT secret of the local project). If expired, it uses `vs_rt` → `refreshSession` → new cookies. Then loads `profiles` (role, ban flag). |
| Logout | GoTrue `signOut` (revokes the refresh token) + clear cookies. |
| Forgot password | `POST /api/auth/forgot` → GoTrue sends the reset email (visible in Mailpit locally) → `/reset-password` page → `POST /api/auth/reset`. |
| Admin roles | `profiles.role = 'ADMIN'` + RBAC tables (`admin_roles`, `permissions`, …). Checked by `requirePermission('catalogs:moderate')` on every admin endpoint. |

Why not the browser SDK: tokens stay in httpOnly cookies (never readable by JavaScript), and the frontend stays a plain API client.

---

## 3. Backend — `back/` (Express.js)

**Stack:** Node.js 20+ · Express 5 · TypeScript strict (`tsx` / `tsc`) · **pg** (node-postgres) · **@supabase/supabase-js** (Auth + Storage, service role) · zod · helmet · cors · cookie-parser · express-rate-limit · multer (uploads, memory storage) · node-cron (light jobs).

```
back/src/
├── server.ts  app.ts
├── config/        env.ts (zod), money.ts (MONEY_RULES), constants.ts
├── db/            pool.ts (pg Pool, query helpers, withTransaction)
├── supabase/      client.ts (service-role client), storage.ts (upload, signed URLs)
├── middlewares/   auth (loadUser/refresh), require-permission, security (origin, rate limits, errors), upload
├── lib/           errors, ids, ledger (store & balance & loyalty), audit, notify (in-app notifications), name-match
├── jobs/          scheduler.ts — expiries & window closers (offers, locks, flash sales, featured, subscriptions)
└── modules/       auth · catalog (public) · games · store-catalogs · moderation · orders · offers · chat · rekber
                   disputes · ratings · payments · topup · balance · stores · subscriptions · promotions (vouchers,
                   flash sales, bundles) · ads · inspections · resellers (external sellers, transfers) · engagement
                   (wishlist, follows, recently viewed, notifications, loyalty) · affiliate · reports · cms (news, help)
                   · withdrawals · admin (dashboard, users, rbac, audit, finance)
```

Layering: `*.routes.ts` (zod validation, response shape) → `*.service.ts` (rules + transactions) → SQL in the service or a `*.repository.ts`. SQL never appears in routes or in `front/`.

**Database rules**
- Parameterised SQL only (`$1, $2 …`). One `withTransaction` per money operation; balance rows locked with `SELECT … FOR UPDATE`.
- Every balance change writes a ledger row with `balance_after` (`store_ledger`, `balance_ledger`, `loyalty_ledger`).
- Idempotency: unique keys (`payments.midtrans_order_id`, `webhook_events(source, external_id)`, `balance_topups(user_id, idempotency_key)`) + "only move out of PENDING" guards.
- **RLS is enabled on every table with no policies** → the anon/authenticated roles of Supabase's REST API cannot read anything. Only the API's own Postgres connection (dedicated role `valostock_api`) and the service role can.

**Jobs (node-cron, every minute, idempotent SQL):** expire offers (`expires_at`), release catalogs of unpaid orders after 60 min, expire paid locks (30 min), auto-complete orders 5 h after SAFE (escrow release), end flash sales, expire featured listings and subscriptions, mark dispute deadlines as overdue. Everything a job does is also safe if it runs late or twice.

---

## 4. Frontend — `front/` (Next.js 16)

- `src/lib/api.ts` (browser) and `src/lib/api-server.ts` (Server Components, forwards cookies) are the only ways to reach the backend.
- All pages read real data from the API. `src/lib/mock` is only the **seed source** for `supabase/seed.sql` (generated by `back/scripts/generate-seed.ts`).
- Admin panel: `/admin/*` with a sidebar layout (see `ADMIN_PANEL.md`). Store dashboard: `/store-dashboard/*`. Buyer area: `/account/*`.
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

Profile → deposit (Midtrans) → `PENDING_REVIEW` → admin approves (`ACTIVE`) or rejects with a note. No KYC provider.

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
