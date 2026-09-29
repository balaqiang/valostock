-- valostock v8.3 — Storage buckets as SQL, so a Supabase Cloud project gets them
-- from `supabase db push` (locally supabase/config.toml creates the same buckets).
-- Keep these limits in sync with [storage.buckets.*] in config.toml and
-- back/src/supabase/storage.ts. Uploads always go through the API (service role);
-- there are no storage policies, so anon/authenticated cannot write or list.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('catalog-images', 'catalog-images', true, 2097152, array['image/png', 'image/jpeg', 'image/webp']),
  ('private-media', 'private-media', false, 10485760, array['image/png', 'image/jpeg', 'image/webp', 'video/mp4', 'application/pdf'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;
