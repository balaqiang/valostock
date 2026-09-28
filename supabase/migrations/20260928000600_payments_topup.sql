-- valostock v8 · 6/9 — payments (Midtrans), top-up, closed-loop Balance (docs/modeling/03-erd.md §3.D).

create table public.payments (
  id                      uuid primary key default gen_random_uuid(),
  midtrans_order_id       text not null unique,
  purpose                 public.payment_purpose not null,
  ref_id                  uuid not null,
  user_id                 uuid references public.profiles (id),
  amount                  integer not null check (amount > 0),
  payment_method          public.gateway_method not null,
  meta                    jsonb not null default '{}'::jsonb,   -- mis. {"tier":"PRO"} untuk SUBSCRIPTION
  snap_token              text,
  redirect_url            text,
  status                  public.payment_status not null default 'PENDING',
  midtrans_transaction_id text,
  payment_type            text,
  created_at              timestamptz not null default now(),
  paid_at                 timestamptz
);
comment on column public.payments.ref_id is 'Tujuan sesuai purpose: topup_orders / balance_topups / orders / stores (deposit, langganan) / featured_listings / catalog_locks.';
create index payments_ref_idx on public.payments (purpose, ref_id);
create index payments_pending_idx on public.payments (created_at) where status = 'PENDING';

create table public.webhook_events (
  id              bigint generated always as identity primary key,
  source          text not null default 'MIDTRANS',
  external_id     text not null,
  payment_id      uuid references public.payments (id),
  payload         jsonb not null,
  signature_valid boolean not null default false,
  processed       boolean not null default false,
  received_at     timestamptz not null default now(),
  unique (source, external_id)
);

create table public.topup_products (
  id           text primary key check (id ~ '^[a-z0-9-]{2,36}$'),
  game_id      integer not null references public.games (id),
  name         text not null,
  amount_label text not null,
  retail_price integer not null check (retail_price > 0),
  popular      boolean not null default false,
  is_active    boolean not null default true,
  sort_order   integer not null default 0
);
create index topup_products_game_idx on public.topup_products (game_id, sort_order);

create table public.promo_codes (
  id         integer generated always as identity primary key,
  code       text not null unique check (code ~ '^[A-Z0-9]{3,30}$'),
  kind       public.discount_kind not null,
  value      integer not null check (value > 0),
  min_spend  integer not null default 0,
  label      text not null,
  quota      integer check (quota is null or quota > 0),
  used_count integer not null default 0,
  expires_at timestamptz,
  is_active  boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.topup_orders (
  id               uuid primary key default gen_random_uuid(),
  invoice_number   text not null unique,
  user_id          uuid references public.profiles (id),
  product_id       text not null references public.topup_products (id),
  promo_code_id    integer references public.promo_codes (id),
  user_game_id     text not null,
  game_zone_id     text,
  contact_email    text,
  contact_whatsapp text,
  base_price       integer not null,
  discount         integer not null default 0,
  surcharge        integer not null default 0,
  amount           integer not null check (amount > 0),
  pay_source       text not null check (pay_source in ('MIDTRANS', 'BALANCE')),
  payment_method   public.topup_method not null,
  status           public.topup_status not null default 'PENDING',
  provider_ref     text,
  created_at       timestamptz not null default now(),
  paid_at          timestamptz,
  check (amount = base_price - discount + surcharge)
);
create index topup_orders_user_idx on public.topup_orders (user_id, created_at desc);
create index topup_orders_status_idx on public.topup_orders (status, created_at desc);

create table public.balance_topups (
  id              uuid primary key default gen_random_uuid(),
  invoice_number  text not null unique,
  user_id         uuid not null references public.profiles (id),
  nominal         integer not null check (nominal > 0),
  qty             integer not null check (qty between 1 and 10),
  credit          integer not null,
  payment_method  public.gateway_method not null,
  surcharge       integer not null default 0,
  amount          integer not null,
  idempotency_key text not null,
  status          public.balance_topup_status not null default 'PENDING',
  created_at      timestamptz not null default now(),
  paid_at         timestamptz,
  unique (user_id, idempotency_key),
  check (credit = nominal * qty),
  check (amount = credit + surcharge)
);

create table public.balance_ledger (
  id            bigint generated always as identity primary key,
  user_id       uuid not null references public.profiles (id),
  type          public.balance_ledger_type not null,
  amount        integer not null,
  balance_after integer not null check (balance_after >= 0),
  reference     text not null,
  created_at    timestamptz not null default now()
);
comment on table public.balance_ledger is 'Buku besar Balance (closed-loop, top-up only). Setiap perubahan profiles.balance wajib punya baris di sini.';
create index balance_ledger_user_idx on public.balance_ledger (user_id, id desc);
