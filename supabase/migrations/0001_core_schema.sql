-- ─── TENANTS ────────────────────────────────────────────────────────────────
create table tenants (
  id          uuid primary key default gen_random_uuid(),
  slug        text unique not null,
  domain      text unique,
  name        text not null,
  plan        text not null default 'tier_1' check (plan in ('tier_1','tier_2','tier_3')),
  config      jsonb not null default '{}',
  ai_config   jsonb not null default '{}',
  status      text not null default 'setup' check (status in ('setup','active','paused')),
  created_at  timestamptz not null default now()
);

create index on tenants (slug);
create index on tenants (domain);

-- ─── LEADS ──────────────────────────────────────────────────────────────────
create table leads (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references tenants(id) on delete cascade,
  name        text,
  email       text,
  phone       text,
  source      text not null default 'web' check (source in ('web','whatsapp','chat','form')),
  status      text not null default 'new' check (status in ('new','qualified','booked','won','lost')),
  created_at  timestamptz not null default now()
);

create index on leads (tenant_id);

-- ─── BOOKINGS ────────────────────────────────────────────────────────────────
create table bookings (
  id           uuid primary key default gen_random_uuid(),
  tenant_id    uuid not null references tenants(id) on delete cascade,
  lead_id      uuid references leads(id) on delete set null,
  service      text not null,
  starts_at    timestamptz not null,
  status       text not null default 'pending' check (status in ('pending','confirmed','cancelled','no_show')),
  cal_event_id text,
  created_at   timestamptz not null default now()
);

create index on bookings (tenant_id);

-- ─── MESSAGES ────────────────────────────────────────────────────────────────
create table messages (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references tenants(id) on delete cascade,
  lead_id     uuid references leads(id) on delete set null,
  role        text not null check (role in ('user','assistant','human')),
  channel     text not null default 'web' check (channel in ('web','whatsapp')),
  content     text not null,
  created_at  timestamptz not null default now()
);

create index on messages (tenant_id);
create index on messages (lead_id);
