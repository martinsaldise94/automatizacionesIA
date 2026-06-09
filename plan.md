# Plan de desarrollo — Agency Platform

Plataforma **multi-tenant** (Next.js 16 App Router + Supabase) para vender webs inteligentes con IA, reservas y CRM a negocios locales en tres niveles de suscripción (`tier_1`, `tier_2`, `tier_3`).

Este plan traduce la arquitectura definida en `.claude/skills/SKILL.md` y `references/*` a una secuencia de construcción ejecutable. **La regla de oro:** un cliente = una fila en `tenants` + su config. Nunca se duplica código por cliente.

> Estado de partida: scaffold limpio de `create-next-app` (Next.js 16.2.7, React 19, Tailwind 4, TypeScript). Solo existen `app/layout.tsx`, `app/page.tsx`, `app/globals.css`. No hay `lib/`, `components/`, `supabase/` ni dependencias de Supabase/AI.

---

## Principios que gobiernan todo el plan

1. **Aislamiento por tenant** → toda tabla de cliente lleva `tenant_id` + RLS. El `tenant_id` se deriva **siempre** en el servidor desde slug/dominio, jamás del body.
2. **Configuración por datos, no por código** → branding, textos, bloques, prompt del agente viven en `tenants.config` / `tenants.ai_config` (JSONB).
3. **Bloques de landing data-driven** → `components/blocks/*` reciben props desde la config.
4. **Automatizaciones en n8n** → Next.js solo dispara webhooks y recibe callbacks.
5. **Gating por features nombradas** → nunca `if (plan === 'tier_3')`; siempre `hasFeature(tenant, 'crm')`.
6. **El agente siempre sabe derivar** → handoff a humano/WhatsApp en el prompt.

> ⚠️ Esta versión de Next.js (16.2.7) tiene breaking changes. **Antes de escribir código de framework, leer las guías en `node_modules/next/dist/docs/`** (ver `AGENTS.md`). No asumir APIs de memoria (middleware, routing, server actions, `params` async, etc.).

---

## Fase 0 — Cimientos del proyecto y tooling

**Objetivo:** dejar el repo listo para construir, con dependencias, variables de entorno y estructura de carpetas.

### Pasos
1. **Instalar dependencias de producto:**
   - `@supabase/supabase-js`, `@supabase/ssr` (clientes server/browser + cookies).
   - `ai`, `@ai-sdk/anthropic` (Vercel AI SDK + Claude API).
   - `zod` (validación de inputs en API routes y config).
   - `resend` (emails transaccionales).
   - Utilidades UI mínimas: `clsx`, `tailwind-merge` (sin librería de UI pesada).
2. **Variables de entorno** (`.env.local` + documentar en `.env.example`):
   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.
   - `ANTHROPIC_API_KEY`.
   - `N8N_WEBHOOK_BASE_URL`, `N8N_WEBHOOK_SECRET`.
   - `RESEND_API_KEY`.
   - `NEXT_PUBLIC_APP_URL` (dominio base de la plataforma, para resolver subdominios).
3. **Estructura de carpetas** (crear vacías con `.gitkeep` o primer archivo):
   - `lib/supabase/`, `lib/ai/`, `lib/tenant.ts`, `lib/features.ts`.
   - `components/ui/`, `components/blocks/`.
   - `supabase/migrations/`.
4. **Config base:** confirmar `tsconfig.json` (paths `@/*`), Tailwind 4 (`globals.css` con tokens de tema por CSS variables — necesario para branding por tenant en Fase 5).

**Entregable:** `npm run dev` arranca; dependencias instaladas; `.env.example` documentado.

---

## Fase 1 — Modelo de datos y Supabase

**Objetivo:** esquema versionado, RLS multi-tenant y clientes de Supabase tipados. Es la base de seguridad del sistema; una fuga entre tenants es incidente grave.

Referencia: `references/data-model.md`.

### Pasos
1. **Migración inicial** (`supabase/migrations/0001_core_schema.sql`) con las tablas núcleo:
   - `tenants` (`id`, `slug` unique, `domain` unique nullable, `name`, `plan`, `config` jsonb, `ai_config` jsonb, `status`, `created_at`).
   - `leads` (`id`, `tenant_id` FK, `name?`, `email?`, `phone?`, `source`, `status`, `created_at`).
   - `bookings` (`id`, `tenant_id` FK, `lead_id?` FK, `service`, `starts_at`, `status`, `cal_event_id?`).
   - `messages` (`id`, `tenant_id` FK, `lead_id?` FK, `role`, `channel`, `content`, `created_at`).
   - Índices por `tenant_id` en todas; índice por `slug` y `domain` en `tenants`.
2. **Migración de RLS** (`0002_rls_policies.sql`):
   - `enable row level security` en `leads`, `bookings`, `messages` (y `tenants` según acceso).
   - Policy de aislamiento por `tenant_id = (auth.jwt() ->> 'tenant_id')::uuid` para el portal (tier_3).
   - Reglas para lectura pública de `config` (renderizado) y escrituras vía service role acotado.
   - **El esquema es igual para todos los tiers; el gating es lógico, no estructural** (la tabla `bookings` existe aunque tier_1 no la use).
3. **Tipos TypeScript** del esquema: generar/escribir `lib/supabase/types.ts` (`Database`, `Tenant`, `Lead`, `Booking`, `Message`).
4. **Clientes Supabase** en `lib/supabase/`:
   - `server.ts` — cliente de servidor con cookies (`@supabase/ssr`), para Server Components y rutas autenticadas.
   - `browser.ts` — cliente de navegador para el portal.
   - `service.ts` — cliente con service role **acotado siempre a un `tenant_id` resuelto en servidor**, para escrituras públicas (lead desde chat/form).
5. **Seed de desarrollo** (`supabase/seed.sql`): 1–2 tenants de ejemplo (uno por tier) con `config`/`ai_config` realistas para poder desarrollar contra datos.

**Entregable:** migraciones aplicables; clientes tipados; seed cargable. Verificación: query filtrada por tenant devuelve solo sus filas.

---

## Fase 2 — Resolución de tenant y gating por features

**Objetivo:** el punto único de verdad para "¿de qué cliente es esta request?" y "¿qué puede hacer este cliente?".

Referencias: `SKILL.md` (convención 1 y 5), `references/tiers.md`.

### Pasos
1. **`lib/tenant.ts`** → `resolveTenant(slugOrDomain)`:
   - Resuelve por `domain` primero, luego por `slug`.
   - Devuelve el `Tenant` tipado o `null` (→ 404).
   - Cachea por request (no resolver dos veces en el mismo render).
   - **Nunca** acepta `tenant_id` del cliente.
2. **Middleware** (`middleware.ts` en la raíz) — *leer la guía de middleware de Next 16 primero*:
   - Detecta subdominio o dominio propio de la request.
   - Reescribe a `/[tenant]/...` con el slug resuelto, o pasa el host para resolución downstream.
   - Excluye `/admin`, assets y `_next`.
3. **`lib/features.ts`** → `TIER_FEATURES`, type `Feature`, `hasFeature(tenant, feature)` (copiar patrón exacto de `references/tiers.md`).
4. **Helper de protección de ruta** → utilidad para layouts de segmento que redirige si una feature no está activa (usado por el portal tier_3 y `/reservar` en tier_2).

**Entregable:** dado un slug/dominio, el sistema resuelve el tenant correcto y sabe responder `hasFeature()`. Tests unitarios de `resolveTenant` y `hasFeature`.

---

## Fase 3 — Panel de administración (interno)

**Objetivo:** TU panel para gestionar todos los tenants. Es la vía oficial de alta y configuración (no SQL directo salvo seeds). Construirlo pronto desbloquea poder crear/editar tenants para probar todo lo demás.

Referencia: `references/onboarding.md`.

### Pasos
1. **Auth de admin:** protección de `/admin/*` (Supabase Auth con rol admin, o allowlist). Separado del portal de clientes.
2. **`app/admin/tenants/page.tsx`** — lista de tenants: nombre, slug, plan, status; acciones crear/editar.
3. **`app/admin/tenants/new`** — alta: slug, name, plan inicial (`tier_1`), `status='setup'`.
4. **`app/admin/tenants/[id]/page.tsx`** — configurar un cliente:
   - Editor de `config`: branding (logo→Storage, colores, tipografía), `blocks` (array ordenado), `contact`, `seo`.
   - Editor de `ai_config`: businessName, tone, FAQs (q/a), services, `handoffRules`, `model`.
   - Cambio de `plan` y `status`.
   - Validación con `zod` del shape de `config`/`ai_config` antes de guardar.
5. **Server Actions / API** para persistir cambios (escritura como admin, no como tenant).

**Entregable:** alta y configuración completa de un tenant desde UI, sin tocar código. Smoke test: crear tenant `setup` → editar config → guardar.

---

## Fase 4 — Sistema de bloques de landing (data-driven)

**Objetivo:** componentes reutilizables que arman cualquier landing desde `config.blocks`. Un cliente nuevo elige y configura bloques, no maqueta.

Referencias: `SKILL.md` (convención 3), `references/onboarding.md` (paso 2).

### Pasos
1. **Contrato de bloque:** definir el tipo `Block` (discriminated union por `type` + props) y el shape de `config.blocks` (array ordenado). Validar con `zod`.
2. **Primitivos UI** en `components/ui/` (Button, Container, Section, Heading, etc.) con tokens de tema por CSS variables (branding por tenant).
3. **Bloques** en `components/blocks/` — cada uno recibe props tipadas desde config:
   - `Hero`, `Services`, `Pricing`, `FAQ`, `Testimonials`, `CTA`, `Contact`.
4. **`BlockRenderer`** → recibe `config.blocks`, mapea cada `type` a su componente, renderiza en orden. Bloque desconocido → no rompe (fallback/skip).
5. **Aplicar branding:** inyectar colores/tipografía del tenant como CSS variables en el layout del segmento `[tenant]`.

**Entregable:** dado un `config.blocks`, se renderiza una landing completa. Reordenar el array reordena la web. Verificación visual con el tenant seed.

---

## Fase 5 — Web pública del tenant (tier_1)

**Objetivo:** la landing premium renderizada desde DB, con SEO local. Es el núcleo de tier_1.

Referencias: `references/tiers.md` (tier_1), `SKILL.md` (estructura).

### Pasos
1. **`app/[tenant]/layout.tsx`** — *leer guía de layouts/`params` async de Next 16*:
   - Resuelve el tenant (vía middleware/host), inyecta branding (CSS vars), maneja 404 si no existe o `status != active` (salvo preview admin).
2. **`app/[tenant]/page.tsx`** — landing: lee `config` y renderiza con `BlockRenderer`.
3. **SEO local dinámico:**
   - `generateMetadata` por tenant (título, descripción, keywords locales desde `config.seo`).
   - Schema.org `LocalBusiness` (JSON-LD) desde `config.contact`.
   - `sitemap.ts` y `robots.ts` por tenant.
4. **Páginas secundarias** (4–5 páginas premium): servicios, sobre, contacto — todas data-driven desde config (no hardcode por cliente).
5. **Derivación a WhatsApp/formulario** visible en la web (botón/CTA con el número de `config.contact`).

**Entregable:** un tenant tier_1 tiene web pública navegable, SEO correcto y CTA de contacto. Lighthouse SEO razonable.

---

## Fase 6 — Agente IA (tier_1+)

**Objetivo:** agente embebido propio (Vercel AI SDK + Claude API), prompt construido por tenant en runtime, que responde FAQs y **sabe derivar**.

Referencia: `references/ai-agent.md`.

> Antes de implementar: usar la skill `claude-api` para confirmar model ids, parámetros de streaming y patrón de tool use vigentes. Modelo por defecto **clase Haiku** (`claude-haiku-4-5-20251001`) por coste; el modelo se lee de `ai_config.model` por tenant.

### Pasos
1. **`lib/ai/buildPrompt.ts`** → `buildSystemPrompt(tenant)`:
   - Ensambla desde `tenant.ai_config` (businessName, tone, services, faqs, handoffRules). Copiar patrón de `ai-agent.md`. **Nunca hardcodear el prompt.**
2. **`app/[tenant]/api/chat/route.ts`** — endpoint del agente:
   - Resuelve `tenant_id` en servidor desde slug/dominio (jamás del cliente).
   - Construye prompt, llama a Claude vía AI SDK con `streamText`, usa `ai_config.model`.
   - **Rate limiting por tenant** (evitar abuso de la API).
3. **Persistencia:** cada turno se guarda en `messages` (`tenant_id`, `lead_id`, `channel='web'`, `role`). Alimenta el CRM (tier_3) y la continuidad web↔WhatsApp.
4. **Handoff (derivación):** cuando el agente decide derivar (según `handoffRules`):
   - Crea/actualiza el `lead` (recoge nombre y teléfono).
   - Registra el `message`.
   - Dispara webhook de n8n para avisar al negocio (email/WhatsApp).
   - El traspaso queda trazado; `role` pasa a `human` cuando entra una persona.
5. **Widget de chat** en `components/` — UI embebida en la landing (cliente), consume el endpoint con streaming.
6. **Seguridad:** el prompt jamás expone `ai_config` de otro tenant ni claves; resolución de tenant server-side.

**Entregable:** chat en la web responde FAQs del tenant seed y, ante una regla de handoff, crea lead + dispara webhook. Coste por conversación en céntimos.

---

## Fase 7 — Reservas (tier_2)

**Objetivo:** sistema de citas activable por feature `bookings`, sobre la tabla `bookings` y/o Cal.com.

Referencias: `references/tiers.md` (tier_2), `data-model.md` (`bookings`).

### Pasos
1. **Gating:** `app/[tenant]/reservar/` protegido por `hasFeature(tenant, 'bookings')` en el layout del segmento (redirige si no).
2. **Flujo de reserva:** selección de servicio (desde config), calendario/disponibilidad, confirmación.
   - Opción A: **Cal.com** embebido o vía API; reflejar la cita en `bookings` con `cal_event_id`.
   - Opción B: motor propio sobre `bookings` (servicios, duraciones, disponibilidad en config).
3. **Creación de booking:** API route resuelve tenant en servidor, crea `booking` (`status='pending'/'confirmed'`) y `lead` si no existe.
4. **Formularios cualificados:** crean `leads` con `status='qualified'`.
5. **Recordatorios (`reminders`):** Next.js dispara webhook a n8n al crear/confirmar; **la lógica "recordar X antes de la cita" vive en n8n**, no en el código.
6. **Webhook de callbacks** (`app/[tenant]/api/webhook/`): recibe confirmaciones/cancelaciones de n8n/Cal.com y actualiza `bookings.status`. Validar `N8N_WEBHOOK_SECRET`.

**Entregable:** un tenant tier_2 permite reservar online; la cita queda en `bookings`; n8n recibe el evento de recordatorio. tier_1 no ve `/reservar`.

---

## Fase 8 — Portal del cliente y CRM (tier_3)

**Objetivo:** área privada para el dueño del negocio con CRM, dashboard, seguimientos y WhatsApp. Todo gateado por features.

Referencias: `references/tiers.md` (tier_3), `data-model.md`, `ai-agent.md` (persistencia).

### Pasos
1. **Auth del portal** (`app/[tenant]/(portal)/auth/`): login Supabase Auth para el dueño del negocio. El JWT lleva `tenant_id` → habilita las policies RLS de aislamiento.
2. **Protección del segmento `(portal)`:** layout valida `hasFeature(tenant, 'client_portal')` + sesión; redirige si falta.
3. **CRM (`crm`)** — `(portal)/dashboard/leads`:
   - Vista de `leads` con estados (`new`→`qualified`→`booked`→`won`/`lost`), notas, timeline de `messages`.
   - Cambio de estado de lead (actualiza DB; puede disparar followup en n8n).
4. **Dashboard (`dashboard`)** — panel visual: nº de leads, citas, conversiones, gráficas básicas.
5. **Seguimientos (`followups`):** cambios de estado de lead disparan webhook a n8n; los flujos de seguimiento viven en n8n.
6. **WhatsApp (`whatsapp`)** — integración 360dialog:
   - Webhook entrante (`api/webhook/`) normaliza mensajes a `messages` (`channel='whatsapp'`).
   - Conversaciones unificadas web↔WhatsApp por `lead_id`.
   - Envío saliente vía 360dialog (disparado por n8n o por el portal).

**Entregable:** dueño tier_3 entra a su portal, ve sus leads/citas/conversaciones unificadas y su estado dispara automatizaciones. RLS verificado: un tenant nunca ve datos de otro.

---

## Fase 9 — Onboarding end-to-end y plantillas n8n

**Objetivo:** validar que dar de alta un cliente es **insertar datos + apuntar dominio**, en horas no días.

Referencia: `references/onboarding.md`.

### Pasos
1. **Flujo de alta completo** desde admin siguiendo el checklist de `onboarding.md`:
   tenant creado → branding+bloques → SEO → agente (FAQs/handoff) → reservas (tier_2+) → portal+WhatsApp (tier_3) → flujos n8n → dominio → `status=active` → smoke test.
2. **Plantillas n8n parametrizadas por `tenant_id`:** recordatorios, seguimientos, aviso de handoff. Documentar cómo clonar y fijar `tenant_id`.
3. **Dominio propio:** añadir `domain` al tenant + config en Vercel; el middleware resuelve por dominio o slug.
4. **Detección de deuda de plantilla:** si un alta tarda más de lo razonable, identificar el bloque/campo de config que falta y añadirlo a la plataforma (no parchear con código a medida).

**Entregable:** un tier_1 publicable en horas desde cero, solo con datos. Checklist de `onboarding.md` pasando.

---

## Fase 10 — Endurecimiento, despliegue y operación

**Objetivo:** dejar el sistema seguro, observable y desplegado.

### Pasos
1. **Seguridad transversal (auditoría):**
   - Verificar que **ningún** path acepta `tenant_id` del body sin validar contra slug/dominio.
   - RLS probado con tests de aislamiento entre tenants (intento de fuga debe fallar).
   - Validación de firma en todos los webhooks (`N8N_WEBHOOK_SECRET`, firma 360dialog).
   - Rate limiting en chat y endpoints públicos.
   - Service role nunca expuesto al cliente; claves solo server-side.
2. **Observabilidad:** logging de errores, coste de IA por tenant, métricas de webhooks.
3. **Deploy en Vercel:** routing por subdominio/dominio, variables de entorno, dominios de tenants. Migraciones aplicadas en Supabase prod.
4. **CI/lint:** `npm run lint` + build limpio; (opcional) tests en pipeline.
5. **Documentación operativa:** runbook de alta de cliente, de incidencia de fuga de tenant, y de cambio de flujos n8n.

**Entregable:** plataforma en producción, con un tenant real de prueba en cada tier funcionando end-to-end.

---

## Orden de ejecución y dependencias

```
Fase 0  (tooling)
  └─> Fase 1  (datos + Supabase)
        └─> Fase 2  (resolveTenant + features)
              ├─> Fase 3  (admin)            ── desbloquea crear/editar tenants
              ├─> Fase 4  (bloques)  ─┐
              │                        └─> Fase 5  (web pública tier_1)
              │                              └─> Fase 6  (agente IA)
              ├─> Fase 7  (reservas tier_2)   [depende de 2,3,5]
              └─> Fase 8  (portal+CRM tier_3) [depende de 2,3,6,7]
                    └─> Fase 9  (onboarding e2e + n8n)
                          └─> Fase 10 (hardening + deploy)
```

Las fases 4–6 pueden solaparse una vez exista el admin (Fase 3) para generar datos de prueba. Tier_2 (Fase 7) y Tier_3 (Fase 8) son incrementales: **no se rehace nada al subir de nivel, solo se desbloquean features**.

## Definición de "hecho" por tier

- **tier_1 listo** → Fases 0–6: web pública + SEO + agente que responde y deriva.
- **tier_2 listo** → + Fase 7: reservas + recordatorios + formularios cualificados.
- **tier_3 listo** → + Fase 8: portal + CRM + dashboard + followups + WhatsApp.
- **Plataforma operable** → + Fases 9–10: alta por datos en horas, segura y desplegada.

---

## Riesgos y notas

- **Next.js 16.2.7 ≠ el Next que conoces.** Leer `node_modules/next/dist/docs/` antes de middleware, layouts, `params` async, server actions y routing por host. No asumir APIs de memoria.
- **Claude API:** consultar la skill `claude-api` para model ids, streaming y tool use vigentes antes de codear la Fase 6.
- **Fuga entre tenants = incidente grave.** El aislamiento (RLS + `tenant_id` server-side) es la propiedad de seguridad nº1; se prueba explícitamente, no se asume.
- **No improvisar arquitectura.** Antes de tocar un área, leer su `references/*.md`; este plan no sustituye esas guías, las secuencia.
