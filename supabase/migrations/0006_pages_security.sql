-- ─── Cerrar la fuga de draft_data en `pages` ─────────────────────────────────
--
-- La policy `pages_public_read` (0003) permitía a CUALQUIER rol (anon Y
-- authenticated) leer la fila publicada entera. Pero RLS es por filas, NO por
-- columnas (mismo problema que cerró 0004 con ai_config):
--   1) anon podía pedir `draft_data` de páginas publicadas vía la Data API.
--   2) peor: un dueño autenticado podía leer el `draft_data` de OTRO tenant —
--      la policy no tenía cláusula TO y solo exigía `published_data is not null`.
--      Fuga de borradores entre tenants.
--
-- El render público va por SERVICE ROLE en servidor (lib/db/pages.ts), que
-- bypassa RLS y selecciona solo `published_data`. Por tanto anon NO necesita
-- ningún acceso directo a `pages`. Eliminamos la lectura pública directa y
-- revocamos select de anon. Resultado: `draft_data` solo es accesible por el
-- dueño de su propio tenant (policy pages_owner_all) y por el service role.

drop policy if exists "pages_public_read" on pages;

revoke select on pages from anon;

-- Nota (Fase 5 / blog): `posts_public_read` tiene la misma forma, pero los posts
-- no tienen columna de borrador (el acceso se filtra por status='published'), así
-- que no hay fuga equivalente. El render del blog también irá por service role;
-- revisar entonces si conviene retirar también esa policy.
