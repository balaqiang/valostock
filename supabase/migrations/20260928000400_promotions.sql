-- valostock v8 · 4/9 — store promotions & ads (docs/modeling/03-erd.md §3.E).
-- voucher_redemptions lives in 5/9 because it references orders.

create table public.store_vouchers (
  id         uuid primary key default gen_random_uuid(),
  store_id   uuid not null references public.stores (id) on delete cascade,
  code       text not null check (code ~ '^[A-Z0-9]{3,30}$'),
  kind       public.discount_kind not null,
  value      integer not null check (value > 0),
  min_spend  integer not null default 0 check (min_spend >= 0),
  quota      integer check (quota is null or quota > 0),
  used       integer not null default 0 check (used >= 0),
  starts_at  timestamptz not null default now(),
  expires_at timestamptz,
  is_active  boolean not null default true,
  created_at timestamptz not null default now(),
  unique (store_id, code),
  check (kind <> 'PERCENT' or value <= 90)
);

create table public.flash_sales (
  id         uuid primary key default gen_random_uuid(),
  store_id   uuid not null references public.stores (id) on delete cascade,
  catalog_id uuid not null references public.catalogs (id) on delete cascade,
  sale_price integer not null check (sale_price >= 10000),
  starts_at  timestamptz not null,
  ends_at    timestamptz not null,
  created_at timestamptz not null default now(),
  check (ends_at > starts_at)
);
create index flash_sales_catalog_idx on public.flash_sales (catalog_id, starts_at, ends_at);

create table public.bundles (
  id           uuid primary key default gen_random_uuid(),
  store_id     uuid not null references public.stores (id) on delete cascade,
  title        text not null check (char_length(title) between 5 and 200),
  bundle_price integer not null check (bundle_price >= 10000),
  status       public.bundle_status not null default 'ACTIVE',
  created_at   timestamptz not null default now()
);

create table public.bundle_items (
  bundle_id  uuid not null references public.bundles (id) on delete cascade,
  catalog_id uuid not null references public.catalogs (id) on delete cascade,
  primary key (bundle_id, catalog_id)
);

create table public.featured_listings (
  id            uuid primary key default gen_random_uuid(),
  store_id      uuid not null references public.stores (id) on delete cascade,
  catalog_id    uuid not null references public.catalogs (id) on delete cascade,
  duration_days integer not null check (duration_days in (1, 3, 7, 14, 30)),
  price         integer not null check (price >= 0),
  is_free       boolean not null default false,
  status        public.featured_status not null default 'PENDING_PAYMENT',
  starts_at     timestamptz,
  ends_at       timestamptz,
  stop_reason   text,
  created_at    timestamptz not null default now()
);
create index featured_listings_active_idx on public.featured_listings (status, ends_at);
