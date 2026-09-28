# CLAUDE.md — valostock.id

Trust-based marketplace for game accounts (Valorant, MLBB, etc.) + game top-up. Verified stores, Midtrans payments (Snap in, Iris out) with a per-store escrow ledger, evidence-based trust, in-app chat.
**Goal:** Indonesia's most trusted game-account marketplace — safety from accountability & transparency, not absolute guarantees.

**Two services:** `front/` (Next.js 16 frontend) + `back/` (Express.js API) on **MySQL via XAMPP** (local). All domain logic lives in the API. This file is the entry point for any developer or AI on the project.

---

## Source of Truth

The docs in `/docs` are the **primary source of truth**. Do not assume when the answer is in the docs.

| Document | Contents |
|---|---|
| `docs/PRD.md` | Requirements, actors, user stories, phases, risks |
| `docs/MONEY_RULES.md` | All money numbers & rules (commission, fees, protection, Midtrans cost coverage, sanctions) |
| `docs/STORE_RULES.md` | Store handbook (onboarding, premium, disputes, deposit, penalties) |
| `docs/ERD.md` | Data structure & relations + MySQL type mapping (Prisma follows this) |
| `docs/SITEMAP.md` | All pages, route tree, per-page contents, guards & RBAC roles |
| `docs/ARCHITECTURE.md` | Two-service code structure, Express layering, MySQL/XAMPP setup, Midtrans flows, security principles |
| `docs/VALOSTOCK_OVERVIEW.md` | Concept overview |
| `docs/MEGA_FLOW.md` | End-to-end Mermaid flowchart |

---

## Development Workflow

Every implementation MUST follow this order (when relevant). Never skip or reorder without explicit instruction:

1. **Documentation** (`/docs`)
2. **User & System Flow**
3. **Mermaid Flowchart**
4. **ERD / Database** (`docs/ERD.md` → `back/prisma/schema.prisma`)
5. **Architecture** (`docs/ARCHITECTURE.md`)
6. **Folder Structure**
7. **Business Logic** (Express modules in `back/src/modules`)
8. **UI Components** (Next.js in `front/`)
9. **Implementation**

---

## Planning Rules

1. For every task, produce a detailed **Implementation Plan** first.
2. After the plan, ask for review & approval before doing work.
3. Ask whether to: **approve step by step**, or **give full permission to run the whole plan automatically**.
4. Never start implementation before approval.
5. Every task MUST follow the project's User & System Flow.
6. Never invent a new workflow, simplify, or skip an existing process unless explicitly asked.

---

## Tech Stack

**Frontend — `front/`**
| Tool | Notes |
|---|---|
| Next.js | 16 (App Router) |
| React | 19 |
| TypeScript | strict |
| Tailwind CSS | v4 |
| lucide-react | icons |
| Framer Motion | animation |
| zod | form validation |
| Socket.io-client | in-app chat / rekber (planned) |
| shadcn/ui · Zustand · TanStack Query | planned |
| Inter + Space Grotesk | fonts (`next/font`) |

**Backend — `back/`**
| Tool | Notes |
|---|---|
| Node.js 20+ · Express 5 | layered: routes → controllers → services → repositories |
| TypeScript | strict |
| Prisma | ORM, `provider = "mysql"` (schema = `docs/ERD.md`) |
| MySQL (MariaDB 10.4) | via **XAMPP**, `127.0.0.1:3306`, database `valostock` |
| zod | request validation (strict objects) + env validation |
| jsonwebtoken + cookie-parser | short access token + rotating refresh token, both httpOnly cookies |
| helmet · cors · express-rate-limit | security headers, strict CORS, rate limit |
| Socket.IO | realtime chat / rekber |
| node-cron + `JOBS` table | background jobs (payout release, top-up fulfil, expiries, reconcile) — no Redis locally |
| pino | structured logging |

**Payments:** **Midtrans only** — **Snap** (all incoming: orders, top-up, Balance fill, deposit, subscription, ads) + **Iris** (all payouts: store withdrawals, transfers to external sellers, account validation). **Sandbox** locally.
**Other integrations:** Sumsub (store KYC), Digiflazz (top-up fulfilment), Resend (email). Notifications: Baileys (WhatsApp), Discord, Telegram.
**Local infra:** XAMPP (MySQL + phpMyAdmin), tunnel (cloudflared/ngrok) for Midtrans webhooks. **Production (later):** VPS, Nginx, PM2/Docker, MySQL server, Cloudflare, GitHub Actions — see `docs/ARCHITECTURE.md` §9.
**Package manager:** npm.

---

## Commands

```bash
# XAMPP: start "MySQL" in the XAMPP Control Panel first (Apache not needed)

# Backend (back/)
npm run dev              # tsx watch src/server.ts  → http://localhost:4000
npm run build            # tsc
npm run start            # node dist/server.js
npx prisma migrate dev   # apply migrations to MySQL (XAMPP)
npx prisma generate      # Prisma client
npx prisma db seed       # seed games, stores, catalogs, top-up products, help articles
npx prisma studio        # browse data (or phpMyAdmin at http://localhost/phpmyadmin)

# Frontend (front/)
npm run dev              # Next dev → http://localhost:3000
npm run build            # Next build
npm run lint
```

---

## Theme System

Minimalist, modern, generous whitespace, clean typography. **Light-first**, neutral zinc surfaces with a violet primary.

**Core palette:**

| Token | Hex | Role |
|---|---|---|
| `white` | `#FFFFFF` | Base background |
| `surface` | `#FAFAFA` | Cards |
| `surface-elevated` | `#F4F4F5` | Elevated surface |
| `primary` | `#7C3AED` | Primary — actions, buttons, links |
| `primary-hover` | `#6D28D9` | Primary hover |
| `accent` | `#A855F7` | Accent — highlights, badges |
| `text` | `#09090B` | Main text |
| `text-secondary` | `#52525B` | Secondary text |
| `border` | `#E4E4E7` | Border |
| `border-strong` | `#D4D4D8` | Strong border |

- Tokens: `front/src/app/globals.css` (Tailwind v4 `@theme`). Types: `front/src/types/theme.ts`.

### Theme Primary Colors
```css
@theme {
  --color-white:#FFFFFF;
  --color-surface:#FAFAFA;
  --color-surface-elevated:#F4F4F5;
  --color-primary:#7C3AED;
  --color-primary-hover:#6D28D9;
  --color-accent:#A855F7;
  --color-text:#09090B;
  --color-text-secondary:#52525B;
  --color-border:#E4E4E7;
  --color-border-strong:#D4D4D8;
}
```
Usage: `bg-white`, `bg-surface` (cards), `text-text`, `text-text-secondary`, `border-border`, `bg-primary hover:bg-primary-hover`, `text-accent`.

### Theme Icons
- Library: **lucide-react**. Functional: `ShieldCheck` (verified), `Store`, `Wallet`, `BadgeCheck` (KYC), `Lock` (escrow), `Star` (trust), `ScanLine` (inspection).

### Typography
- **Space Grotesk** → headings (`font-display`); **Inter** → body/UI (`font-sans`), via `next/font/google`.
- **Money & VP numbers**: always `tabular-nums` so digits align in tables/dashboards.

---

## Folder Structure

```
tugas/
├── docs/                                   # source of truth
├── front/  src/app  src/components  src/lib/(api.ts, auth.ts, data/, mock/)  src/types  public/images
└── back/   src/(config, middlewares, modules, integrations, realtime, jobs, storage, lib)  prisma/  storage/private
```
Full detail: `docs/ARCHITECTURE.md`.

---

## Code Conventions

- **TypeScript strict** in both services. No `any` (use `unknown` + narrowing).
- **All domain logic in the Express API**, one folder per domain (`*.routes.ts` → `*.controller.ts` → `*.service.ts` → `*.repository.ts` + `*.schema.ts`). Only repositories call Prisma.
- **The web app never computes/mutates money or trust** — always via the API. `front/` has no DB driver and no secrets.
- **Validate input** with zod on every endpoint (backend, `.strict()` objects) and zod on forms (frontend).
- **Money values** are integer Rupiah (never floats). MySQL `INT`/`BIGINT`, never `FLOAT`/`DOUBLE`.
- **All balance/trust changes** go through their ledgers/event logs (`STORE_LEDGER`, `BALANCE_LEDGER`, `LOYALTY_LEDGER`, trust events) inside one `prisma.$transaction`.
- **File naming:** `kebab-case.ts`; React components `PascalCase.tsx` (existing kebab-case component files may stay).
- **Status enums** in sync with ERD & state machine.

---

## Environment Variables

Backend `back/.env` (never commit — see `back/.env.example`):
```
NODE_ENV=development
PORT=4000
FRONTEND_URL=http://localhost:3000
DATABASE_URL=mysql://valostock:change-me@127.0.0.1:3306/valostock
SHADOW_DATABASE_URL=mysql://valostock:change-me@127.0.0.1:3306/valostock_shadow
JWT_ACCESS_SECRET=
JWT_REFRESH_SECRET=
# Google OAuth
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_CALLBACK_URL=
# Midtrans (Snap + Core status API)
MIDTRANS_SERVER_KEY=
MIDTRANS_CLIENT_KEY=
MIDTRANS_IS_PRODUCTION=false
# Midtrans Iris (payouts + account validation)
IRIS_CREATOR_KEY=
IRIS_APPROVER_KEY=
IRIS_IS_PRODUCTION=false
# Sumsub (KYC)
SUMSUB_APP_TOKEN=
SUMSUB_SECRET_KEY=
# Digiflazz (top-up fulfillment)
DIGIFLAZZ_USERNAME=
DIGIFLAZZ_API_KEY=
DIGIFLAZZ_WEBHOOK_SECRET=
# Storage (local private folder; R2 in production)
STORAGE_DIR=./storage/private
FILE_URL_SIGNING_SECRET=
# Email
RESEND_API_KEY=
# Security
ENCRYPTION_KEY=
TURNSTILE_SECRET_KEY=
```
Frontend `front/.env.local`: `NEXT_PUBLIC_API_URL=http://localhost:4000`, `NEXT_PUBLIC_SOCKET_URL=http://localhost:4000`, `NEXT_PUBLIC_MIDTRANS_CLIENT_KEY=` (client key is public by design; the **server key never goes to the frontend**).

---

## Do Not (Rules)

- **DO NOT** put money/trust logic in the web app — Express API only. No Next.js route handlers with business logic, no DB access from `front/`.
- **DO NOT** mark anything PAID without the Midtrans webhook gate: SHA512 `signature_key` verified + status re-fetched from Midtrans + `gross_amount` matched + idempotency (`WEBHOOK_EVENTS`). Same gate (signature + idempotency) for Iris/Digiflazz/Sumsub.
- **DO NOT** credit Balance, open escrow, or activate a store from a browser redirect/`finish_url` — only from the verified webhook (or the reconcile job reading Midtrans status).
- **DO NOT** use escrow or Balance float for operations — every rupiah in the platform's Midtrans account is attributed 1:1 in `STORE_LEDGER`/`BALANCE_LEDGER` and reconciled against Midtrans.
- **DO NOT** pay out (withdrawal or external-seller transfer) without Iris Account Validation (name = KYC / recognized recipient name) **and** platform-admin approval.
- **DO NOT** use Midtrans Production keys before legal review of the escrow/custody model (see `docs/MONEY_RULES.md` §3). Sandbox only.
- **DO NOT** use absolute claims ("100% original/safe/guaranteed") anywhere in the UI.
- **DO NOT** allow individual (non-store) sellers — only KYC-verified stores sell.
- **DO NOT** let one account (VS catalog id) exist as more than one catalog.
- **DO NOT** change a balance or trust score without a ledger/event-log row.
- **DO NOT** auto-approve store KYC or verification — record decisions + audit.
- **DO NOT** store KYC/evidence/inspection/chat media in public folders (`front/public`, static Express dirs) — `back/storage/private` + signed URLs.
- **DO NOT** let transactions happen over WhatsApp/Discord/Telegram — those are one-way notifications; deals stay in-app (rekber room).
- **DO NOT** add an open-loop wallet or crypto without instruction. Balance is **closed-loop**: top-up only — never allow cash-out, account purchase, or user-to-user transfer (would become e-money / need a BI licence).
- **DO NOT** authorize by authentication alone — verify per-resource ownership (prevent IDOR) on every money/data endpoint (`require-ownership` middleware).
- **DO NOT** store JWT/refresh tokens in localStorage — httpOnly cookies only; refresh tokens stored hashed in `REFRESH_TOKENS`.
- **DO NOT** use XAMPP's `root` with an empty password for the app — create a dedicated `valostock` MySQL user. Never expose MySQL (3306) beyond `127.0.0.1`.
- **DO NOT** use `$queryRawUnsafe` / string-built SQL with user input.
- **DO NOT** reintroduce SQLite, DOKU, or Xendit.
- **DO NOT** commit secrets (`.env`, keys) — `.env.example` only.

---

## Testing

No automated tests yet. MANDATORY unit tests (in `back/tests`) for: escrow hold/release, ledger balance_after integrity, payout + Iris Account Validation, commission/handling-fee math, trust scoring, seller-level limits, Midtrans webhook signature + idempotency, top-up fulfillment. For now: manual testing + Midtrans Sandbox (Snap simulator) + Iris/Sumsub/Digiflazz sandboxes.

## Build

```bash
# backend
npm run build   # in back/ (npx prisma generate first)
# frontend
npm run build   # in front/
```
Expected: both compile, zero TypeScript errors.

## Git Rules

After every change, **commit before continuing**. Clear messages. Never commit secrets, `node_modules`, `.next`, `dist`, or `back/storage/private`.

## Best Coding Practices

- Follow the Development Workflow (9 steps).
- Single source of logic (Express services) — never duplicate money/trust rules.
- Atomic & idempotent for all money operations (`prisma.$transaction` + `SELECT … FOR UPDATE` on balance rows + idempotency keys).
- Defense in depth: signatures, RBAC, rate limit, audit log, private storage.
- Write `AUDIT_LOGS` for every sensitive admin action (KYC decision, payout approval, dispute resolution, deposit deduction, RBAC change).
- Only valid state transitions (order/catalog/dispute/withdrawal state machines).
- Stay consistent with `docs/MONEY_RULES.md` for all numbers.

---

## Security & Monitoring

The stack is a foundation, not security by itself. Most breaches come through code/config, not the framework. Enforce these.

### Application security (mandatory before handling real money)
- **Rate limiting** (`express-rate-limit`) on login, OTP, KYC submit, withdraw, checkout, webhooks.
- **Strict validation**: zod `.strict()` schemas on body/query/params for every endpoint (prevents mass-assignment).
- **Security headers**: `helmet`.
- **CORS**: allow only `FRONTEND_URL` with credentials (never `*`). Reject state-changing requests whose `Origin` isn't `FRONTEND_URL` (CSRF defence alongside `SameSite=Lax` cookies).
- **JWT done right**: short access token (~15m) + rotating refresh token in **httpOnly cookies**; refresh tokens hashed + revocable in MySQL (`REFRESH_TOKENS`); no sensitive data in the payload.
- **Per-resource authorization (IDOR is the #1 marketplace hole)**: every money/data endpoint verifies the resource belongs to the caller (order → buyer/store, withdrawal → store owner), not just "is logged in".
- **Webhook gate**: Midtrans signature + status re-check + amount check + idempotency before any state change; same for Iris/Digiflazz/Sumsub.
- **Secrets**: `.env` validated with zod on boot; never in code/repo; rotate on leak.
- **Encrypt sensitive data at rest** (bank account numbers, external-seller KTP refs, evidence). KYC PII lives at Sumsub.
- **No raw SQL** with user input (Prisma only; tagged `$queryRaw` for `FOR UPDATE`).
- **Audit log** every admin & financial action with IP.

### Local (XAMPP) hygiene
- MySQL bound to `127.0.0.1`; dedicated app user with a password; phpMyAdmin only on localhost.
- Midtrans/Iris **Sandbox** keys only. Webhook tunnel URL changes per session — update the Sandbox notification URL accordingly.

### Production (later — see ARCHITECTURE §9)
- **UFW firewall** (only 80/443/SSH), **Fail2ban**, SSH key-only on a non-default port, MySQL/Redis never exposed.
- **Cloudflare** WAF, rate limiting, Bot Fight Mode.
- **Sentry** (mandatory), UptimeRobot/Better Stack, Grafana + Prometheus + Loki, Dependabot + `npm audit` + Snyk.
- **Before a serious launch:** legal review of the Midtrans escrow model + a professional **penetration test**.

## Core Pages

- [x] Project scaffold (Next.js 16 + TS + Tailwind v4) — `front/`
- [x] UI pages built on mock data (marketplace, top-up, buyer account, store dashboard) — awaiting API wiring
- [ ] `back/` Express scaffold + Prisma schema (MySQL/XAMPP) + seed from `front/src/lib/mock`
- [ ] Catalog / home (badges, price) + advanced search & filter (game/rank/price/skin/region)
- [ ] Listing detail (VS id, badges) + offer button
- [ ] Store storefront (`/store/[slug]`) — custom homepage + type/trust badges + ratings
- [ ] Wishlist + following + recently viewed + recommendations
- [ ] Top-up flow (Midtrans Snap + Digiflazz fulfillment + promo code + contact email/WA)
- [ ] Top-up invoice check page ("Cek Invoice Kamu" by invoice no)
- [ ] Top-up Balance page (buy voucher denominations via Midtrans, closed-loop) + balance history
- [ ] Help center articles (top-up refund policy, why balance can't buy accounts)
- [ ] Checkout (Midtrans Snap + escrow ledger + handling fee + mandatory protection + optional lock)
- [ ] Buyer: orders + rekber room + inspect + complete + loyalty points
- [ ] Buyer: my offers (pending/countered) + disputes
- [ ] Store: onboarding (KYC + deposit via Midtrans + type)
- [ ] Store: create/manage catalogs + bulk ops + inspections
- [ ] Store: offers (accept/counter/reject)
- [ ] Store: external sellers + transfer requests (reseller, via Iris)
- [ ] Store: balance (escrow + available ledger) + withdraw (Iris Account Validation + admin approval)
- [ ] Store: subscription + ads + vouchers + flash sales + bundles
- [ ] Store: notifications (WhatsApp/Discord/Telegram) + analytics + ratings
- [ ] Admin: store KYC, rekber supervision, disputes, finance (Iris approvals, reconciliation), fraud, inspections
- [ ] Legal: terms, privacy, refund

## Features

- [ ] OTP auth (phone + email) — buyers no KYC
- [ ] Store-only selling: KYC (Sumsub, free) + Rp500K deposit
- [ ] Store types: Owner / Reseller (+ external-seller management)
- [ ] Platform-issued VS catalog IDs (anti double-sell)
- [ ] Direct offer / negotiation (accept / counter / reject / expire) + optional lock
- [ ] Midtrans Snap payments + per-store escrow/available ledger
- [ ] 5% commission (Premium 4.5%/4%) + ~3.5% handling fee (min Rp4.000)
- [ ] Mandatory protection Rp5.000 (14d ≤Rp10jt / 30d >Rp10jt) — support, not a hold
- [ ] Rekber room (VS code, admin-supervised) + in-app chat (Socket.IO)
- [ ] Escrow release 5h after account safe + Iris payout with Account Validation (name = KYC) + admin approval
- [ ] Transfer request to external seller (from store balance via Iris) + name recognition
- [ ] Account Inspection (login-only checklist + media) → Account Checked badge
- [ ] Trust: store/buyer/product scores + Seller Rating + 3-dim Service Score
- [ ] Badges: Owner/Reseller + Identity Verified/Verified/Platinum/Account Checked/Deposit Secured
- [ ] Disputes (72h) + timeline + final arbitration; deposit deductions
- [ ] Tiered sanctions + blacklists (device/KYC/bank); zero-tolerance off-platform
- [ ] Notifications: WhatsApp (Baileys) / Discord / Telegram (one-way)
- [ ] Engagement: wishlist + price-drop alerts, follow store, loyalty points, recently viewed, recommendations
- [ ] Promotions: store vouchers, flash sales, bundles, custom store homepage
- [ ] Ads: featured listings + banner ads
- [ ] Top-up (Midtrans Snap + Digiflazz) — margin + payment-method surcharge; promo codes; invoice check
- [ ] Top-up Balance (closed-loop, top-up only, filled via Midtrans, no cash-out / no account purchase / no transfer)
- [ ] Store Premium (Free/Pro/Business)
- [ ] Light theme (violet primary + zinc neutrals)
- [ ] Reconciliation (ledgers vs Midtrans/Iris) + observability + audit log

> Current status (v6 architecture): `front/` has UI pages running on mock data — the SQLite/DOKU prototype backend was removed. `back/` (Express + MySQL/XAMPP + Midtrans) is not started yet. Store-only model. All features above are **planned** and built following the Development Workflow + Planning Rules.
