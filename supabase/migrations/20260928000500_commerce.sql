-- valostock v8 · 5/9 — account transactions: offers, locks, orders, rekber, disputes,
-- ratings, store chat (docs/modeling/03-erd.md §3.C, DFD 6.0 & 7.0).

create table public.offers (
  id             uuid primary key default gen_random_uuid(),
  catalog_id     uuid not null references public.catalogs (id) on delete cascade,
  buyer_id       uuid not null references public.profiles (id),
  store_id       uuid not null references public.stores (id),
  amount         integer not null check (amount >= 10000),
  counter_amount integer check (counter_amount is null or counter_amount >= 10000),
  status         public.offer_status not null default 'PENDING',
  expires_at     timestamptz not null,
  responded_at   timestamptz,
  created_at     timestamptz not null default now()
);
comment on column public.offers.expires_at is 'PENDING/COUNTERED: kedaluwarsa 24 jam. ACCEPTED: harga berlaku 24 jam untuk dibayar.';
-- One open negotiation per buyer per catalog.
create unique index offers_open_uniq on public.offers (catalog_id, buyer_id)
  where status in ('PENDING', 'COUNTERED', 'ACCEPTED');
create index offers_store_idx on public.offers (store_id, status);

create table public.catalog_locks (
  id         uuid primary key default gen_random_uuid(),
  catalog_id uuid not null references public.catalogs (id) on delete cascade,
  buyer_id   uuid not null references public.profiles (id),
  fee        integer not null default 5000,
  status     public.lock_status not null default 'PENDING_PAYMENT',
  expires_at timestamptz,
  created_at timestamptz not null default now()
);
comment on table public.catalog_locks is 'Lock opsional Rp5.000: akun tidak bisa dibeli orang lain selama 30 menit setelah lunas.';
create unique index catalog_locks_active_uniq on public.catalog_locks (catalog_id) where status = 'ACTIVE';

create table public.orders (
  id               uuid primary key default gen_random_uuid(),
  order_number     text not null unique,
  buyer_id         uuid not null references public.profiles (id),
  store_id         uuid not null references public.stores (id),
  offer_id         uuid references public.offers (id),
  bundle_id        uuid references public.bundles (id),
  voucher_id       uuid references public.store_vouchers (id),
  lock_id          uuid references public.catalog_locks (id),
  items_subtotal   integer not null check (items_subtotal > 0),
  voucher_discount integer not null default 0 check (voucher_discount >= 0),
  item_price       integer not null check (item_price > 0),
  handling_fee     integer not null check (handling_fee >= 0),
  protection_fee   integer not null check (protection_fee >= 0),
  total_paid       integer not null,
  commission_rate  numeric(5, 4) not null,
  commission       integer not null check (commission >= 0),
  store_receives   integer not null,
  payment_method   public.gateway_method,
  status           public.order_status not null default 'PENDING_PAYMENT',
  room_code        text not null,
  protection_until timestamptz,
  created_at       timestamptz not null default now(),
  paid_at          timestamptz,
  delivered_at     timestamptz,
  safe_at          timestamptz,
  completed_at     timestamptz,
  cancelled_at     timestamptz,
  check (item_price = items_subtotal - voucher_discount),
  check (total_paid = item_price + handling_fee + protection_fee),
  check (store_receives = item_price - commission)
);
comment on column public.orders.item_price is 'Harga final (tawaran/flash sale/bundle − voucher): dasar escrow dan komisi.';
create index orders_buyer_idx on public.orders (buyer_id, created_at desc);
create index orders_store_idx on public.orders (store_id, status, created_at desc);
create index orders_status_idx on public.orders (status);

create table public.order_items (
  id         uuid primary key default gen_random_uuid(),
  order_id   uuid not null references public.orders (id) on delete cascade,
  catalog_id uuid not null references public.catalogs (id),
  vs_code    text not null,
  title      text not null,
  price      integer not null check (price > 0),
  unique (order_id, catalog_id)
);
create index order_items_catalog_idx on public.order_items (catalog_id);

create table public.voucher_redemptions (
  id         uuid primary key default gen_random_uuid(),
  voucher_id uuid not null references public.store_vouchers (id),
  user_id    uuid not null references public.profiles (id),
  order_id   uuid not null unique references public.orders (id) on delete cascade,
  discount   integer not null check (discount > 0),
  created_at timestamptz not null default now()
);

create table public.rekber_messages (
  id          bigint generated always as identity primary key,
  order_id    uuid not null references public.orders (id) on delete cascade,
  sender_id   uuid references public.profiles (id),
  sender_role public.sender_role not null,
  body        text not null check (char_length(body) between 1 and 2000),
  attachments jsonb not null default '[]'::jsonb,
  created_at  timestamptz not null default now()
);
create index rekber_messages_order_idx on public.rekber_messages (order_id, id);

create table public.disputes (
  id              uuid primary key default gen_random_uuid(),
  order_id        uuid not null unique references public.orders (id),
  opened_by       uuid not null references public.profiles (id),
  reason          public.dispute_reason not null,
  description     text not null,
  status          public.dispute_status not null default 'OPEN',
  store_deadline  timestamptz not null,
  opened_after_completion boolean not null default false,
  refund_amount   integer not null default 0 check (refund_amount >= 0),
  resolution_note text,
  resolved_by     uuid references public.profiles (id),
  resolved_at     timestamptz,
  created_at      timestamptz not null default now()
);
create index disputes_status_idx on public.disputes (status, created_at);

create table public.dispute_events (
  id          bigint generated always as identity primary key,
  dispute_id  uuid not null references public.disputes (id) on delete cascade,
  actor_id    uuid references public.profiles (id),
  actor_role  public.sender_role not null,
  type        public.dispute_event_type not null,
  body        text not null,
  attachments jsonb not null default '[]'::jsonb,
  created_at  timestamptz not null default now()
);
create index dispute_events_dispute_idx on public.dispute_events (dispute_id, id);

create table public.ratings (
  id             uuid primary key default gen_random_uuid(),
  order_id       uuid not null unique references public.orders (id),
  store_id       uuid not null references public.stores (id),
  buyer_id       uuid not null references public.profiles (id),
  overall        smallint not null check (overall in (-1, 0, 1)),
  desc_accuracy  smallint not null check (desc_accuracy between 1 and 5),
  attitude       smallint not null check (attitude between 1 and 5),
  delivery_speed smallint not null check (delivery_speed between 1 and 5),
  comment        text,
  store_reply    text,
  replied_at     timestamptz,
  created_at     timestamptz not null default now()
);
create index ratings_store_idx on public.ratings (store_id, created_at desc);

create table public.conversations (
  id              uuid primary key default gen_random_uuid(),
  buyer_id        uuid not null references public.profiles (id),
  store_id        uuid not null references public.stores (id),
  last_message_at timestamptz not null default now(),
  buyer_unread    integer not null default 0,
  store_unread    integer not null default 0,
  created_at      timestamptz not null default now(),
  unique (buyer_id, store_id)
);
create index conversations_store_idx on public.conversations (store_id, last_message_at desc);

create table public.chat_messages (
  id              bigint generated always as identity primary key,
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  sender_id       uuid not null references public.profiles (id),
  sender_role     public.sender_role not null,
  body            text not null check (char_length(body) between 1 and 2000),
  catalog_id      uuid references public.catalogs (id) on delete set null,
  created_at      timestamptz not null default now()
);
create index chat_messages_conversation_idx on public.chat_messages (conversation_id, id);
