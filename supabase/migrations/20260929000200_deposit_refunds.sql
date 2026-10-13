-- valostock v8.1 · 2/2 — deposit bucket of the store balance + refund queue
-- (docs/MONEY_RULES.md §12, §12b; docs/modeling/03-erd.md §3.A, §3.D).

-- Deposit held for the store: changes only with a store_ledger row in bucket DEPOSIT.
alter table public.store_balances
  add column deposit integer not null default 0 check (deposit >= 0);
comment on column public.store_balances.deposit is 'Deposit keamanan yang ditahan (DEPOSIT_HOLD − DEPOSIT_DEDUCTION − DEPOSIT_REFUND).';

create type public.refund_source as enum ('PAID_AFTER_CANCEL', 'LOCK_UNAVAILABLE', 'TOPUP_UNDELIVERED');
create type public.refund_status as enum ('PENDING', 'COMPLETED');

create table public.refunds (
  id          uuid primary key default gen_random_uuid(),
  payment_id  uuid not null unique references public.payments (id),
  user_id     uuid references public.profiles (id),
  amount      integer not null check (amount > 0),
  source      public.refund_source not null,
  reference   text not null,              -- no. pesanan / invoice
  status      public.refund_status not null default 'PENDING',
  note        text,
  handled_by  uuid references public.profiles (id),
  handled_at  timestamptz,
  created_at  timestamptz not null default now()
);
comment on table public.refunds is 'Uang yang masuk tetapi tujuannya sudah tidak ada; admin menyelesaikan pengembalian (refund Midtrans disimulasikan).';
create index refunds_status_idx on public.refunds (status, created_at);

-- Same security model as every other table (see 20260928000900_security.sql).
alter table public.refunds enable row level security;
revoke all on table public.refunds from anon, authenticated;
grant select, insert, update on table public.refunds to valostock_api;
