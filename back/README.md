# valostock.id — API (`back/`)

Express 5 + TypeScript API. **All business logic lives here:** prices and fees (`src/config/money.ts`), the Balance
ledger, invoice and payment state, admin checks. It talks to the Supabase project `valostock` with `pg` (Postgres,
role `valostock_api`) and `@supabase/supabase-js` (Auth, service role). Architecture and API contract:
`../docs/ARCHITECTURE.md`.

## Run

```bash
cp .env.example .env              # Supabase Cloud: docs/SETUP_CLOUD.md · local Docker: keys from `npx supabase status`
npm install
npm run dev                       # http://localhost:4000/api/health
```

| Variable | Meaning |
|---|---|
| `DATABASE_URL`, `DATABASE_SSL` | Postgres as `valostock_api` (`require` for Supabase Cloud) |
| `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | Supabase Auth |
| `FRONTEND_URL` | CORS + Origin check + payment redirect links (`http://localhost:3000`) |
| `PAYMENT_MODE` | `simulation` (default) or `midtrans` (needs `MIDTRANS_SERVER_KEY` / `MIDTRANS_CLIENT_KEY`, Sandbox) |
| `JOBS_ENABLED` | `true` runs the invoice-expiry job every minute |

## Layout

```
src/
├── app.ts · server.ts
├── config/       env.ts (zod) · money.ts (MONEY_RULES)
├── db/           pool.ts — parameterised helpers + withTransaction
├── supabase/     client.ts
├── middlewares/  auth.ts (session cookies, requireUser, requireAdmin) · security.ts
├── lib/          ledger.ts (the only place a Balance changes) · audit · ids · errors
├── jobs/         scheduler.ts
└── modules/      auth · games · topup · payments · me · admin
```

## Scripts

```bash
npm run dev             # tsx watch
npm run dev:sim         # second API on :4100 with PAYMENT_MODE=simulation, jobs off (for tests while .env uses midtrans)
npm run build           # tsc → dist/
npm run test:unit       # node:test unit tests for the money rules (no API needed)
npm run test:smoke      # end-to-end test over the API, following the PDHUPL scenarios
npm run docs:tables     # regenerate ../docs/modeling/05-struktur-tabel.md from the database
npm run cloud:setup -- "<session pooler URL>" [--reset]   # install the schema + demo data on Supabase Cloud
```

The smoke test talks to the running API (`API_URL`; otherwise the first of `:4000` / `:4100` that reports simulation
mode) and uses the demo accounts from the root README.
