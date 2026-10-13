-- valostock v8 · 8/9 — engagement (wishlist, follows, recently viewed, notifications,
-- loyalty, referral) and content/operations (news, help, reports).

create table public.wishlists (
  user_id           uuid not null references public.profiles (id) on delete cascade,
  catalog_id        uuid not null references public.catalogs (id) on delete cascade,
  notify_price_drop boolean not null default true,
  price_at_save     integer not null,
  created_at        timestamptz not null default now(),
  primary key (user_id, catalog_id)
);

create table public.store_follows (
  user_id    uuid not null references public.profiles (id) on delete cascade,
  store_id   uuid not null references public.stores (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, store_id)
);

create table public.recently_viewed (
  user_id    uuid not null references public.profiles (id) on delete cascade,
  catalog_id uuid not null references public.catalogs (id) on delete cascade,
  viewed_at  timestamptz not null default now(),
  primary key (user_id, catalog_id)
);
create index recently_viewed_user_idx on public.recently_viewed (user_id, viewed_at desc);

create table public.notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles (id) on delete cascade,
  kind       public.notification_kind not null,
  title      text not null,
  body       text not null,
  link       text,
  is_read    boolean not null default false,
  created_at timestamptz not null default now()
);
create index notifications_user_idx on public.notifications (user_id, is_read, created_at desc);

create table public.loyalty_ledger (
  id            bigint generated always as identity primary key,
  user_id       uuid not null references public.profiles (id),
  type          public.loyalty_type not null,
  points        integer not null,
  balance_after integer not null check (balance_after >= 0),
  reference     text not null,
  created_at    timestamptz not null default now()
);
create index loyalty_ledger_user_idx on public.loyalty_ledger (user_id, id desc);

create table public.referral_rewards (
  id          uuid primary key default gen_random_uuid(),
  referrer_id uuid not null references public.profiles (id),
  referred_id uuid not null unique references public.profiles (id),
  reward      integer not null default 10000,
  status      public.referral_status not null default 'PENDING',
  reference   text,
  rewarded_at timestamptz,
  created_at  timestamptz not null default now()
);

create table public.news_articles (
  id           uuid primary key default gen_random_uuid(),
  slug         text not null unique check (slug ~ '^[a-z0-9-]{2,120}$'),
  title        text not null,
  category     text not null,
  excerpt      text not null,
  cover        text,
  body         jsonb not null default '[]'::jsonb,
  status       public.article_status not null default 'DRAFT',
  author_id    uuid references public.profiles (id),
  published_at timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create trigger news_articles_updated_at before update on public.news_articles for each row execute function public.set_updated_at();

create table public.help_articles (
  id            integer generated always as identity primary key,
  slug          text not null unique check (slug ~ '^[a-z0-9-]{2,120}$'),
  title         text not null,
  category      public.help_category not null,
  excerpt       text not null,
  body          jsonb not null default '[]'::jsonb,
  popular       boolean not null default false,
  is_published  boolean not null default true,
  helpful_count integer not null default 0,
  sort_order    integer not null default 0,
  updated_at    timestamptz not null default now()
);
create trigger help_articles_updated_at before update on public.help_articles for each row execute function public.set_updated_at();

create table public.reports (
  id              uuid primary key default gen_random_uuid(),
  reporter_id     uuid not null references public.profiles (id),
  target_type     public.report_target not null,
  target_id       uuid not null,
  reason          public.report_reason not null,
  detail          text,
  status          public.report_status not null default 'OPEN',
  resolution_note text,
  handled_by      uuid references public.profiles (id),
  handled_at      timestamptz,
  created_at      timestamptz not null default now()
);
create index reports_status_idx on public.reports (status, created_at);
