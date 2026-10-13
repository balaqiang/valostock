-- valostock v8.4 — site CMS: editable texts, home banners, banner images
-- (docs/ADMIN_PANEL.md §3.10; docs/modeling/02-dfd.md §2.7; 03-erd.md §3.G).

-- Texts the API registers as editable (back/src/modules/cms/cms.registry.ts). A row exists only
-- for texts an admin changed; the API falls back to the built-in default otherwise.
create table public.site_settings (
  key         text primary key check (key ~ '^[a-z0-9_.]{3,60}$'),
  value       text not null check (char_length(value) <= 2000),
  updated_by  uuid references public.profiles (id),
  updated_at  timestamptz not null default now()
);
comment on table public.site_settings is 'Teks situs yang diubah lewat CMS; kunci yang tidak ada memakai nilai bawaan API.';

-- Platform banners (internal promotion, not paid ads).
create type public.banner_placement as enum ('HOME_HERO');

create table public.banners (
  id          uuid primary key default gen_random_uuid(),
  placement   public.banner_placement not null default 'HOME_HERO',
  title       text not null check (char_length(title) between 2 and 120),
  subtitle    text check (char_length(subtitle) <= 240),
  -- '/images/…' = static file of the web app; 'cms/…' = object in the site-media bucket.
  image       text not null check (image ~ '^(/images/|cms/)[A-Za-z0-9/_.()-]+$'),
  cta_label   text check (char_length(cta_label) <= 40),
  link_url    text check (link_url is null or link_url ~ '^(/|https://)'),
  sort_order  integer not null default 0,
  is_active   boolean not null default true,
  starts_at   timestamptz,
  ends_at     timestamptz,
  created_by  uuid references public.profiles (id),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint banners_window_check check (starts_at is null or ends_at is null or ends_at > starts_at),
  constraint banners_cta_check check ((cta_label is null) = (link_url is null))
);
comment on table public.banners is 'Banner beranda milik platform (promosi internal, bukan iklan berbayar) dengan jadwal tampil.';
create index banners_placement_idx on public.banners (placement, is_active, sort_order);

-- Game banner: games.image may now also point to the site-media bucket.
alter table public.games
  add constraint games_image_check check (image is null or image ~ '^(/images/|cms/)[A-Za-z0-9/_.()-]+$');
comment on column public.games.image is 'Banner game (kartu + header halaman game): /images/… statis atau cms/… di bucket site-media.';

-- Public bucket for CMS images (same limits as [storage.buckets.site-media] in config.toml).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('site-media', 'site-media', true, 2097152, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Same security model as every other table (see 20260928000900_security.sql).
alter table public.site_settings enable row level security;
alter table public.banners enable row level security;
revoke all on table public.site_settings, public.banners from anon, authenticated;
grant select, insert, update, delete on table public.site_settings, public.banners to valostock_api;
