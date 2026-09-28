# ARCHITECTURE — valostock.id (Store-Only · Express.js API + Next.js Web · MySQL/XAMPP)

**Source of Truth: Code Structure**
Version 6.0 · Two services · Local-first (XAMPP) · Midtrans-only payments

> **v6.0 changes (architecture reset):**
> - Backend **NestJS → Express.js** (TypeScript strict, layered: routes → controllers → services → repositories).
> - Database **PostgreSQL → MySQL (MariaDB 10.4 via XAMPP, local)**, still through **Prisma** (`provider = "mysql"`).
> - Payments **Xendit (+ DOKU prototype) → Midtrans only**: **Snap** for every incoming payment, **Iris** for every payout (store withdrawal + transfer to external seller), with Iris **account validation** for recipient names.
> - **Redis/BullMQ removed** from the local stack → in-process **node-cron** worker + a MySQL `JOBS` table. Refresh-token revocation moves from Redis to MySQL (`REFRESH_TOKENS`).
> - **SQLite removed** entirely (the old Next.js prototype stored users/transactions in `database.sqlite` and images in `images.sqlite`). Images are now static files in `front/public/images/`.
> - Docker/VPS/Nginx/Redis moved to **§9 Production Plan** (not required to run locally).
>
> **Legend:** `⚠️` critical money/identity/trust point. `(fase 2/3)` deferred.

---

## 1. Two Services

```
tugas/                      # repo root
├── docs/                   → source of truth (this folder)
├── front/                  → Next.js 16 web (UI + API client only)          :3000
└── back/                   → Express.js API (all business logic, jobs, realtime) :4000
                              └── MySQL (XAMPP / MariaDB 10.4)               :3306
```

All money, trust, and state live in the **Express API** (`back/`). The web app renders UI and calls the API — no domain logic, no database access, no payment-gateway keys.

```mermaid
flowchart LR
    B[Browser] -->|HTTPS pages| F[front · Next.js :3000]
    B -->|fetch + httpOnly cookies| A[back · Express :4000]
    B <-->|Socket.IO| A
    F -->|server-side fetch, forwards cookies| A
    A -->|Prisma| DB[(MySQL / MariaDB · XAMPP :3306)]
    A -->|Snap + Status API| MT[Midtrans]
    MT -->|HTTP notification webhook| A
    A -->|Iris payouts + account validation| IR[Midtrans Iris]
    A --> DG[Digiflazz]
    A --> SS[Sumsub]
    A --> RS[Resend email]
    A --> NT[WA / Discord / Telegram]
    A --> ST[(back/storage/private)]
```

---

## 2. Frontend — `front/` (Next.js 16)

**Stack:** Next.js 16 · React 19 · TypeScript (strict) · Tailwind CSS v4 · lucide-react · Framer Motion · zod (form validation) · Socket.IO Client (chat/rekber). Planned: shadcn/ui, Zustand, TanStack Query.

```
front/
├── public/images/                        # all static site images (favicon, agents, ranks, skins, banners)
├── src/
│   ├── app/                              # App Router (routes only)
│   │   ├── (marketplace)/                # public: [game]/account, [game]/topup, catalog/[id], store/[slug],
│   │   │                                 #   search, news, help, topup, topup/invoice, about, contact
│   │   ├── (auth)/                       # login, register, verify-otp, forgot-password
│   │   ├── (buyer)/                      # account/*, balance, checkout/[orderId]/pay, orders/[id]
│   │   ├── (store)/store-dashboard/      # ⚠️ store area
│   │   ├── admin/                        # ⚠️ platform admin
│   │   ├── legal/                        # terms, privacy, refund
│   │   └── layout.tsx  globals.css  page.tsx
│   ├── components/                       # ui/, listings/, topup/, checkout/, store-dashboard/, account/ …
│   ├── lib/
│   │   ├── api.ts                        # ⚠️ the ONLY way to reach the backend (API_URL, cookie forwarding)
│   │   ├── auth.ts                       # getCurrentUser/requireUser → GET /api/auth/me
│   │   ├── data/                         # page data readers (temporary: mock data until the API endpoints exist)
│   │   ├── mock/                         # demo data — also the seed source for back/prisma/seed
│   │   ├── hooks/  format.ts  labels.ts  fees.ts (display-only estimates)
│   └── types/                            # api.ts (response shapes), theme.ts
├── next.config.ts  tsconfig.json  eslint.config.mjs  postcss.config.mjs
└── .env.local                            # NEXT_PUBLIC_API_URL, NEXT_PUBLIC_SOCKET_URL, NEXT_PUBLIC_MIDTRANS_CLIENT_KEY
```

**Rules for `front/`:**
- No database driver, no Prisma, no server secrets. `NEXT_PUBLIC_*` values only (Midtrans **client** key is public by design).
- No Next.js route handlers that implement business logic (`app/api/*` was removed). Server Components fetch the API through `lib/api.ts`, forwarding the user's cookies.
- Money shown in the UI (fees, totals) is **display-only**; the API recomputes and is authoritative.

---

## 3. Backend — `back/` (Express.js)

**Stack:** Node.js 20+ · Express 5 · TypeScript (strict) · Prisma ORM (`mysql` provider) · zod (validation) · jsonwebtoken + cookie-parser (auth) · helmet · cors · express-rate-limit · Socket.IO · node-cron · pino (logging) · midtrans-client · Resend · @whiskeysockets/baileys · discord.js · telegraf.

```
back/
├── src/
│   ├── server.ts                         # create http server → attach Express app + Socket.IO + start jobs
│   ├── app.ts                            # Express app: middleware chain + route mounting + error handler
│   │
│   ├── config/
│   │   ├── env.ts                        # ⚠️ zod-validated process.env (fail fast on boot)
│   │   └── constants.ts                  # MONEY_RULES numbers (commission, fees, deposit, protection …)
│   │
│   ├── middlewares/                      # ══ cross-cutting ══
│   │   ├── auth.ts                       # ⚠️ verify access-token cookie → req.user
│   │   ├── require-role.ts               # buyer / store_admin / platform_admin
│   │   ├── require-permission.ts         # ⚠️ RBAC `module:action`
│   │   ├── require-ownership.ts          # ⚠️ anti-IDOR: resource belongs to caller (order, store, withdrawal …)
│   │   ├── validate.ts                   # zod schema for body/query/params (strict → rejects unknown keys)
│   │   ├── rate-limit.ts                 # login, OTP, KYC, withdraw, checkout, webhooks
│   │   ├── csrf-origin.ts                # state-changing requests must come from FRONTEND_URL
│   │   ├── audit.ts                      # write AUDIT_LOGS (actor, action, target, IP)
│   │   └── error-handler.ts              # AppError → JSON { error: { code, message } }, no stack leak
│   │
│   ├── modules/                          # ══ ONE FOLDER PER DOMAIN ══
│   │   │                                 # each: *.routes.ts → *.controller.ts → *.service.ts → *.repository.ts + *.schema.ts
│   │   ├── auth/                         # register/login (email+password, Google), OTP, JWT, refresh, 2FA
│   │   ├── users/                        # profile, loyalty points
│   │   ├── stores/                       # ⚠️ store CRUD, type (OWNER/RESELLER), level, status
│   │   ├── store-kyc/                    # ⚠️ Sumsub applicant + review decision (never auto-approve)
│   │   ├── store-deposit/                # ⚠️ Rp500K deposit (paid via Midtrans Snap), deductions
│   │   ├── store-subscription/           # FREE/PRO/BUSINESS → commission rate + limits
│   │   ├── external-sellers/             # reseller: seller records (KTP held by store, encrypted)
│   │   ├── catalogs/                     # ⚠️ platform-issued VS id (anti double-sell)
│   │   ├── inspections/                  # account inspection + checklist
│   │   ├── offers/                       # ⚠️ accept / counter / reject / expire
│   │   ├── games/  skins/                # master data + skin-API connector
│   │   ├── orders/                       # order state machine
│   │   ├── payments/                     # ⚠️ Midtrans Snap: create transaction, status check
│   │   ├── escrow/                       # ⚠️ hold / release / refund (STORE_LEDGER)
│   │   ├── ledger/                       # ⚠️ store balance ledger + buyer BLC ledger (append-only)
│   │   ├── commission/                   # 5% (premium-adjusted) + handling fee
│   │   ├── payouts/                      # ⚠️ withdrawals: Iris account validation → Iris payout
│   │   ├── transfers/                    # ⚠️ transfer request → external seller via Iris
│   │   ├── protection/                   # 14/30-day support window
│   │   ├── rekber/                       # ⚠️ rekber room (VS code) + messages
│   │   ├── chat/                         # normal chat (no txn/email/phone)
│   │   ├── disputes/                     # 72h dispute + timeline + arbitration
│   │   ├── ratings/  trust/  sanctions/
│   │   ├── engagement/                   # wishlist, follows, recently viewed, in-app notifications
│   │   ├── promotions/  ads/  affiliate/  reports/  cms/  rbac/
│   │   ├── topup/                        # Digiflazz + promo + invoice lookup
│   │   ├── balance/                      # ⚠️ closed-loop BLC (fill via Midtrans, spend on top-up only)
│   │   ├── notifications/                # WhatsApp / Discord / Telegram (one-way)
│   │   └── webhooks/                     # ⚠️⚠️ Midtrans / Iris / Digiflazz / Sumsub (signature + idempotency)
│   │
│   ├── integrations/                     # thin, typed clients — no business rules
│   │   ├── midtrans.ts                   # Snap + Core status API + signature verify
│   │   ├── iris.ts                       # beneficiaries, account validation, create/approve payouts
│   │   ├── digiflazz.ts  sumsub.ts  resend.ts
│   │   └── notif/ (baileys.ts, discord.ts, telegram.ts)
│   │
│   ├── realtime/                         # Socket.IO: rekber + chat rooms (auth via same JWT cookie)
│   ├── jobs/                             # ⚠️ node-cron scheduler + JOBS table runner
│   │   ├── scheduler.ts                  # registers cron ticks
│   │   ├── offer-expiry.job.ts  lock-expiry.job.ts  protection-expiry.job.ts
│   │   ├── payout-release.job.ts         # safe_at + 5h → escrow release
│   │   ├── payment-reconcile.job.ts      # re-check PENDING payments via Midtrans status API
│   │   ├── topup-fulfill.job.ts          # PAID top-ups → Digiflazz (retry with backoff)
│   │   └── notification.job.ts           # fan-out WA/Discord/Telegram
│   ├── storage/                          # ⚠️ private files (back/storage/private) + HMAC-signed URLs
│   ├── lib/                              # prisma client, logger, money helpers (integer Rupiah), ids, crypto
│   └── types/                            # express.d.ts (req.user), shared types
│
├── prisma/
│   ├── schema.prisma                     # = docs/ERD.md (provider "mysql")
│   ├── migrations/
│   └── seed.ts                           # games, stores, catalogs, top-up products, help (ported from front/src/lib/mock)
├── storage/private/                      # KYC-adjacent, inspection, evidence, chat media (never served statically)
├── tests/                                # ⚠️ escrow, payout, commission, webhook idempotency, ledger
├── .env / .env.example
├── tsconfig.json
└── package.json                          # scripts: dev (tsx watch), build (tsc), start, prisma:*, test
```

### 3.1 Request pipeline

```
request
 → helmet → cors(FRONTEND_URL, credentials) → express.json({ limit }) → cookie-parser
 → rate-limit (per route) → csrf-origin (POST/PUT/PATCH/DELETE)
 → auth → require-role / require-permission → require-ownership
 → validate(zod) → controller → service (prisma.$transaction) → repository
 → error-handler
```

- **Controllers** only parse input/format output. **Services** hold business rules and open DB transactions. **Repositories** are the only place that calls Prisma.
- **Webhook routes** mount **before** `express.json()` with `express.raw()` where the provider signs the raw body, and skip `auth`/`csrf-origin` (they authenticate by signature).

### 3.2 API conventions

- Base path `/api`. JSON only. Money = **integer Rupiah**. Timestamps ISO-8601 UTC.
- Errors: `{ "error": { "code": "INSUFFICIENT_BALANCE", "message": "…" } }` with proper HTTP status.
- Auth endpoints used by the current UI: `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/logout`, `POST /api/auth/refresh`, `GET /api/auth/me`.
- Top-up/balance endpoints used by the current UI: `GET /api/topup/promo?code=`, `POST /api/topup/checkout`, `GET /api/topup/invoice?q=`, `POST /api/balance/topup`, `GET /api/me/transactions`, `GET /api/me/balance-ledger`, `GET /api/admin/analytics`, `GET /api/stores/me` (store context for the dashboard guard).
- Response shapes the web app expects are typed in `front/src/types/api.ts` (`PublicUser`, `TransactionRecord`, `BalanceLedgerRecord`, `PaymentSession` …). Keep them in sync with the API.
- Webhooks: `POST /api/webhooks/midtrans`, `/api/webhooks/iris`, `/api/webhooks/digiflazz`, `/api/webhooks/sumsub`.

---

## 4. Database — MySQL (MariaDB 10.4 via XAMPP)

- **Engine/charset:** InnoDB (transactions + FKs), `utf8mb4` / `utf8mb4_unicode_ci`. Store timestamps in **UTC** (`DATETIME(3)`), render in `Asia/Jakarta`.
- **IDs:** `CHAR(36)` UUID (`@default(uuid()) @db.Char(36)`) — MariaDB 10.4 has no native UUID type. Human codes (VS catalog id, invoice numbers) are separate unique columns.
- **Money:** `INT` Rupiah per row (max ≈ Rp2,1 miliar); `BIGINT` for aggregates. Never `FLOAT`/`DOUBLE`. Rates (commission 0.05) use `DECIMAL(5,4)`.
- **JSON:** `CATALOGS.attributes` is `JSON` (in MariaDB = `LONGTEXT` + `JSON_VALID` check). Hot filters (rank, region, server, skin_count) are **indexed generated columns** added in a raw-SQL migration, e.g. `rank VARCHAR(32) AS (JSON_UNQUOTE(JSON_EXTRACT(attributes,'$.rank'))) VIRTUAL` + `INDEX`. Prisma cannot JSON-path-filter on MariaDB, so filters go through these columns.
- **Concurrency:** money mutations run in `prisma.$transaction` with `SELECT … FOR UPDATE` on the balance row (via `$queryRaw` tagged template — never `$queryRawUnsafe`). MariaDB 10.4 has **no `SKIP LOCKED`** → the job runner claims jobs with a conditional `UPDATE … WHERE locked_at IS NULL` (single worker locally).
- **Idempotency:** unique keys (`WEBHOOK_EVENTS.external_id+source`, `BALANCE_LEDGER.idempotency_key`, `PAYMENTS.midtrans_order_id`) make replays harmless.
- **Access:** XAMPP MySQL listens on `127.0.0.1:3306` only. Use a dedicated DB user (`valostock` with rights on `valostock` DB), **not `root` with an empty password**, even locally. phpMyAdmin is for inspection, not for editing money tables.

---

## 5. Payments — Midtrans only

| Flow | Product | Money path |
|---|---|---|
| Account purchase (item + handling + protection) | **Snap** | Buyer → platform Midtrans merchant account → **escrow** (STORE_LEDGER `ESCROW_HOLD`) |
| Game top-up | **Snap** or Balance | Buyer → platform → Digiflazz |
| Balance (BLC) fill | **Snap** | Buyer → platform (float liability, closed-loop) |
| Store deposit, subscription, ads | **Snap** | Store → platform |
| Store withdrawal | **Iris** | Platform → store's validated bank/e-wallet (debit STORE_LEDGER) |
| Transfer to external seller | **Iris** | Platform → external seller, **instructed by the store**, debited from that store's ledger balance |

**Snap flow:** API creates the order row + `PAYMENTS` row (`midtrans_order_id` = our invoice no) → calls Snap `createTransaction` (server key) → returns `token` + `redirect_url` → front redirects (or opens `snap.js` with the client key) → Midtrans calls **`POST /api/webhooks/midtrans`**.

**Webhook gate (⚠️ money boundary):**
1. Verify `signature_key == SHA512(order_id + status_code + gross_amount + SERVER_KEY)`.
2. Re-fetch the authoritative status from Midtrans `GET /v2/{order_id}/status` (never trust the body alone).
3. Check `gross_amount` equals the stored amount.
4. Insert `WEBHOOK_EVENTS` (unique `source + external_id`) — duplicate → return 200 and stop.
5. Apply a **valid** state transition inside one DB transaction (`settlement`/`capture+accept` → PAID; `expire`/`cancel`/`deny` → EXPIRED/FAILED).

**Iris flow (payouts):** Account Validation (`/account_validation`) returns the holder name → compare to KYC/recognized name (MATCH / REVIEW / MISMATCH) → create payout (creator key) → **approve** payout (approver key, platform admin — maker-checker) → Iris webhook updates status. Failure → reversal ledger row returns funds to the store's available balance.

> ⚠️ **Custody note:** unlike the v5 Xendit sub-account design, Midtrans-only means the **platform's merchant account holds buyer funds until release**. Every rupiah is tracked 1:1 in `STORE_LEDGER`/`BALANCE_LEDGER`, escrow and float are never used for operations, and the ledger is reconciled against Midtrans/Iris reports. Holding and forwarding third-party funds is a regulated activity in Indonesia — **legal review is required before handling real money**. Locally, only **Midtrans Sandbox** is used.

---

## 6. Realtime, Jobs, Storage, Notifications

- **Socket.IO** attaches to the same HTTP server as Express. Handshake authenticates with the access-token cookie; each rekber room checks the caller is the buyer, the store admin, or a supervising admin. Messages are persisted (`CHAT_MESSAGES`) before broadcast.
- **Jobs (local, no Redis):** `node-cron` ticks every minute; due rows in `JOBS` (`type`, `payload`, `run_at`, `attempts`, `locked_at`, `last_error`) are claimed, executed, and retried with backoff; after `max_attempts` they become `DEAD` and alert admins. Expiry sweeps (offers, locks, protection) are idempotent queries.
- **Private storage:** `back/storage/private/<kind>/<uuid>` for inspection media, dispute evidence, chat attachments. Served only through `GET /api/files/:id?exp=&sig=` (HMAC-SHA256, short TTL) after an ownership check. Never under `front/public`.
- **Notifications (one-way):** WhatsApp (Baileys, runs inside the API process locally; own process in production), Discord webhook, Telegram bot. Deals stay in-app.

---

## 7. Local Development (XAMPP)

1. Start **MySQL** in the XAMPP Control Panel (Apache is not needed; phpMyAdmin optional).
2. Create DB + user (phpMyAdmin → SQL):
   ```sql
   CREATE DATABASE valostock CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   CREATE USER 'valostock'@'localhost' IDENTIFIED BY 'change-me';
   GRANT ALL PRIVILEGES ON valostock.* TO 'valostock'@'localhost';
   -- Prisma migrate dev also needs a shadow database:
   GRANT ALL PRIVILEGES ON `valostock_shadow`.* TO 'valostock'@'localhost';
   ```
3. `back/.env`: `DATABASE_URL="mysql://valostock:change-me@127.0.0.1:3306/valostock"` (+ `SHADOW_DATABASE_URL`).
4. `cd back && npm install && npx prisma migrate dev && npx prisma db seed && npm run dev` → `http://localhost:4000`.
5. `cd front && npm install && npm run dev` → `http://localhost:3000` (`NEXT_PUBLIC_API_URL=http://localhost:4000`).
6. **Midtrans webhooks locally:** expose port 4000 with a tunnel (`cloudflared tunnel --url http://localhost:4000` or ngrok) and set the sandbox **Payment Notification URL** to `https://<tunnel>/api/webhooks/midtrans`. Without a tunnel, the `payment-reconcile` job polls the status API as a fallback.

`localhost:3000` and `localhost:4000` are the **same site**, so `SameSite=Lax` httpOnly cookies set by the API are sent by the browser to both.

---

## 8. Architectural Principles

1. **Backend owns everything.** Money, commission, trust, state → Express services. The web app never computes/mutates money or trust.
2. **Ledger-first money.** Every balance change (store balance, escrow, BLC, loyalty) is an append-only ledger row with `balance_after`, written in the same DB transaction as the state change.
3. **Webhook gate is the money boundary.** Signature + status re-check + amount check + idempotency before any state change (Midtrans/Iris/Digiflazz/Sumsub).
4. **Store-only accountability.** Reseller stores carry full responsibility for external sellers; the platform only sanctions the store.
5. **Rekber room is the evidence trail.** Persisted Socket.IO messages, separate from normal chat.
6. **Anti double-sell by construction.** Platform-issued VS id; one account = one catalog.
7. **Provable claims only.** Inspections back "Account Checked". No absolute claims in UI.
8. **Multi-game is data-driven.** Per-game URLs; game-specific fields in `CATALOGS.attributes` (JSON) + indexed generated columns for filters.
9. **Jobs are durable rows, not timers in requests.** `JOBS` table + node-cron; every job is idempotent.
10. **Defense in depth.** RBAC + 2FA, per-resource authz (anti-IDOR), rate limit + helmet + strict CORS + origin check, zod strict validation, audit log, private storage + signed URLs, short JWT + revocable refresh token (MySQL), sanctions + blacklists.

---

## 9. Production Plan (later — not needed for local development)

```
Ubuntu VPS
├── Nginx                → reverse proxy (front :3000, back :4000), TLS
├── PM2 or Docker Compose → front, back, notif-worker (Baileys)
├── MySQL 8 / MariaDB 10.11+ server (NOT XAMPP) → bound to localhost/private network only
├── (optional) Redis + BullMQ → when job volume outgrows the JOBS table
├── Cloudflare           → DNS + CDN + WAF + rate limiting + Bot Fight Mode
├── Cloudflare R2        → replaces back/storage/private (signed URLs)
├── UFW + Fail2ban       → only 80/443/SSH open
└── GitHub Actions       → CI (build, tests, npm audit) + deploy
```

**Monitoring:** Sentry, UptimeRobot/Better Stack, Grafana + Prometheus + Loki. Midtrans switches from Sandbox to Production keys only after legal review (§5) and a penetration test.

---

## Removed from older versions
- NestJS modules/guards/pipes, BullMQ processors, Redis, Docker-first local setup (v5)
- Xendit managed sub-accounts, Xendit split & disbursement (v5) → Midtrans Snap + Iris + internal ledger
- DOKU checkout prototype, SQLite `database.sqlite` / `images.sqlite`, Next.js route-handler "backend" (prototype)
- Individual seller modules, seller levels, seller KYC fee, posting/by-self logic (v4)
