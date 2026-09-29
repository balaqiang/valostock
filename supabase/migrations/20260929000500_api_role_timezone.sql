-- valostock v8.3 — session time zone of the API role. Set on the role (applied by
-- Postgres at session start) instead of a startup option, because the Supabase
-- Cloud pooler does not forward startup options (docs/ARCHITECTURE.md §6.1).
-- Daily reports (date_trunc('day', …)) are computed in UTC.
alter role valostock_api set timezone to 'UTC';
