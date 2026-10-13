-- valostock v8 · 3/9 — stores, subscriptions, store balance ledger, games, field templates,
-- catalogs + moderation history + inspections. (docs/modeling/03-erd.md §3.A, §3.B)

create table public.stores (
  id                uuid primary key default gen_random_uuid(),
  owner_id          uuid not null unique references public.profiles (id),
  slug              text not null unique check (slug ~ '^[a-z0-9-]{2,60}$'),
  name              text not null check (char_length(name) between 3 and 100),
  type              public.store_type not null default 'OWNER',
  level             public.store_level not null default 'AUTHORIZED',
  status            public.store_status not null default 'PENDING_DEPOSIT',
  owner_legal_name  text not null,
  description       text,
  gradient          text not null default 'from-violet-600 to-fuchsia-600',
  deposit_amount    integer not null default 500000,
  deposit_status    public.deposit_status not null default 'UNPAID',
  identity_verified boolean not null default false,
  rating            numeric(3, 2) not null default 0,
  reviews           integer not null default 0,
  sold              integer not null default 0,
  followers         integer not null default 0,
  score_desc        numeric(3, 2) not null default 0,
  score_attitude    numeric(3, 2) not null default 0,
  score_delivery    numeric(3, 2) not null default 0,
  review_note       text,
  reviewed_by       uuid references public.profiles (id),
  reviewed_at       timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
comment on column public.stores.owner_legal_name is 'Nama pemilik sesuai KTP — diverifikasi manual oleh admin (pengganti KYC), dipakai untuk mencocokkan nama rekening.';
create index stores_status_idx on public.stores (status);
create trigger stores_updated_at before update on public.stores for each row execute function public.set_updated_at();

create table public.store_subscriptions (
  store_id            uuid primary key references public.stores (id) on delete cascade,
  tier                public.subscription_tier not null default 'FREE',
  commission_rate     numeric(5, 4) not null default 0.0500,
  max_listings        integer,            -- null = tanpa batas (Business)
  free_featured_slots integer not null default 0,
  used_featured_slots integer not null default 0,
  current_period_end  timestamptz,        -- null untuk FREE
  updated_at          timestamptz not null default now()
);
create trigger store_subscriptions_updated_at before update on public.store_subscriptions for each row execute function public.set_updated_at();

create table public.store_balances (
  store_id   uuid primary key references public.stores (id) on delete cascade,
  escrow     integer not null default 0 check (escrow >= 0),
  available  integer not null default 0 check (available >= 0),
  updated_at timestamptz not null default now()
);
create trigger store_balances_updated_at before update on public.store_balances for each row execute function public.set_updated_at();

create table public.store_ledger (
  id            bigint generated always as identity primary key,
  store_id      uuid not null references public.stores (id),
  bucket        public.ledger_bucket not null,
  type          public.store_ledger_type not null,
  amount        integer not null,
  balance_after integer not null,
  ref_type      text not null,
  ref_id        uuid,
  note          text,
  created_at    timestamptz not null default now()
);
comment on table public.store_ledger is 'Buku besar saldo toko (append-only). Setiap perubahan store_balances wajib punya baris di sini.';
create index store_ledger_store_idx on public.store_ledger (store_id, id desc);
create index store_ledger_ref_idx on public.store_ledger (ref_type, ref_id);

create table public.store_sanctions (
  id         uuid primary key default gen_random_uuid(),
  store_id   uuid not null references public.stores (id),
  type       public.sanction_type not null,
  amount     integer not null default 0 check (amount >= 0),
  reason     text not null,
  created_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now()
);
create index store_sanctions_store_idx on public.store_sanctions (store_id);

-- ── Games & catalogs ──

create table public.games (
  id               integer generated always as identity primary key,
  slug             text not null unique check (slug ~ '^[a-z0-9-]{2,50}$'),
  name             text not null,
  publisher        text not null,
  tagline          text not null,
  description      text not null,
  supports_account boolean not null default false,
  supports_topup   boolean not null default false,
  has_skin_api     boolean not null default false,
  is_hot           boolean not null default false,
  is_active        boolean not null default true,
  uid_label        text not null,
  uid_hint         text not null,
  uid_extra_label  text,
  gradient         text not null,
  topup_currency   text,
  image            text,
  sort_order       integer not null default 0,
  created_at       timestamptz not null default now()
);

create table public.game_field_templates (
  id         uuid primary key default gen_random_uuid(),
  game_id    integer not null references public.games (id) on delete cascade,
  key        text not null check (key ~ '^[a-zA-Z][a-zA-Z0-9_]{0,40}$'),
  label      text not null,
  type       public.field_type not null,
  required   boolean not null default false,
  options    jsonb,                 -- daftar pilihan untuk SELECT
  filterable boolean not null default false,
  help_text  text,
  sort_order integer not null default 0,
  unique (game_id, key)
);
comment on table public.game_field_templates is 'Kolom katalog per game: menentukan form toko, isi catalogs.attributes, dan filter pencarian.';

create table public.catalogs (
  id              uuid primary key default gen_random_uuid(),
  vs_code         text unique,          -- diterbitkan saat pertama diajukan
  store_id        uuid not null references public.stores (id),
  game_id         integer not null references public.games (id),
  title           text not null check (char_length(title) between 5 and 200),
  description     text,
  price           integer not null check (price >= 10000),
  old_price       integer check (old_price is null or old_price > 0),
  status          public.catalog_status not null default 'DRAFT',
  attributes      jsonb not null default '{}'::jsonb,
  account_checked boolean not null default false,
  instant         boolean not null default false,
  views           integer not null default 0,
  review_note     text,                 -- alasan penolakan/penurunan terakhir
  submitted_at    timestamptz,
  listed_at       timestamptz,
  sort_order      integer not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
comment on column public.catalogs.status is 'DRAFT → PENDING_REVIEW → LISTED/REJECTED (admin). LISTED → LOCKED → IN_ORDER → SOLD. Lihat ARCHITECTURE §5.1.';
create index catalogs_store_idx on public.catalogs (store_id, status);
create index catalogs_game_status_idx on public.catalogs (game_id, status);
create index catalogs_attributes_idx on public.catalogs using gin (attributes jsonb_path_ops);
create index catalogs_pending_idx on public.catalogs (submitted_at) where status = 'PENDING_REVIEW';
create trigger catalogs_updated_at before update on public.catalogs for each row execute function public.set_updated_at();

create table public.catalog_images (
  id           uuid primary key default gen_random_uuid(),
  catalog_id   uuid not null references public.catalogs (id) on delete cascade,
  storage_path text not null,           -- objek di bucket catalog-images, atau /images/... untuk data seed
  sort_order   integer not null default 0,
  created_at   timestamptz not null default now()
);
create index catalog_images_catalog_idx on public.catalog_images (catalog_id, sort_order);

create table public.catalog_reviews (
  id         uuid primary key default gen_random_uuid(),
  catalog_id uuid not null references public.catalogs (id) on delete cascade,
  actor_id   uuid not null references public.profiles (id),
  decision   public.review_decision not null,
  reasons    text[] not null default '{}',
  note       text,
  created_at timestamptz not null default now()
);
comment on table public.catalog_reviews is 'Riwayat moderasi: pengajuan toko dan keputusan admin (setuju/tolak/turunkan) beserta alasan.';
create index catalog_reviews_catalog_idx on public.catalog_reviews (catalog_id, created_at desc);

create table public.account_inspections (
  id           uuid primary key default gen_random_uuid(),
  catalog_id   uuid not null unique references public.catalogs (id) on delete cascade,
  inspected_by uuid not null references public.profiles (id),
  checklist    jsonb not null,          -- {login_success, no_restriction, inventory_matches, rank_matches, twofa_active}
  media        jsonb not null default '[]'::jsonb,  -- path di bucket private-media
  notes        text,
  result       public.inspection_result not null,
  created_at   timestamptz not null default now()
);
