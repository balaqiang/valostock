-- valostock.id (top-up) · 1/2 — enums, 7 main tables, 2 supporting tables, profile trigger.
-- Source of truth: docs/modeling/03-erd.md (= SKPL 4.2.7–4.2.9), docs/ARCHITECTURE.md §5.

-- ── Enums ──
create type public.user_role as enum ('USER', 'ADMIN');
create type public.topup_section as enum ('SPECIAL', 'INSTANT');
create type public.discount_kind as enum ('PERCENT', 'FIXED');
create type public.gateway_method as enum ('QRIS', 'VA', 'RETAIL', 'EWALLET', 'CC');
create type public.topup_method as enum ('QRIS', 'VA', 'RETAIL', 'EWALLET', 'CC', 'BALANCE');
create type public.topup_status as enum ('PENDING', 'SUCCESS', 'FAILED', 'EXPIRED');
create type public.balance_topup_status as enum ('PENDING', 'PAID', 'FAILED', 'EXPIRED');
create type public.balance_ledger_type as enum ('TOPUP_CREDIT', 'SPEND_TOPUP', 'REFERRAL_CREDIT');
create type public.payment_purpose as enum ('TOPUP', 'BALANCE_FILL');
create type public.payment_status as enum ('PENDING', 'PAID', 'EXPIRED', 'FAILED');

-- ── D1 profiles (1:1 with Supabase auth.users) ──
create table public.profiles (
  id            uuid primary key references auth.users (id) on delete cascade,
  email         text not null,
  name          text not null check (char_length(name) between 2 and 100),
  phone         text unique,
  role          public.user_role not null default 'USER',
  balance       integer not null default 0 check (balance >= 0),
  referral_code text not null unique,
  referred_by   uuid references public.profiles (id),
  created_at    timestamptz not null default now()
);
comment on table public.profiles is 'Data aplikasi per akun Supabase Auth. balance = ringkasan balance_ledger.';
create index profiles_email_idx on public.profiles (lower(email));

-- New Supabase Auth user → profile row. Reads name/phone/ref from the signUp metadata.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  referrer uuid;
  code text;
begin
  if coalesce(meta ->> 'ref', '') <> '' then
    select id into referrer from public.profiles where referral_code = upper(meta ->> 'ref');
  end if;
  loop
    code := upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8));
    exit when not exists (select 1 from public.profiles where referral_code = code);
  end loop;
  insert into public.profiles (id, email, name, phone, referral_code, referred_by)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(nullif(meta ->> 'name', ''), split_part(coalesce(new.email, 'pengguna'), '@', 1)),
    nullif(meta ->> 'phone', ''),
    code,
    referrer
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── D2 games ──
create table public.games (
  id                integer generated always as identity primary key,
  slug              text not null unique check (slug ~ '^[a-z0-9-]{2,50}$'),
  name              text not null,
  publisher         text not null,
  tagline           text not null,
  is_hot            boolean not null default false,
  is_active         boolean not null default true,
  uid_label         text not null,
  uid_hint          text not null,
  uid_extra_label   text,
  uid_extra_options text[] check (uid_extra_options is null or cardinality(uid_extra_options) between 1 and 20),
  gradient          text not null,
  topup_currency    text,
  image             text check (image is null or image ~ '^/images/[A-Za-z0-9/_.()-]+$'),
  sort_order        integer not null default 0,
  created_at        timestamptz not null default now()
);
comment on table public.games is 'Game yang bisa di-top-up (data master).';

-- ── D3 topup_products (CRUD by Admin) ──
create table public.topup_products (
  id             text primary key check (id ~ '^[a-z0-9-]{2,36}$'),
  game_id        integer not null references public.games (id),
  name           text not null,
  amount_label   text not null,
  retail_price   integer not null check (retail_price > 0),
  popular        boolean not null default false,
  is_active      boolean not null default true,
  sort_order     integer not null default 0,
  supplier_price integer not null check (supplier_price > 0),
  section        public.topup_section not null default 'INSTANT',
  icon           text check (icon is null or icon ~ '^/images/[a-z0-9/_.-]+$'),
  check (retail_price >= supplier_price)
);
comment on table public.topup_products is 'Nominal top-up per game. Harga jual tidak boleh di bawah harga modal Digiflazz.';
create index topup_products_game_idx on public.topup_products (game_id, sort_order);

-- ── D4 promo_codes ──
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
  created_at timestamptz not null default now(),
  check (kind <> 'PERCENT' or value <= 90)
);

-- ── D5 topup_orders ──
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
  payment_method   public.topup_method not null,
  status           public.topup_status not null default 'PENDING',
  created_at       timestamptz not null default now(),
  paid_at          timestamptz,
  check (amount = base_price - discount + surcharge)
);
comment on table public.topup_orders is 'Invoice top-up game. user_id kosong = tamu (Pengunjung).';
create index topup_orders_user_idx on public.topup_orders (user_id, created_at desc);
create index topup_orders_status_idx on public.topup_orders (status, created_at desc);

-- ── D6 balance_topups ──
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
comment on table public.balance_topups is 'Invoice pembelian voucher Balance (BLC).';

-- ── D7 balance_ledger ──
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

-- ── Supporting: payments (one Midtrans session per invoice) ──
create table public.payments (
  id                      uuid primary key default gen_random_uuid(),
  midtrans_order_id       text not null unique,
  purpose                 public.payment_purpose not null,
  ref_id                  uuid not null,
  amount                  integer not null check (amount > 0),
  payment_method          public.gateway_method not null,
  snap_token              text,
  redirect_url            text,
  status                  public.payment_status not null default 'PENDING',
  midtrans_transaction_id text,
  created_at              timestamptz not null default now(),
  paid_at                 timestamptz
);
comment on table public.payments is 'Sesi pembayaran Midtrans per invoice (midtrans_order_id = nomor invoice).';
comment on column public.payments.ref_id is 'topup_orders.id (TOPUP) atau balance_topups.id (BALANCE_FILL).';
create index payments_ref_idx on public.payments (purpose, ref_id);
create index payments_pending_idx on public.payments (created_at) where status = 'PENDING';

-- ── Supporting: audit_logs ──
create table public.audit_logs (
  id          bigint generated always as identity primary key,
  actor_id    uuid references public.profiles (id),
  action      text not null,
  target_type text not null,
  target_id   text not null,
  detail      jsonb,
  ip          text,
  created_at  timestamptz not null default now()
);
comment on table public.audit_logs is 'Jejak perubahan produk oleh Admin dan anomali pembayaran (append-only).';
create index audit_logs_created_idx on public.audit_logs (created_at desc);
