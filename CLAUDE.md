# CLAUDE.md — valostock.id

Trust-based marketplace for game accounts (Valorant, MLBB, etc.) + game top-up. Admin-verified stores, Midtrans payments with a per-store escrow ledger, in-app rekber room.
**This repository is a college-assignment PROTOTYPE**, running locally on XAMPP. Keep solutions simple and demonstrable; do not add production infrastructure.

**Two services:** `front/` (Next.js 16) + `back/` (Express.js + mysql2, **no ORM**) on **MySQL via XAMPP** (schema imported with phpMyAdmin). All domain logic lives in the API. This file is the entry point for any developer or AI on the project.

---

## Source of Truth

The docs in `/docs` are the **primary source of truth**. Do not assume when the answer is in the docs.

| Document | Contents |
|---|---|
| `docs/modeling/` | **Assignment model (Data Flow approach):** Diagram Konteks, DFD Level 1/2, ERD, Basis Data Konseptual, Struktur Tabel — in Indonesian |
| `back/database/schema.sql` | Executable schema (19 tables). Must equal `docs/modeling/05-struktur-tabel.md` |
| `docs/ARCHITECTURE.md` | Prototype architecture, API contract, payment flow, store verification, local setup |
| `docs/MONEY_RULES.md` | All money numbers & rules (commission, fees, protection, Balance) |
| `docs/PRD.md` | Requirements, actors, phases, risks |
| `docs/SITEMAP.md` | Pages, route tree, guards |
| `docs/STORE_RULES.md` | Store handbook |
| `docs/MEGA_FLOW.md` | End-to-end flowchart of the prototype |
| `docs/VALOSTOCK_OVERVIEW.md` | Concept overview |
| `docs/ERD.md` | Pointer to the prototype ERD + list of future-work tables |

**Modelling approach:** the assignment requires ONE approach. This project uses **Data Flow (Alur Data)**. **Do not create UML diagrams** (use case, class, sequence, activity).

---

## Development Workflow

Every implementation MUST follow this order (when relevant). Never skip or reorder without explicit instruction:

1. **Documentation** (`/docs`)
2. **User & System Flow**
3. **Diagrams** (Diagram Konteks / DFD / flowchart — Mermaid)
4. **ERD / Database** (`docs/modeling/03–05` → `back/database/schema.sql`)
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

## Prototype Scope

**Implemented:** email/password auth · games/stores/listings/help from the API · top-up (promo, Midtrans or Balance, simulated delivery, invoice check) · closed-loop Balance fill + ledger · account purchase → escrow → rekber messages → "Akun aman" → "Selesai" → escrow release with 5% commission · store onboarding (form → deposit → **manual admin verification**) · store catalogs, orders, balance, withdrawal requests · admin: verify stores, approve/reject withdrawals, analytics.

**Simulated:** Midtrans Iris payouts (admin approval = completed), Digiflazz fulfilment (PAID top-up = SUCCESS), and — when `PAYMENT_MODE=simulation` — the Midtrans payment page itself.

**Not in the prototype (UI shows demo data from `front/src/lib/mock`):** offers, ratings, disputes, wishlist/follow, loyalty, affiliate, subscriptions, ads, flash sales, bundles, external sellers/transfers, notifications, inspections. **No Sumsub/KYC provider, no Prisma, no Redis/queues, no Socket.IO, no Docker/VPS.**

---

## Tech Stack

**Frontend — `front/`:** Next.js 16 (App Router) · React 19 · TypeScript strict · Tailwind CSS v4 · lucide-react · Framer Motion · zod · Inter + Space Grotesk (`next/font`).

**Backend — `back/`:**
| Tool | Notes |
|---|---|
| Node.js 20+ · Express 5 | layered: `*.routes.ts` → `*.service.ts` → `*.repository.ts` |
| TypeScript | strict, run with `tsx` (dev) / compiled with `tsc` |
| mysql2/promise | connection pool, **parameterised queries only**, `withTransaction()` helper |
| MySQL (MariaDB 10.4) | XAMPP, `127.0.0.1:3306`, database `valostock` |
| zod | request + `.env` validation |
| bcryptjs · jsonwebtoken · cookie-parser | password hashing, JWT in httpOnly cookie |
| helmet · cors · express-rate-limit | security headers, strict CORS, rate limit |
| fetch → Midtrans | Snap `POST /snap/v1/transactions` + Status API `GET /v2/{order_id}/status` |

**Package manager:** npm.

---

## Commands

```bash
# XAMPP: start "MySQL" (and "Apache" for phpMyAdmin at http://localhost/phpmyadmin)
# phpMyAdmin → Import back/database/schema.sql, then back/database/seed.sql

# Backend (back/)
npm run dev            # tsx watch → http://localhost:4000/api/health
npm run build          # tsc → dist/
npm run start          # node dist/server.js
npm run db:seed:gen    # regenerate database/seed.sql from front/src/lib/mock
npm run db:reset       # re-import schema.sql + seed.sql with the XAMPP mysql CLI

# Frontend (front/)
npm run dev            # http://localhost:3000
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
├── docs/            modeling/ (assignment model) + architecture/product docs
├── front/           src/app  src/components  src/lib/(api.ts, api-server.ts, auth.ts, data/, mock/)  src/types  public/images
└── back/            database/(schema.sql, seed.sql)  scripts/  src/(config, db, middlewares, lib, modules)
```

---

## Code Conventions

- **TypeScript strict** in both services. No `any` (use `unknown` + narrowing).
- **All domain logic in the Express API.** Only repositories contain SQL. The web app never computes/mutates money or trust and has no DB access or secrets.
- **SQL:** parameterised (`?` placeholders) only — never concatenate user input. Money changes inside `withTransaction()` with `SELECT … FOR UPDATE` on balance rows.
- **Validate input** with zod on every endpoint (`.strict()` objects) and on frontend forms.
- **Money values** are integer Rupiah (MySQL `INT`), never floats.
- **Every balance change writes a ledger row** (`balance_ledger` / `store_ledger`) with `balance_after`, in the same transaction.
- **Schema changes:** edit `back/database/schema.sql` + `docs/modeling/05-struktur-tabel.md` (+ ERD/DFD if relations change) together.
- **File naming:** `kebab-case.ts`; React components `PascalCase.tsx` (existing kebab-case component files may stay).
- **Status enums** in sync with `schema.sql` and the DFD.

---

## Environment Variables

Backend `back/.env` (never commit — see `back/.env.example`):
```
PORT=4000
FRONTEND_URL=http://localhost:3000
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=valostock
DB_PASSWORD=
DB_NAME=valostock
JWT_SECRET=
PAYMENT_MODE=simulation        # simulation | midtrans
MIDTRANS_SERVER_KEY=           # Sandbox server key (only when PAYMENT_MODE=midtrans)
MIDTRANS_CLIENT_KEY=
```
Frontend `front/.env.local`: `NEXT_PUBLIC_API_URL=http://localhost:4000`.

---

## Do Not (Rules)

- **DO NOT** put money/trust logic or SQL in the web app — Express API only.
- **DO NOT** mark anything PAID from the browser. Only the Midtrans Status API answer, a verified Midtrans webhook (SHA512 signature + `webhook_events` idempotency), or the simulation endpoint (only when `PAYMENT_MODE=simulation`) may do it.
- **DO NOT** change `users.balance` or `store_balances` without a ledger row in the same transaction.
- **DO NOT** let Balance buy accounts, be cashed out, or be transferred — closed-loop, top-up only.
- **DO NOT** auto-approve stores or withdrawals — an admin decides, and it is written to `audit_logs`.
- **DO NOT** accept a withdrawal whose account name MISMATCHes the store's `owner_legal_name`.
- **DO NOT** authorize by authentication alone — check ownership (buyer / store owner / admin) on every order, store and money endpoint.
- **DO NOT** build SQL strings from user input; no ORM is used, so this is the main injection risk.
- **DO NOT** store JWTs in localStorage — httpOnly cookie only.
- **DO NOT** use absolute claims ("100% original/safe/guaranteed") in the UI.
- **DO NOT** allow individual (non-store) sellers or more than one catalog per account (unique `vs_code`).
- **DO NOT** reintroduce Prisma, Sumsub/KYC providers, SQLite, DOKU, Xendit, Redis, Socket.IO or Docker unless explicitly asked.
- **DO NOT** create UML diagrams — the assignment uses the Data Flow approach only.
- **DO NOT** commit secrets (`.env`, keys).

---

## Testing

Manual test scenarios (demo): register/login · top-up via Midtrans Sandbox/simulation + invoice check · Balance fill → top-up with Balance · buy account → rekber → Akun aman → Selesai → store balance · store onboarding → admin approve · withdrawal → admin approve/reject. Verify ledger rows in phpMyAdmin after each money step.

## Build

```bash
npm run build   # in back/ and in front/ — both must compile with zero TypeScript errors
```

## Git Rules

After every change, **commit before continuing**. Clear messages. Never commit secrets, `node_modules`, `.next`, or `dist`.

## Best Coding Practices

- Follow the Development Workflow (9 steps).
- Single source of logic (Express services) — never duplicate money/trust rules.
- Atomic & idempotent money operations (`withTransaction` + status guards + unique keys).
- Write `audit_logs` for admin actions (store approve/reject, withdrawal approve/reject).
- Only valid state transitions (order / catalog / payment / store / withdrawal).
- Stay consistent with `docs/MONEY_RULES.md` for all numbers (implemented in `back/src/config/money.ts`).

## Security (prototype level)

helmet · CORS only `FRONTEND_URL` + Origin check on state-changing requests · zod strict validation · parameterised SQL · bcrypt passwords · JWT in httpOnly SameSite=Lax cookie · rate limit on auth & checkout · per-resource authorization · MySQL bound to 127.0.0.1 with a dedicated app user · Midtrans **Sandbox** keys only. Production hardening (Sentry, WAF, backups, pen-test, legal review of custody) is future work.
