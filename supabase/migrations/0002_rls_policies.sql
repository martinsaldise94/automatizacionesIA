-- ─── TENANTS ────────────────────────────────────────────────────────────────
alter table tenants enable row level security;

-- Lectura pública: solo tenants activos (para renderizar la web)
create policy "tenants_public_read" on tenants
  for select using (status = 'active');

-- ─── LEADS ──────────────────────────────────────────────────────────────────
alter table leads enable row level security;

-- Portal (tier_3): el dueño del negocio ve solo sus leads
create policy "leads_portal_select" on leads
  for select using (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
  );

-- Servidor (service role): puede insertar/actualizar leads de cualquier tenant
-- El service role bypassa RLS por defecto en Supabase; esta policy es para
-- el rol autenticado normal usado desde el portal.
create policy "leads_portal_update" on leads
  for update using (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
  );

-- ─── BOOKINGS ────────────────────────────────────────────────────────────────
alter table bookings enable row level security;

-- Portal: el dueño ve solo sus reservas
create policy "bookings_portal_select" on bookings
  for select using (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
  );

create policy "bookings_portal_update" on bookings
  for update using (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
  );

-- ─── MESSAGES ────────────────────────────────────────────────────────────────
alter table messages enable row level security;

-- Portal: el dueño ve solo sus mensajes
create policy "messages_portal_select" on messages
  for select using (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
  );
