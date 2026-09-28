# ARCHITECTURE — valostock.id (Prototype · Express.js API + Next.js Web · MySQL/XAMPP)

**Source of Truth: Code Structure**
Version 7.0 · Prototype for a college assignment · Local only (XAMPP)

> **v7.0 changes (prototype scope):**
> - **No ORM.** Prisma removed. The schema is a plain SQL file (`back/database/schema.sql`) imported through **phpMyAdmin**; the API talks to MySQL with **`mysql2`** using parameterised queries only.
> - **Sumsub KYC removed.** Stores are verified **manually by an admin** (approve/reject + audit log).
> - **Midtrans Snap (Sandbox)** for every incoming payment, with a **simulation mode** for demos without keys. **Iris payouts and Digiflazz fulfilment are simulated.**
> - **No background jobs, no Socket.IO, no Redis.** Escrow is released when the buyer presses *Selesai*; rekber chat is stored messages + polling.
> - System modelling uses the **Data Flow approach** — see `docs/modeling/` (Diagram Konteks, DFD, ERD, Basis Data Konseptual, Struktur Tabel). No UML.
>
> Full-scale ideas (Iris, Digiflazz, KYC provider, notifications, subscriptions, ads, production infra) are listed under **§10 Future Work** and are **not** part of the prototype.

---

## 1. Two Services

```
tugas/
├── docs/                    → source of truth (+ docs/modeling for the assignment)
├── front/                   → Next.js 16 web (UI + API client only)            :3000
└── back/                    → Express.js API (all business logic)              :4000
      └── database/          → schema.sql + seed.sql → MySQL (XAMPP/MariaDB)    :3306
```

```mermaid
flowchart LR
    B[Browser] -->|pages| F[front · Next.js :3000]
    B -->|fetch + httpOnly cookie| A[back · Express :4000]
    F -->|server-side fetch, forwards cookie| A
    A -->|mysql2, parameterised SQL| DB[(MySQL · XAMPP :3306)]
    A -->|Snap create + Status API| MT[Midtrans Sandbox]
    MT -.->|notification webhook (optional, needs tunnel)| A
    AD[Admin via phpMyAdmin] -.->|inspect data| DB
```

The web app never touches the database or payment keys. All money, trust and state rules live in `back/`.

---

## 2. Frontend — `front/` (Next.js 16)

**Stack:** Next.js 16 · React 19 · TypeScript (strict) · Tailwind CSS v4 · lucide-react · Framer Motion · zod.

```
front/src/
├── app/                      # routes (marketplace, auth, buyer, store-dashboard, admin, payment, legal)
├── components/               # UI
├── lib/
│   ├── api.ts                # browser → API (credentials: include, typed errors)
│   ├── api-server.ts         # Server Components → API (forwards the visitor's cookie)
│   ├── auth.ts               # getCurrentUser / requireUser / requireAdmin (via GET /api/auth/me)
│   ├── data/                 # page data readers — API-backed; demo-only features still read lib/mock
│   ├── mock/                 # demo data for out-of-scope features + seed source for back/database/seed.sql
│   └── fees.ts               # display-only fee previews (the API recomputes every amount)
└── types/api.ts              # response shapes of the API
```

---

## 3. Backend — `back/` (Express.js, no ORM)

**Stack:** Node.js 20+ · Express 5 · TypeScript (strict, run with `tsx`) · **mysql2/promise** · zod · bcryptjs · jsonwebtoken · cookie-parser · helmet · cors · express-rate-limit. Midtrans is called with `fetch` (Snap + Status API) — no SDK.

```
back/
├── database/
│   ├── schema.sql            # CREATE DATABASE + 19 tables (= docs/modeling/05-struktur-tabel.md)
│   ├── seed.sql              # demo data (generated from front/src/lib/mock)
│   ├── create-user.sql       # dedicated MySQL user for the app
│   └── README.md             # phpMyAdmin import steps
├── scripts/
│   └── generate-seed.ts      # front/src/lib/mock → database/seed.sql
├── src/
│   ├── server.ts             # start HTTP server
│   ├── app.ts                # middleware chain + routers + error handler
│   ├── config/
│   │   ├── env.ts            # zod-validated .env (fails fast)
│   │   └── money.ts          # MONEY_RULES constants + fee/commission functions (integer Rupiah)
│   ├── db/
│   │   └── pool.ts           # mysql2 pool, query helpers, withTransaction()
│   ├── middlewares/          # auth, require-role, validate(zod), origin-check, rate-limit, error-handler
│   ├── lib/                  # AppError, ids & invoice numbers, audit log, name matching
│   └── modules/              # one folder per domain:  *.routes.ts → *.service.ts → *.repository.ts
│       ├── auth/  catalog/  topup/  balance/  payments/
│       ├── orders/  stores/  me/  admin/
└── .env / .env.example
```

**Layering:** `routes` parse + validate the request (zod) and shape the response → `service` holds business rules and opens DB transactions → `repository` is the only place with SQL.

### 3.1 Database access rules (mysql2)
- **Always parameterised:** `pool.execute('SELECT … WHERE id = ?', [id])`. Never build SQL by string concatenation with user input.
- **Transactions** for every money change: `withTransaction(async (conn) => { … })` = `BEGIN` → work → `COMMIT` (or `ROLLBACK` on error).
- **Row locks:** balance rows are read with `SELECT … FOR UPDATE` inside the transaction before being changed.
- **Ledger first:** every change of `users.balance` or `store_balances` writes a `balance_ledger` / `store_ledger` row with `balance_after` in the same transaction.
- **Idempotency:** unique keys (`payments.midtrans_order_id`, `webhook_events(source, external_id)`, `balance_topups(user_id, idempotency_key)`) plus "only move from PENDING" status guards.

### 3.2 Request pipeline
```
helmet → cors(FRONTEND_URL, credentials) → json(limit 100kb) → cookie-parser
→ origin-check (POST/PATCH/DELETE must come from FRONTEND_URL) → rate-limit (auth, checkout)
→ auth (JWT cookie → req.user) → require-role → validate(zod) → handler → error-handler
```

### 3.3 API contract

Base `/api`, JSON, money in integer Rupiah. Errors: `{ "error": { "code": "…", "message": "…" } }`.

| Area | Endpoints |
|---|---|
| Auth | `POST /auth/register` · `POST /auth/login` · `POST /auth/logout` · `GET /auth/me` |
| Public catalog | `GET /games` · `GET /games/:slug` · `GET /games/:slug/topup-products` · `GET /stores` · `GET /stores/:slug` · `GET /listings?game=&store=` · `GET /listings/:id` · `GET /help` · `GET /help/:slug` |
| Top-up | `GET /topup/promo?code=` · `POST /topup/checkout` · `GET /topup/invoice?q=` |
| Balance | `POST /balance/topup` |
| Me | `GET /me/transactions` · `GET /me/balance-ledger` · `GET /me/orders` · `GET /me/orders/:id` |
| Orders | `POST /orders` · `POST /orders/:id/pay` · `POST /orders/:id/cancel` · `GET /orders/:id/messages` · `POST /orders/:id/messages` · `POST /orders/:id/safe` · `POST /orders/:id/complete` |
| Payments | `GET /payments/:invoice/status` · `POST /payments/:invoice/simulate` (simulation mode only) · `POST /webhooks/midtrans` |
| Store (owner) | `POST /stores` · `GET /stores/me` · `POST /stores/me/deposit` · `GET /stores/me/catalogs` · `POST /stores/me/catalogs` · `PATCH /stores/me/catalogs/:id` · `GET /stores/me/orders` · `GET /stores/me/orders/:id` · `GET /stores/me/balance` · `GET /stores/me/withdrawals` · `POST /stores/me/withdrawals` |
| Admin | `GET /admin/stores?status=` · `POST /admin/stores/:id/approve` · `POST /admin/stores/:id/reject` · `GET /admin/withdrawals?status=` · `POST /admin/withdrawals/:id/approve` · `POST /admin/withdrawals/:id/reject` · `GET /admin/analytics` |

Every `/me`, `/orders/:id`, `/stores/me/*` query is scoped to `req.user` (anti-IDOR): an order is visible only to its buyer, the owner of its store, or an admin.

---

## 4. Database — MySQL (MariaDB 10.4 via XAMPP)

- Schema: `back/database/schema.sql` (19 tables, InnoDB, `utf8mb4_unicode_ci`). Documented in `docs/modeling/05-struktur-tabel.md`.
- IDs: `VARCHAR(36)` UUIDs generated by the API (`crypto.randomUUID()`); seed rows use readable ids (e.g. `vl-001`). Small master tables (`games`, `promo_codes`, `help_articles`) use `INT AUTO_INCREMENT`.
- Money: `INT` Rupiah. Never `FLOAT`/`DOUBLE`.
- JSON columns (`catalogs.images`, `catalogs.attributes`, `help_articles.body`) are parsed by the API.
- Times are stored in **UTC** (`SET time_zone = '+00:00'` per connection) and shown as WIB in the UI.

---

## 5. Payments — Midtrans Snap (Sandbox) + simulation mode

| Flow | `payments.purpose` | On PAID |
|---|---|---|
| Game top-up | `TOPUP` | `topup_orders` → PAID → (simulated provider) → SUCCESS |
| Balance fill | `BALANCE_FILL` | `balance_topups` → PAID; `users.balance += credit` + `balance_ledger TOPUP_CREDIT` |
| Account purchase | `ORDER` | `orders` → PAID; catalog → IN_ORDER; `store_balances.escrow += item_price` + `store_ledger ESCROW_HOLD`; system rekber message |
| Store deposit | `STORE_DEPOSIT` | `stores.deposit_status = HELD`, `status = PENDING_REVIEW` (then admin review) |

**`PAYMENT_MODE=midtrans`** (needs Sandbox keys):
1. API inserts the invoice row + `payments` row (PENDING), then calls Snap `POST /snap/v1/transactions` with `order_id` = invoice number, `gross_amount`, `enabled_payments` for the chosen method, and `callbacks.finish` = `FRONTEND_URL/payment/finish`.
2. The browser is redirected to Midtrans' `redirect_url`.
3. On return, `/payment/finish` calls `GET /api/payments/:invoice/status`; the API asks **Midtrans Status API** (`GET /v2/{order_id}/status`, server key) — the browser's word is never trusted — checks `gross_amount`, and applies the transition.
4. Optional: `POST /api/webhooks/midtrans` (needs a public tunnel URL) verifies `signature_key = SHA512(order_id + status_code + gross_amount + SERVER_KEY)`, stores the event in `webhook_events` (unique → replay-safe) and applies the same transition.

**`PAYMENT_MODE=simulation`** (default; for demos without Midtrans keys): the API returns `redirect_url = FRONTEND_URL/payment/simulate?invoice=…`, where the user chooses *Bayar* or *Gagalkan*; `POST /api/payments/:invoice/simulate` applies the same transition. The endpoint returns 404 unless simulation mode is on.

Transitions are idempotent: they only run while `payments.status = 'PENDING'` (row locked `FOR UPDATE`). `expire`/`cancel`/`deny` → FAILED/EXPIRED; an unpaid order is cancelled and its catalog is listed again.

**Simulated in the prototype:** Digiflazz fulfilment (a PAID top-up becomes SUCCESS immediately) and Midtrans Iris payouts (admin approval marks a withdrawal COMPLETED).

> Custody note: in this design buyer funds would sit in the platform's merchant account until release. It is acceptable for a sandbox prototype; a real launch needs legal review (see MONEY_RULES §3).

---

## 6. Auth & Security (prototype level)

- Email + password (bcrypt, cost 10). JWT (HS256, 1 day) in an **httpOnly, SameSite=Lax** cookie `vs_token`. No OTP, no Google, no refresh tokens (future work).
- `localhost:3000` and `localhost:4000` are the same site, so the cookie is sent to both.
- CORS allows only `FRONTEND_URL`; state-changing requests with another `Origin` are rejected.
- zod `.strict()` on every body/query → unknown fields rejected.
- Rate limit on login/register and checkout endpoints.
- Roles: `USER` (buyer; store owner if they own a store) and `ADMIN`. Admin actions write `audit_logs` with IP.
- Passwords, JWT secret and Midtrans keys only in `back/.env` (git-ignored).

---

## 7. Store Verification (replaces KYC)

1. Logged-in user fills the store form (`POST /stores`): name, type, **owner_legal_name**, description → status `PENDING_DEPOSIT`.
2. Pays the Rp500.000 deposit via Midtrans (`POST /stores/me/deposit`) → PAID → status `PENDING_REVIEW`.
3. Admin reviews in `/admin/stores` and **approves** (→ `ACTIVE`, `identity_verified = 1`, `store_balances` row created) or **rejects** with a note. Both write `audit_logs`.
4. Only `ACTIVE` stores can create catalogs, and only their `LISTED` catalogs are public.

---

## 8. Local Development (XAMPP)

1. XAMPP Control Panel → start **MySQL** (Apache only if you want phpMyAdmin at `http://localhost/phpmyadmin`).
2. phpMyAdmin → *Import* `back/database/schema.sql`, then `back/database/seed.sql`, then (optional) `create-user.sql`.
3. `cd back && cp .env.example .env && npm install && npm run dev` → `http://localhost:4000/api/health`.
4. `cd front && cp .env.example .env.local && npm install && npm run dev` → `http://localhost:3000`.
5. Demo accounts are listed in `back/database/README.md`.
6. Real Midtrans Sandbox: set `PAYMENT_MODE=midtrans` + `MIDTRANS_SERVER_KEY` / `MIDTRANS_CLIENT_KEY` in `back/.env`.

---

## 9. Architectural Principles

1. **Backend owns everything** — the web app never computes or mutates money/trust.
2. **Ledger-first money** — every balance change has a ledger row with `balance_after`, in one transaction.
3. **Payment status comes from Midtrans** (Status API or signed webhook), never from the browser.
4. **Anti double-sell** — unique `vs_code` + `LISTED → LOCKED → IN_ORDER → SOLD`.
5. **Store accountability** — only admin-verified stores sell; withdrawals only to an account whose name matches `owner_legal_name`.
6. **Parameterised SQL only**; per-resource authorisation on every data endpoint.
7. **Balance is closed-loop** — top-up only; never buys accounts, never cashed out, never transferred.

---

## 10. Future Work (not in the prototype)

- Provider KYC (e.g. Sumsub), OTP login, Google OAuth, 2FA, refresh-token rotation, granular RBAC.
- Real Midtrans Iris payouts + account validation; real Digiflazz fulfilment; 5-hour delayed escrow release (jobs).
- Offers/negotiation, ratings & service scores, disputes, sanctions, inspections, external sellers & transfer requests.
- Subscriptions, ads, flash sales, bundles, affiliate, loyalty, WhatsApp/Discord/Telegram notifications, Socket.IO realtime.
- Production: VPS + Nginx + MySQL server (not XAMPP) + backups + monitoring (Sentry) + Cloudflare; legal review of custody.
