# valostock.id — API (`back/`)

Express 5 + TypeScript API. **All business logic lives here:** pricing and fees (`src/config/money.ts`), ledgers,
state machines, permissions, payments. It talks to the local Supabase project `valostock` with `pg` (Postgres, role
`valostock_api`) and `@supabase/supabase-js` (Auth + Storage, service role). Architecture and API contract:
`../docs/ARCHITECTURE.md`.

## Run

```bash
npx supabase start --workdir ..   # once (Docker Desktop running)
cp .env.example .env              # keys from `npx supabase status`
npm install
npm run dev                       # http://localhost:4000/api/health
```

| Variable | Meaning |
|---|---|
| `DATABASE_URL` | `postgresql://valostock_api:valostock_api_dev@127.0.0.1:55322/postgres` (local only) |
| `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | from `npx supabase status` |
| `FRONTEND_URL` | CORS + Origin check + redirect links (`http://localhost:3000`) |
| `PAYMENT_MODE` | `simulation` (default) or `midtrans` (needs `MIDTRANS_SERVER_KEY` / `MIDTRANS_CLIENT_KEY`, Sandbox) |
| `JOBS_ENABLED` | `true` runs the node-cron jobs every minute |

## Layout

```
src/
├── app.ts · server.ts
├── config/       env.ts (zod) · money.ts (MONEY_RULES)
├── db/           pool.ts — parameterised helpers + withTransaction
├── supabase/     client.ts · storage.ts (magic-byte check, uploads, signed URLs)
├── middlewares/  auth.ts (session cookies, requireUser, requirePermission) · security.ts · upload.ts
├── lib/          ledger.ts (the only place balances/points change) · audit · notify · ids · errors · name-match
├── jobs/         scheduler.ts
└── modules/      auth · public · catalogs · store · offers · orders · disputes · chat · me · payments · topup · admin
```

## Scripts

```bash
npm run dev             # tsx watch
npm run dev:sim         # second API on :4100 with PAYMENT_MODE=simulation, jobs off (for tests while .env uses midtrans)
npm run build           # tsc → dist/
npm run db:reset        # npx supabase db reset (migrations + seed, project valostock only)
npm run db:seed:gen     # regenerate ../supabase/seed.sql from ../front/src/lib/mock
npm run docs:tables     # regenerate ../docs/modeling/05-struktur-tabel.md from the database
npm run test:smoke      # 14-step end-to-end test (API running, simulation mode, fresh seed)
npm run test:features   # 15 steps: promotions, reseller transfers, lock, ads, reports, master data, RBAC,
                        # deposit fine/top-up, store closure, late-payment refund, top-up refunds, Balance adjust, plan tools
npm run test:unit       # node:test unit tests for money rules + name matching (no API needed)
npm run test:sweep      # every read endpoint for admin / store / buyer
```

The HTTP tests talk to the running API (`API_URL`; otherwise the first of `:4100` / `:4000` that reports simulation mode) and use the demo accounts
(password `valostock-demo`).
