# Modelo de datos

Postgres en Supabase. **Toda** tabla con datos de cliente lleva `tenant_id` y RLS. El aislamiento entre clientes es la propiedad de seguridad más importante del sistema: una fuga entre tenants es un incidente grave.

## Tablas núcleo

### `tenants`
La tabla raíz. Una fila por cliente de la agencia.

| Columna | Tipo | Notas |
|---------|------|-------|
| `id` | uuid PK | |
| `slug` | text unique | usado para resolver la web (`/[tenant]`) |
| `domain` | text unique nullable | dominio propio si lo tiene |
| `name` | text | nombre del negocio |
| `plan` | text | `tier_1` \| `tier_2` \| `tier_3` |
| `config` | jsonb | branding, textos, bloques de landing, horarios, datos de contacto |
| `ai_config` | jsonb | system prompt, FAQs, reglas de derivación, modelo |
| `status` | text | `active` \| `paused` \| `setup` |
| `created_at` | timestamptz | |

`config` y `ai_config` son JSONB para que dar de alta o reconfigurar un cliente no requiera migraciones. Solo se normaliza a tabla propia lo que se consulta/filtra con frecuencia (leads, citas, mensajes).

### `leads`
Personas que contactan a través de cualquier canal.

| Columna | Tipo | Notas |
|---------|------|-------|
| `id` | uuid PK | |
| `tenant_id` | uuid FK → tenants | |
| `name` | text nullable | |
| `email` | text nullable | |
| `phone` | text nullable | |
| `source` | text | `web` \| `whatsapp` \| `chat` \| `form` |
| `status` | text | `new` \| `qualified` \| `booked` \| `won` \| `lost` |
| `created_at` | timestamptz | |

### `bookings` (tier_2+)
| Columna | Tipo | Notas |
|---------|------|-------|
| `id` | uuid PK | |
| `tenant_id` | uuid FK | |
| `lead_id` | uuid FK → leads nullable | |
| `service` | text | |
| `starts_at` | timestamptz | |
| `status` | text | `pending` \| `confirmed` \| `cancelled` \| `no_show` |
| `cal_event_id` | text nullable | id en Cal.com si se usa su motor |

### `messages`
Historial de conversaciones del agente IA y WhatsApp.

| Columna | Tipo | Notas |
|---------|------|-------|
| `id` | uuid PK | |
| `tenant_id` | uuid FK | |
| `lead_id` | uuid FK nullable | |
| `role` | text | `user` \| `assistant` \| `human` |
| `channel` | text | `web` \| `whatsapp` |
| `content` | text | |
| `created_at` | timestamptz | |

## Patrón RLS multi-tenant

Cada tabla de datos de cliente activa RLS y filtra por el tenant del contexto. Para tráfico público de la web (lectura de la config para renderizar) se usa el cliente de servicio con el `tenant_id` ya resuelto en el servidor; nunca se confía en un `tenant_id` que venga del cliente sin validar contra el slug/dominio de la request.

```sql
alter table leads enable row level security;

-- Acceso del portal del cliente final (tier_3): solo su propio tenant
create policy "tenant_isolation_select" on leads
  for select using (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
  );
```

Para escrituras desde rutas públicas (un lead nuevo desde el chat), la API route resuelve el tenant en el servidor con `resolveTenant()` y usa el service role acotado a ese `tenant_id`. La regla: **el `tenant_id` siempre se deriva del servidor, jamás del body de la petición.**

## Migraciones

Versionadas en `supabase/migrations/`. Una migración nunca asume datos de un cliente concreto. Si una feature es solo de un tier, la tabla existe igual para todos; el gating es lógico (ver `tiers.md`), no estructural.
