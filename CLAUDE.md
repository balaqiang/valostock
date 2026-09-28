# CLAUDE.md — valostock.id

Trust-based marketplace for game accounts (Valorant, MLBB, etc.) + game top-up. Admin-verified stores **and admin-verified products**, Midtrans payments with a per-store escrow ledger, in-app rekber room.
**College-assignment project** running locally: its **own Supabase project in Docker** (Postgres 17 + Auth + Storage) behind an Express API, and a Next.js web app. Keep solutions demonstrable and correct; production hosting is out of scope.

**Services:** `front/` (Next.js 16) · `back/` (Express.js + `pg` + `supabase-js`) · `supabase/` (local Supabase project `valostock`, ports 55321–55329). All domain logic lives in the API. This file is the entry point for any developer or AI on the project.

---

## Source of Truth

The docs in `/docs` are the **primary source of truth**. Do not assume when the answer is in the docs.

| Document | Contents |
|---|---|
| `docs/modeling/` | **Assignment model (Data Flow approach):** Diagram Konteks, DFD Level 1/2, ERD (52 tables), Basis Data Konseptual, Struktur Tabel — in Indonesian |
| `supabase/migrations/*.sql` | Executable schema. `docs/modeling/05-struktur-tabel.md` is generated from it |
| `docs/ARCHITECTURE.md` | Architecture v8: services, Supabase Auth flow, Storage, jobs, catalog moderation state machine, payments, local setup |
| `docs/ADMIN_PANEL.md` | Admin panel design: menu, RBAC roles/permissions, page specs, moderation queue, admin state machines |
| `docs/MONEY_RULES.md` | All money numbers & rules (commission per plan, fees, protection, Balance, loyalty, referral) |
| `docs/PRD.md` | Requirements, actors, phases, risks |
| `docs/SITEMAP.md` | Pages, route tree, guards |
| `docs/STORE_RULES.md` | Store handbook (incl. catalog moderation rules) |
| `docs/MEGA_FLOW.md` | End-to-end flowchart |
| `docs/VALOSTOCK_OVERVIEW.md` | Concept overview |
| `docs/ERD.md` | Pointer to the ERD + domain list |

**Modelling approach:** the assignment requires ONE approach. This project uses **Data Flow (Alur Data)**. **Do not create UML diagrams** (use case, class, sequence, activity). State diagrams inside `ARCHITECTURE.md` describe status rules only.

---

## Development Workflow

Every implementation MUST follow this order (when relevant). Never skip or reorder without explicit instruction:

1. **Documentation** (`/docs`)
2. **User & System Flow**
3. **Diagrams** (Diagram Konteks / DFD / flowchart — Mermaid)
4. **ERD / Database** (`docs/modeling/03–04` → new file in `supabase/migrations/` → regenerate `05-struktur-tabel.md`)
5. **Architecture** (`docs/ARCHITECTURE.md`, `docs/ADMIN_PANEL.md`)
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

## Scope (v8)

**Everything in the docs works:** Supabase Auth (register with referral, login, reset password) · store onboarding + manual admin verification · **catalog moderation** (DRAFT → PENDING_REVIEW → LISTED / REJECTED with reason; edits of LISTED go back to review) · game field templates · photo upload (Storage) · account inspection · offers · optional lock (Rp5.000 / 30 min) · orders with escrow, rekber, auto-complete 5 h after SAFE · disputes (72 h) + admin rulings · ratings + service score + store reply · store vouchers, flash sales, bundles · subscriptions (Free/Pro/Business) · featured ads · external sellers + transfer requests · withdrawals · top-up + promo + invoice check · closed-loop Balance · wishlist, follows, recently viewed, store chat, in-app notifications · loyalty points + referral rewards · user reports · news/help CMS · admin panel with RBAC + audit log.

**Simulated external services:** Midtrans Iris (payout approval = completed), Digiflazz (PAID top-up = SUCCESS), WhatsApp/Discord/Telegram (not sent; in-app notifications are real), and — with `PAYMENT_MODE=simulation` — the Midtrans payment page.

**Out of scope:** provider KYC, banner ads, 3rd-party skin sync, admin 2FA, production hosting.

---

## Tech Stack

**Frontend — `front/`:** Next.js 16 (App Router) · React 19 · TypeScript strict · Tailwind CSS v4 · lucide-react · Framer Motion · zod · Inter + Space Grotesk (`next/font`). No Supabase SDK in the browser.

**Backend — `back/`:**
| Tool | Notes |
|---|---|
| Node.js 20+ · Express 5 | `*.routes.ts` → `*.service.ts` (→ `*.repository.ts`) |
| TypeScript | strict, `tsx` (dev) / `tsc` (build) |
| pg (node-postgres) | pool, **parameterised queries only** (`$1`), `withTransaction()` |
| @supabase/supabase-js | Auth (GoTrue) + Storage, **service role, server only** |
| zod | request + `.env` validation |
| cookie-parser · helmet · cors · express-rate-limit · multer | cookies, headers, CORS, rate limit, uploads |
| node-cron | expiries & auto-complete jobs (idempotent) |
| fetch → Midtrans | Snap + Status API |

**Database:** PostgreSQL 17 in the local Supabase project `valostock` (Studio `http://127.0.0.1:55323`). **Package manager:** npm. Supabase CLI via `npx supabase`.

---

## Commands

```bash
# Supabase (repo root) — Docker Desktop must be running
npx supabase start          # project "valostock" (ports 553xx) — never the yowana project
npx supabase status         # URLs + keys for back/.env
npx supabase db reset       # re-apply supabase/migrations + supabase/seed.sql (valostock only)
npx supabase stop

# Backend (back/)
npm run dev                 # http://localhost:4000/api/health
npm run build               # tsc
npm run db:seed:gen         # regenerate supabase/seed.sql from front/src/lib/mock
npm run docs:tables         # regenerate docs/modeling/05-struktur-tabel.md from the database
npm run test:smoke          # end-to-end API test (API running, simulation mode, fresh seed)

# Frontend (front/)
npm run dev                 # http://localhost:3000
npm run build
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
- Library: **lucide-react**. Functional: `ShieldCheck` (verified), `Store`, `Wallet`, `BadgeCheck` (verified store), `Lock` (escrow), `Star` (trust), `ScanLine` (inspection).

### Typography
- **Space Grotesk** → headings (`font-display`); **Inter** → body/UI (`font-sans`), via `next/font/google`.
- **Money & VP numbers**: always `tabular-nums` so digits align in tables/dashboards.

---


## Folder Structure

```
tugas/
├── docs/        modeling/ (assignment model) · ADMIN_PANEL.md · architecture & product docs
├── supabase/    config.toml (project_id valostock, ports 553xx) · migrations/*.sql · seed.sql
├── back/        scripts/ · src/(config, db, supabase, middlewares, lib, jobs, modules)
└── front/       src/app · src/components · src/lib/(api.ts, api-server.ts, auth.ts, data/, mock/) · src/types · public/images
```

---

## Code Conventions

- **TypeScript strict** in both services. No `any` (use `unknown` + narrowing).
- **All domain logic in the Express API.** SQL lives only in `back/src/modules/*` services/repositories (never in routes or `front/`).
- **SQL:** parameterised (`$1`) only. Money changes inside `withTransaction()` with `SELECT … FOR UPDATE` on balance rows.
- **Validate input** with zod on every endpoint (`.strict()` objects) and on frontend forms. Uploads: check MIME type + size (images ≤ 2 MB).
- **Money values** are integer Rupiah (`integer`/`bigint`), never floats.
- **Every balance change writes a ledger row** (`store_ledger` / `balance_ledger` / `loyalty_ledger`) with `balance_after`, in the same transaction.
- **Schema changes:** a new migration in `supabase/migrations/` (never edit an applied one), then `npm run docs:tables`, then ERD/DFD if relations change.
- **Every table has RLS enabled** (no policies) — only the API's own connection reads/writes.
- **File naming:** `kebab-case.ts`; React components `PascalCase.tsx` (existing kebab-case component files may stay).
- **Status enums** in sync with migrations, `ARCHITECTURE.md` state machines and the DFD.

---

## Environment Variables

Backend `back/.env` (never commit — see `back/.env.example`; values from `npx supabase status`):
```
PORT=4000
FRONTEND_URL=http://localhost:3000
DATABASE_URL=postgresql://valostock_api:<password>@127.0.0.1:55322/postgres
SUPABASE_URL=http://127.0.0.1:55321
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
PAYMENT_MODE=simulation        # simulation | midtrans
MIDTRANS_SERVER_KEY=
MIDTRANS_CLIENT_KEY=
```
Frontend `front/.env.local`: `NEXT_PUBLIC_API_URL=http://localhost:4000`.

---

## Do Not (Rules)

- **DO NOT** touch the other Supabase project on this machine (**yowana**, containers `supabase_*_yowana`, ports 543xx): no migrations, resets, buckets, users or queries there. valostock uses only project `valostock` (ports 553xx).
- **DO NOT** put money/trust logic, SQL, or Supabase keys in the web app — Express API only. The service-role key stays in `back/.env`.
- **DO NOT** sell anything that an admin has not approved: store must be `ACTIVE` **and** catalog `LISTED`.
- **DO NOT** auto-approve stores, catalogs, withdrawals, transfers or disputes — an admin decides, with a reason for every rejection, written to `audit_logs`.
- **DO NOT** mark anything PAID from the browser. Only the Midtrans Status API, a verified Midtrans webhook (SHA512 + `webhook_events` idempotency), or the simulation endpoint (`PAYMENT_MODE=simulation`).
- **DO NOT** change a balance or points without a ledger row in the same transaction.
- **DO NOT** let Balance buy accounts, be cashed out, or be transferred — closed-loop, top-up only.
- **DO NOT** accept a withdrawal/transfer whose account name MISMATCHes.
- **DO NOT** authorize by authentication alone — check ownership (buyer / store owner) or the admin permission on every endpoint.
- **DO NOT** build SQL strings from user input.
- **DO NOT** store tokens in localStorage — Supabase access/refresh tokens live in httpOnly cookies set by the API.
- **DO NOT** serve private media (inspection, rekber, dispute evidence) from a public bucket — `private-media` + signed URLs.
- **DO NOT** use absolute claims ("100% original/safe/guaranteed") in the UI.
- **DO NOT** allow individual (non-store) sellers or more than one catalog per account (unique `vs_code`).
- **DO NOT** reintroduce Prisma, MySQL/XAMPP, SQLite, DOKU, Xendit, Redis or a KYC provider unless explicitly asked.
- **DO NOT** create UML diagrams — Data Flow approach only.
- **DO NOT** commit secrets (`.env`, keys).

---

## Testing

`npm run test:smoke` in `back/` covers auth, catalog submit → admin moderation → listing, offers, orders/escrow/rekber/complete, disputes, ratings, vouchers, top-up/Balance, withdrawals/transfers, idempotency, IDOR and admin permissions. Then a browser pass through the main flows. After money steps, check the ledger tables in Supabase Studio.

## Build

```bash
npm run build   # in back/ and in front/ — both must compile with zero TypeScript errors
```

## Git Rules

After every change, **commit before continuing**. Clear messages. Never commit secrets, `node_modules`, `.next`, `dist`, or `supabase/.temp`.

## Best Coding Practices

- Follow the Development Workflow (9 steps).
- Single source of logic (Express services) — never duplicate money/trust rules.
- Atomic & idempotent money operations (`withTransaction` + status guards + unique keys).
- Write `audit_logs` for every admin decision and sensitive action.
- Only valid state transitions (store / catalog / order / offer / dispute / payment / withdrawal / transfer).
- Stay consistent with `docs/MONEY_RULES.md` for all numbers (implemented in `back/src/config/money.ts`).

## Security

helmet · CORS only `FRONTEND_URL` + Origin check on state-changing requests · zod strict validation · parameterised SQL · Supabase Auth (bcrypt, refresh-token rotation) with httpOnly cookies · RBAC permissions on admin endpoints · per-resource authorization · RLS on every table · private Storage bucket + signed URLs · upload type/size checks · rate limits on auth, checkout, uploads · Midtrans **Sandbox** keys only.
