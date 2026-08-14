-- ─── Supabase Storage: assets del builder (imágenes, vídeos subidos) ─────────
--
-- Un solo bucket `tenant-assets`, con las carpetas por tenant: `{tenant_id}/...`.
-- Patrón idéntico al de `pages`: las ESCRITURAS van server-side con service role
-- (uploadImageAction, tras authorizeBuilder → tenant resuelto en servidor), que
-- bypassa RLS. Por eso NO se dan grants de escritura a anon/authenticated: nadie
-- sube directo desde el cliente. La LECTURA es pública (las URLs viven en las
-- props de los bloques publicados).
--
-- ⚠️ Ejecutar en Supabase (dev y prod). Requiere que la extensión de Storage esté
-- activa (lo está por defecto en Supabase).

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'tenant-assets',
  'tenant-assets',
  true,                                   -- lectura pública vía CDN
  5242880,                                -- 5 MB (imágenes); el vídeo grande va por URL
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;

-- Lectura pública de los objetos del bucket (el bucket es público, pero dejamos
-- la policy explícita para claridad y por si se endurece el default).
drop policy if exists "tenant_assets_public_read" on storage.objects;
create policy "tenant_assets_public_read" on storage.objects
  for select
  using (bucket_id = 'tenant-assets');

-- No se crean policies de INSERT/UPDATE/DELETE: las subidas van por service role
-- (bypassa RLS) con el tenant resuelto en servidor. anon/authenticated no escriben
-- directo → sin policy de escritura, la Data API se lo niega por defecto.
