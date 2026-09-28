-- valostock v8 · 2/9 — profiles (1:1 with Supabase auth.users), admin RBAC, audit log.

create table public.profiles (
  id             uuid primary key references auth.users (id) on delete cascade,
  email          text not null,
  name           text not null check (char_length(name) between 2 and 100),
  phone          text unique,
  role           public.user_role not null default 'USER',
  balance        integer not null default 0 check (balance >= 0),
  loyalty_points integer not null default 0 check (loyalty_points >= 0),
  referral_code  text not null unique,
  referred_by    uuid references public.profiles (id),
  is_banned      boolean not null default false,
  ban_reason     text,
  created_at     timestamptz not null default now()
);
comment on table public.profiles is 'Data aplikasi per akun Supabase Auth. balance = ringkasan balance_ledger, loyalty_points = ringkasan loyalty_ledger.';
create index profiles_email_idx on public.profiles (lower(email));

-- New Supabase Auth user → profile row. Reads name/phone/ref from signUp metadata.
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

-- Keep profiles.email in sync when the email changes in Supabase Auth.
create or replace function public.handle_user_email_change() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  update public.profiles set email = coalesce(new.email, '') where id = new.id;
  return new;
end;
$$;

create trigger on_auth_user_email_changed
  after update of email on auth.users
  for each row when (old.email is distinct from new.email)
  execute function public.handle_user_email_change();

-- ── Admin RBAC (docs/ADMIN_PANEL.md §2) ──

create table public.admin_roles (
  id          uuid primary key default gen_random_uuid(),
  key         text not null unique,
  name        text not null,
  description text,
  created_at  timestamptz not null default now()
);

create table public.permissions (
  key         text primary key,
  module      text not null,
  description text not null
);

create table public.role_permissions (
  role_id        uuid not null references public.admin_roles (id) on delete cascade,
  permission_key text not null references public.permissions (key) on delete cascade,
  primary key (role_id, permission_key)
);

create table public.admin_user_roles (
  user_id     uuid not null references public.profiles (id) on delete cascade,
  role_id     uuid not null references public.admin_roles (id) on delete cascade,
  assigned_by uuid references public.profiles (id),
  created_at  timestamptz not null default now(),
  primary key (user_id, role_id)
);

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
comment on table public.audit_logs is 'Jejak setiap keputusan admin dan aksi sensitif (append-only).';
create index audit_logs_target_idx on public.audit_logs (target_type, target_id);
create index audit_logs_created_idx on public.audit_logs (created_at desc);
