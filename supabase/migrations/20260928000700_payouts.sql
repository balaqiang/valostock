-- valostock v8 · 7/9 — store payouts: external sellers (reseller), withdrawals, transfer requests.
-- Bank transfers (Midtrans Iris) are simulated: admin approval = COMPLETED.

create table public.external_sellers (
  id             uuid primary key default gen_random_uuid(),
  store_id       uuid not null references public.stores (id) on delete cascade,
  alias          text not null check (char_length(alias) between 2 and 60),
  payout_bank    text not null,
  payout_account text not null check (payout_account ~ '^[0-9]{6,20}$'),
  payout_name    text not null,
  note           text,
  created_at     timestamptz not null default now()
);
create index external_sellers_store_idx on public.external_sellers (store_id);

create table public.withdrawals (
  id                uuid primary key default gen_random_uuid(),
  withdrawal_number text not null unique,
  store_id          uuid not null references public.stores (id),
  amount            integer not null,
  fee               integer not null,
  bank_name         text not null,
  account_number    text not null check (account_number ~ '^[0-9]{6,20}$'),
  account_name      text not null,
  name_match        public.name_match not null check (name_match <> 'MISMATCH'),
  status            public.payout_status not null default 'PENDING',
  review_note       text,
  reviewed_by       uuid references public.profiles (id),
  reviewed_at       timestamptz,
  created_at        timestamptz not null default now(),
  check (amount > fee)
);
create index withdrawals_store_idx on public.withdrawals (store_id, created_at desc);
create index withdrawals_status_idx on public.withdrawals (status, created_at);

create table public.transfer_requests (
  id                 uuid primary key default gen_random_uuid(),
  transfer_number    text not null unique,
  store_id           uuid not null references public.stores (id),
  external_seller_id uuid not null references public.external_sellers (id),
  order_id           uuid not null unique references public.orders (id),
  amount             integer not null,
  fee                integer not null,
  name_match         public.name_match not null check (name_match <> 'MISMATCH'),
  status             public.payout_status not null default 'PENDING',
  review_note        text,
  reviewed_by        uuid references public.profiles (id),
  reviewed_at        timestamptz,
  created_at         timestamptz not null default now(),
  check (amount > fee)
);
comment on table public.transfer_requests is 'Toko reseller membayar penjual eksternal dari saldo tersedia sendiri, satu per pesanan selesai.';
create index transfer_requests_status_idx on public.transfer_requests (status, created_at);
