-- ─── Vínculo directo tenant → usuario dueño ──────────────────────────────────
--
-- Antes, encontrar al dueño de un tenant requería `auth.admin.listUsers()` y
-- escanear TODOS los usuarios filtrando por `app_metadata.tenant_id`. Eso no
-- escala (se rompe en silencio pasados los 1000 usuarios por la paginación) y
-- es lento siempre. Guardamos la referencia directa.
--
-- `on delete set null`: si se borra el usuario en Auth, el tenant queda sin
-- dueño (no se borra el tenant). El `app_metadata` del usuario sigue siendo la
-- fuente de verdad para RLS; esta columna es el índice inverso para el admin.

alter table tenants
  add column owner_user_id uuid references auth.users(id) on delete set null;

-- Backfill: enlaza dueños ya existentes (invitados con el flujo anterior, que
-- solo guardaba el vínculo en app_metadata del usuario).
update tenants t
set owner_user_id = u.id
from auth.users u
where (u.raw_app_meta_data ->> 'tenant_id')::uuid = t.id
  and (u.raw_app_meta_data ->> 'role') = 'owner'
  and t.owner_user_id is null;
