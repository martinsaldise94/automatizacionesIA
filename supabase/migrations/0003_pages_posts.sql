-- ─── CORRECCIÓN DE POLICIES (0002 usaba claim raíz; tenant_id vive en app_metadata) ──

drop policy "leads_portal_select"    on leads;
drop policy "leads_portal_update"    on leads;
drop policy "bookings_portal_select" on bookings;
drop policy "bookings_portal_update" on bookings;
drop policy "messages_portal_select" on messages;

create policy "leads_portal_select" on leads
  for select using (
    tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid
  );

create policy "leads_portal_update" on leads
  for update using (
    tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid
  );

create policy "bookings_portal_select" on bookings
  for select using (
    tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid
  );

create policy "bookings_portal_update" on bookings
  for update using (
    tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid
  );

create policy "messages_portal_select" on messages
  for select using (
    tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid
  );

-- ─── PAGES ───────────────────────────────────────────────────────────────────

create table pages (
  id             uuid        primary key default gen_random_uuid(),
  tenant_id      uuid        not null references tenants(id) on delete cascade,
  path           text        not null,                        -- '/' para home, '/servicios' etc.
  title          text        not null,
  draft_data     jsonb       not null default '{}',           -- JSON de Puck (nunca público)
  published_data jsonb,                                       -- null = sin publicar todavía
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (tenant_id, path)
);

create index on pages (tenant_id);
create index on pages (tenant_id, path);

alter table pages enable row level security;

-- Público: páginas con published_data de tenants activos
create policy "pages_public_read" on pages
  for select using (
    published_data is not null
    and exists (
      select 1 from tenants
      where tenants.id = pages.tenant_id
        and tenants.status = 'active'
    )
  );

-- Dueño del negocio: acceso completo a páginas de su tenant
create policy "pages_owner_all" on pages
  for all
  using (
    tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid
    and (auth.jwt() -> 'app_metadata' ->> 'role') = 'owner'
  )
  with check (
    tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid
    and (auth.jwt() -> 'app_metadata' ->> 'role') = 'owner'
  );

-- ─── POSTS ───────────────────────────────────────────────────────────────────

create table posts (
  id           uuid        primary key default gen_random_uuid(),
  tenant_id    uuid        not null references tenants(id) on delete cascade,
  slug         text        not null,
  title        text        not null,
  excerpt      text,
  cover_url    text,
  content      text        not null default '',               -- markdown
  status       text        not null default 'draft' check (status in ('draft','published')),
  published_at timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (tenant_id, slug)
);

create index on posts (tenant_id);
create index on posts (tenant_id, status);

alter table posts enable row level security;

-- Público: posts publicados de tenants activos
create policy "posts_public_read" on posts
  for select using (
    status = 'published'
    and exists (
      select 1 from tenants
      where tenants.id = posts.tenant_id
        and tenants.status = 'active'
    )
  );

-- Dueño del negocio: acceso completo a posts de su tenant
create policy "posts_owner_all" on posts
  for all
  using (
    tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid
    and (auth.jwt() -> 'app_metadata' ->> 'role') = 'owner'
  )
  with check (
    tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid
    and (auth.jwt() -> 'app_metadata' ->> 'role') = 'owner'
  );
