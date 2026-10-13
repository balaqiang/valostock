-- valostock v8 · 9/9 — security.
-- 1. RLS on every table with NO policies: Supabase's Data API roles (anon/authenticated) can read nothing.
-- 2. The Express API connects as its own role `valostock_api` (BYPASSRLS, least privilege).
-- 3. Ledgers and the audit log are append-only for the API role.

do $$
declare t record;
begin
  for t in select tablename from pg_tables where schemaname = 'public' loop
    execute format('alter table public.%I enable row level security', t.tablename);
    execute format('revoke all on table public.%I from anon, authenticated', t.tablename);
  end loop;
end $$;

revoke all on all sequences in schema public from anon, authenticated;
revoke execute on function public.handle_new_user() from anon, authenticated, public;
revoke execute on function public.handle_user_email_change() from anon, authenticated, public;

-- The API role. Its password is set by supabase/seed.sql for local development only.
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'valostock_api') then
    create role valostock_api login bypassrls noinherit;
  end if;
end $$;

grant usage on schema public to valostock_api;
grant select, insert, update, delete on all tables in schema public to valostock_api;
grant usage, select on all sequences in schema public to valostock_api;
alter default privileges in schema public grant select, insert, update, delete on tables to valostock_api;
alter default privileges in schema public grant usage, select on sequences to valostock_api;

-- Append-only: history can be added, never rewritten.
revoke update, delete on public.store_ledger, public.balance_ledger, public.loyalty_ledger,
  public.audit_logs, public.catalog_reviews, public.dispute_events, public.webhook_events
  from valostock_api;
grant update (processed) on public.webhook_events to valostock_api;
