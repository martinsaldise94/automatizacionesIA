-- ─── Least privilege sobre `posts` ───────────────────────────────────────────
--
-- Cierra la nota que dejó `0006`: la policy `posts_public_read` es innecesaria.
--
-- El blog público se renderiza por SERVICE ROLE en servidor (lib/db/posts.ts,
-- único sitio que toca la tabla — verificado), y el service role bypassa RLS.
-- Por tanto `anon` no necesita ningún acceso directo a `posts`.
--
-- A diferencia de `pages`, aquí NO había fuga: los posts no tienen columna de
-- borrador y la policy ya filtraba por status='published'. Esto no arregla un
-- agujero, quita superficie: cuantos menos privilegios tenga la clave que viaja
-- al navegador, menos daño hace el día que algo falle por encima.
--
-- Lo que sí evita de verdad: `anon` arrastra grants por defecto
-- (INSERT/UPDATE/DELETE/TRUNCATE) que hoy la RLS bloquea, pero que serían
-- catastróficos si alguien desactivara la RLS de esta tabla. Mismo motivo por
-- el que `0006` revocó `pages`.

drop policy if exists "posts_public_read" on posts;

revoke all on posts from anon;

-- El dueño del negocio (rol `authenticated`) NO se toca: su policy por
-- app_metadata.tenant_id sigue siendo la que le deja editar sus propios posts
-- desde el portal.
