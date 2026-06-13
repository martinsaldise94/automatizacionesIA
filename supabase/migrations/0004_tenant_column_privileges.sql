-- ─── Restringir columnas sensibles de `tenants` ──────────────────────────────
--
-- La policy `tenants_public_read` permite leer FILAS de tenants activos a
-- cualquier rol (anon/authenticated). Pero RLS es por filas, NO por columnas:
-- sin esto, la `anon key` (que viaja al navegador) puede leer `ai_config`
-- —system prompt del agente, reglas de handoff, datos internos del negocio—
-- de TODOS los tenants activos vía `GET /rest/v1/tenants?select=*`, y
-- enumerarlos. Fuga de datos entre tenants.
--
-- Fix: privilegios a nivel de COLUMNA. anon/authenticated solo pueden leer las
-- columnas públicas (las que se renderizan en la web). `ai_config` queda
-- accesible únicamente vía service role (servidor), que bypassa RLS y estos
-- GRANTs. El render público y `resolveTenant()` usan service role → no se ven
-- afectados. Las policies de `pages`/`posts` solo leen `id`/`status` de
-- `tenants` en su subquery → siguen funcionando.

revoke select on tenants from anon, authenticated;

grant select (id, slug, domain, name, plan, config, status, created_at)
  on tenants to anon, authenticated;

-- Nota: si en el futuro el portal del dueño necesita leer su PROPIO `ai_config`
-- desde el cliente, añadir una policy/RPC acotada a su `tenant_id`, nunca un
-- GRANT amplio sobre la columna.
