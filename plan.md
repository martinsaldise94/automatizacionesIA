# Plan de desarrollo — Agency Platform

Plataforma **multi-tenant** (Next.js 16 App Router + Supabase) para vender webs inteligentes con IA, reservas y CRM a negocios locales en tres niveles de suscripción (`tier_1`, `tier_2`, `tier_3`).

Este plan traduce la arquitectura definida en `.claude/skills/agency-platform/SKILL.md` y `references/*` a una secuencia de construcción ejecutable. **La regla de oro:** un cliente = una fila en `tenants` + su config. Nunca se duplica código por cliente.

> Estado de partida: scaffold limpio de `create-next-app` (Next.js 16.2.7, React 19, Tailwind 4, TypeScript). Solo existen `app/layout.tsx`, `app/page.tsx`, `app/globals.css`. No hay `lib/`, `components/`, `supabase/` ni dependencias de Supabase/AI.

---

## Principios que gobiernan todo el plan

1. **Aislamiento por tenant** → toda tabla de cliente lleva `tenant_id` + RLS. El `tenant_id` se deriva **siempre** en el servidor desde slug/dominio, jamás del body.
2. **Configuración por datos, no por código** → branding, textos, bloques, prompt del agente viven en `tenants.config` / `tenants.ai_config` (JSONB).
3. **Bloques data-driven + builder visual** → `components/blocks/*` reciben props desde datos. El cliente edita sus páginas en autoservicio con un builder visual (Puck); la web pública solo renderiza lo publicado.
4. **Automatizaciones en n8n** → Next.js solo dispara webhooks y recibe callbacks.
5. **Gating por features nombradas** → nunca `if (plan === 'tier_3')`; siempre `hasFeature(tenant, 'crm')`.
6. **El agente siempre sabe derivar** → handoff a humano/WhatsApp en el prompt.
7. **Self-service primero** → el cliente monta y edita su web con plantillas + builder, sin la agencia. El diseño a medida (bloques custom hechos por la agencia) es la excepción; esos bloques quedan en la plataforma para todos.

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

### Estado
- [x] `.env.example` creado y commitable. Documenta además, comentadas, las keys de fases futuras: `OLLAMA_BASE_URL` (IA alternativa), `GOOGLE_PLACES_API_KEY` (Testimonials, Fase 4), `CALCOM_API_KEY` (reservas, Fase 7), `WHATSAPP_360DIALOG_*` (WhatsApp, Fase 8), `SUPABASE_PROJECT_ID` (para `npm run db:types`)
- [x] `.env.local` — Supabase, `N8N_WEBHOOK_SECRET`, `RESEND_API_KEY`
- [ ] `.env.local` pendiente — `ANTHROPIC_API_KEY` (necesaria al llegar a Fase 6), `N8N_WEBHOOK_BASE_URL`
- [x] Estructura de carpetas creada
- [x] `tsconfig.json` — path alias `@/*` configurado
- [x] `npm install` — `@supabase/supabase-js`, `@supabase/ssr`, `ai`, `@ai-sdk/anthropic`, `zod`, `resend`, `clsx`, `tailwind-merge`

---

## Fase 1 — Modelo de datos y Supabase

**Objetivo:** esquema versionado, RLS multi-tenant y clientes de Supabase tipados. Es la base de seguridad del sistema; una fuga entre tenants es incidente grave.

Referencia: `references/data-model.md`.

### Estado
- [x] Paso 1 — `0001_core_schema.sql` ejecutado en Supabase dev. 4 tablas creadas: `tenants`, `leads`, `bookings`, `messages`.
- [x] Paso 2 — `0002_rls_policies.sql` ejecutado en Supabase dev. RLS activo en `leads`, `bookings`, `messages`.
- [x] Paso 3 — `lib/supabase/types.ts` creado: `Database`, `Tenant`, `Lead`, `Booking`, `Message`, `TenantConfig`, `TenantAiConfig`
- [x] Paso 4 — `lib/supabase/browser.ts`, `server.ts`, `service.ts` creados
- [x] Paso 5 — `supabase/seed.sql` ejecutado en Supabase dev: `demo-restaurante` (tier_1), `demo-clinica` (tier_2), `demo-consultoria` (tier_3)
- [x] Paso 6 — `0003_pages_posts.sql`: tablas `pages` (multi-página, borrador/publicado) y `posts` (blog) con RLS e índices; corrección de las policies existentes para leer `tenant_id` desde `app_metadata` del JWT. Tipos `Page` y `Post` en `lib/supabase/types.ts` ⚠️ Ejecutar en Supabase
- [x] Hardening (revisión de código) #8 — Tipos del schema corregidos: las `Row` eran `interface` y no satisfacían `Record<string,unknown>`, por lo que supabase-js resolvía el schema a `never` y obligaba a castear cada escritura con `as never` (matando el type-check en inserts/updates, lo más peligroso). Convertidas a `type`; `Insert` ahora refleja `default`/`null` del SQL (helper `Insertable`); eliminados todos los `as never`; borrado `BlockConfig` muerto. Script `npm run db:types` añadido para regenerar desde la DB (a archivo separado) cuando el CLI esté enlazado.
- [x] Hardening (revisión de código) #1 — `0004_tenant_column_privileges.sql`: fuga de `ai_config` cerrada. RLS es por filas, no por columnas → con la anon key se podía leer `ai_config` (system prompt, handoff, datos internos) de todos los tenants vía `/rest/v1/tenants?select=*`. Privilegios a nivel de columna: anon/authenticated solo leen columnas públicas; `ai_config` queda solo para service role. Todas las lecturas de `tenants` en el código ya usan service client → no rompe nada. ✅ Ejecutado y verificado en Supabase (anon: `permission denied` en `ai_config`, OK en columnas públicas).
- [x] Hardening (revisión de código) #4 + #3 — `0005_tenant_owner_user_id.sql`: columna `owner_user_id` en `tenants`. Antes el panel hacía `listUsers({perPage:1000})` y escaneaba TODOS los usuarios para hallar al dueño (se rompía pasados 1000, lento siempre). Ahora lookup O(1) con `getUserById(owner_user_id)`. `inviteOwner` enlaza el id e impide invitar a un segundo dueño; `changeOwnerEmail` lee el dueño de la DB (ya no de un campo oculto del form → no manipulable, cierra #3). Backfill incluido para dueños previos. Tests nuevos en `tests/tenantOwner.test.ts` (11). ✅ Ejecutado en Supabase (devuelve los tenants con su `owner_user_id`).
- [x] Hardening (revisión de código) #7 — Capa de acceso a datos `lib/db/tenants.ts`: todas las queries `.from('tenants')` (antes esparcidas en `lib/tenant.ts`, las 2 páginas admin y las 2 actions) centralizadas en funciones tipo repositorio (`getTenantById`, `listTenants`, `findActiveTenantsByDomainOrSlug`, `createTenant`, `updateTenantBasic/Config/AiConfig`, `getTenantOwnerId`, `setTenantOwner`). Un futuro cambio de DB toca solo `lib/db/`. Auth (`auth.admin.*`) queda fuera a propósito (acoplamiento aparte). Resultado de escritura neutro (`{ error: {message} | null }`, sin tipos de Supabase). Comportamiento idéntico, 76 tests verdes.

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
6. **Migración `0003_pages_posts.sql`** (añadido por el cambio a builder self-service):
   - `pages`: `id`, `tenant_id` FK, `path` (unique por tenant), `title`, `draft_data` jsonb (JSON de Puck en edición), `published_data` jsonb nullable (lo que ve el público), timestamps. La web pública **solo** lee `published_data`.
   - `posts`: `id`, `tenant_id` FK, `slug` (unique por tenant), `title`, `excerpt`, `cover_url`, `content` (markdown), `status` (`draft`/`published`), `published_at`, timestamps.
   - RLS en ambas: el dueño solo ve/edita filas de su `tenant_id` (claim en `app_metadata` del JWT). Índices en las columnas usadas por las policies.
   - Corregir las policies de `0002` para leer `(auth.jwt() -> 'app_metadata' ->> 'tenant_id')` — `app_metadata` no es modificable por el usuario; `user_metadata` sí (y por eso nunca se usa para seguridad).

**Entregable:** migraciones aplicables; clientes tipados; seed cargable. Verificación: query filtrada por tenant devuelve solo sus filas.

---

## Fase 2 — Resolución de tenant y gating por features

**Objetivo:** el punto único de verdad para "¿de qué cliente es esta request?" y "¿qué puede hacer este cliente?".

Referencias: `SKILL.md` (convención 1 y 5), `references/tiers.md`.

### Estado
- [x] Paso 1 — `lib/tenant.ts` → `resolveTenant(slugOrDomain)`
- [x] Paso 2 — `middleware.ts` — detección de subdominio/dominio propio. También inyecta `x-pathname` en todas las requests (necesario para que el layout de admin sepa si está en `/admin/login` y no entre en bucle de redirect)
- [x] Paso 3 — `lib/features.ts` → `TIER_FEATURES`, `Feature`, `hasFeature()`
- [x] Paso 4 — Helper de protección de ruta (`lib/guard.ts`)
- [x] Tests unitarios (vitest, `tests/`): `features`, `tenant`, `guard`, `middleware`, `admin`, `slug`, `createTenant`, `tenantEdit`, `tenantOwner`, `aiProvider` — **81 tests** (tras el repaso de código). Correr con `npm test`
- [x] Hardening (revisión de código): middleware borra/sobrescribe `x-tenant` y `x-pathname` entrantes (anti-spoofing); `resolveTenant` en una sola query con saneo del identificador (anti-inyección PostgREST)

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

### Estado
- [x] Paso 1 — Auth de admin: protección de `/admin/*`
- [x] Hardening (revisión de código): `/admin` exige rol admin (`lib/admin.ts` → `isAdmin()`, comprueba `app_metadata.role === 'admin'`), no solo sesión. El login expulsa a usuarios sin rol. ⚠️ Requiere setear el rol en el usuario admin de Supabase: `update auth.users set raw_app_meta_data = coalesce(raw_app_meta_data,'{}'::jsonb) || '{"role":"admin"}'::jsonb where email = '<email-admin>';`
- [x] Hardening (revisión de código): `lib/slug.ts` → `validateSlug()` + lista de slugs reservados (`admin`, `www`, `api`...). Obligatorio en el Paso 3
- [x] Paso 2 — `app/admin/tenants/page.tsx` — lista de tenants con badges de plan y estado
- [x] Paso 3 — `app/admin/tenants/new` — alta de tenant (validar slug con `validateSlug()`)
- [x] Paso 4 — `app/admin/tenants/[id]/page.tsx` — editor de branding/contact/seo, ai_config, plan y status (las páginas se editan con el builder, Fase 4). Buscador + filtros de tier/estado en la lista.
- [x] Paso 5 — Server Actions / API para persistir cambios (`updateBasic`, `updateConfig`, `updateAiConfig` con validación zod)
- [x] Paso 6 — Gestión del usuario dueño: crear/invitar el login del cliente con `app_metadata: { tenant_id, role: 'owner' }`
### Pasos
1. **Auth de admin:** protección de `/admin/*` (Supabase Auth con rol admin, o allowlist). Separado del portal de clientes.
2. **`app/admin/tenants/page.tsx`** — lista de tenants: nombre, slug, plan, status; acciones crear/editar.
3. **`app/admin/tenants/new`** — alta: slug, name, plan inicial (`tier_1`), `status='setup'`.
4. **`app/admin/tenants/[id]/page.tsx`** — configurar un cliente:
   - Editor de `config`: branding (logo→Storage, colores, tipografía), `contact`, `seo`. (Las páginas/bloques ya no viven aquí: viven en la tabla `pages` y se editan con el builder.)
   - Editor de `ai_config`: businessName, tone, FAQs (q/a), services, `handoffRules`, `model`.
   - Cambio de `plan` y `status`.
   - Validación con `zod` del shape de `config`/`ai_config` antes de guardar.
   - Acceso directo al builder del tenant (el admin puede editar las páginas de cualquier cliente).
5. **Server Actions / API** para persistir cambios (escritura como admin, no como tenant).
6. **Usuario dueño:** desde el admin se crea/invita el usuario del cliente (Supabase Auth) con `app_metadata: { tenant_id, role: 'owner' }`. Ese login da acceso al builder y al portal. `app_metadata` solo se escribe con service role.

**Entregable:** alta y configuración completa de un tenant desde UI, sin tocar código. Smoke test: crear tenant `setup` → editar config → crear usuario dueño → guardar.

---

## Fase 4 — Sistema de bloques y builder visual (Puck)

**Objetivo:** el cliente monta y edita su web él mismo con un editor visual (drag & drop, edición inline, preview responsive). Los bloques son componentes React nuestros; **Puck** (`@measured/puck`, MIT, ya instalado) aporta el editor. La web pública renderiza sin Puck en el cliente: solo el JSON publicado.

Referencias: `SKILL.md` (convención 3), `references/builder.md` (sistema completo), docs de Puck (puckeditor.com/docs) — **leer antes de integrar, no asumir su API de memoria**.

### Estado
- [x] Paso 1 — Config de Puck tipada en `lib/builder/config.tsx`: registro de bloques con sus campos (17 bloques, renders placeholder hasta Paso 3)
- [x] Paso 2 — Primitivos UI en `components/ui/` con CSS variables de branding
- [x] Paso 3 — Bloques base en `components/blocks/` (catálogo de 17, todos con render real). Partido por dependencias:
  - [x] 3a — Slice de validación: `Hero` real (`components/blocks/Hero.tsx`) + harness de preview (`app/dev/preview/`) con `<Render>` de Puck sobre data hardcodeada. Validado en navegador: 3 variantes + 2 paletas brand-adaptive, responsive, consola limpia. **Confirmado que `<Render>` corre en Server Component** (desbloquea Paso 4). Config tipado como `Config<BuilderComponents>` (type-safety para los 17). `tsc`+`test` verde.
    - **Pulido pendiente (pase de `polish` tras 3b):** (1) la variante `centered` no tiene elemento firma → roza lo genérico; (2) el panel firma `bg-brand/10` es casi invisible sobre fondo `primary` (marca sobre marca) → usar un tratamiento distinto en fondo de marca; (3) reforzar jerarquía del subtítulo en `centered`.
  - [x] 3b — Presentacionales (11, sin deps nuevas): `Services`, `Pricing`, `FAQ`, `CTA`, `Gallery`, `TextImage`, `Stats`, `Team`, `Steps`, `LogoGrid`, `Spacer`. `FAQ` con `'use client'`; `Gallery` variante `carousel` usa grid simple (carrusel diferido a Paso 8). `tsc`+`test` verde (81 tests).
  - [x] 3c — `Video`, dos fuentes (`source: 'url' | 'upload'`): (a) URL YouTube/Vimeo con allowlist → iframe construido por nosotros (`youtube-nocookie`/`player.vimeo.com`), nunca embed arbitrario; (b) render `<video controls preload="metadata">` sobre URL de Storage existente. Lógica pura testeable en `lib/builder/video.ts` (`parseVideoUrl`, `validateVideoFile`, `looksLikeUploadedVideo`); host no permitido o URL inválida → placeholder. La UI de subida se ata en Paso 8 (la validación MIME ya está). `tests/video.test.ts` (13 casos: válidas/raras/maliciosas + MIME + tamaño). `tsc`+`eslint`+test verde (**94 tests**).
  - [x] 3d — `RichText`: `react-markdown@10` + `remark-gfm@4`, **sin `rehype-raw`** (HTML crudo inline escapado, de bloque descartado; ambos inertes). Estilado por mapeo a nuestro sistema (no `prose`): encabezados bajados un nivel, enlaces de marca, blockquote 1px neutral (no side-stripe). Corre como Server Component (sin `'use client'`). `tests/richtext.test.tsx` (6 casos: script/img onerror/javascript: + markdown válido + gfm). `tsc`+`eslint`+test verde (**99 tests**).
  - [x] 3e — `<TenantProvider>` (**React Context**, decisión cerrada — no `metadata` de Puck). `lib/builder/tenant-context.ts` (`TenantContext`, `EMPTY_TENANT_CONTEXT`, `buildTenantContext` con whitelist explícito — nunca filtra `ai_config`); `components/builder/TenantProvider.tsx` (`'use client'`, `useTenant()` con default vacío puro). Cableado en el harness `/dev/preview`; el cableado en `<Puck>`/`<Render>` reales llega en Pasos 6/4. `tests/tenantContext.test.tsx` (5: mapeo, no-fuga de ai_config, contacto ausente, hook con/sin provider). `tsc`+`eslint`+test verde (**104 tests**).
  - [x] 3f — `Contact` + `Map` (`'use client'`, leen `useTenant().contact` de 3e). `lib/builder/contact.ts` (`buildContactItems`: tel:/mailto:/wa.me) y `lib/builder/map.ts` (`buildMapEmbedUrl`, `output=embed` sin key — deuda técnica consciente). Contact 3 variantes + iconos SVG inline; Map iframe que construimos nosotros. Placeholder si faltan datos. Tests `contact.test.ts` + `map.test.ts`. `tsc`+`eslint`+test verde.
  - [x] 3g — `Testimonials`: `source:'manual'` completo (cita con comilla de marca, avatar/inicial, rating si existe). `source:'google'` → placeholder hasta `GOOGLE_PLACES_API_KEY` + fetch server-side + reviews en Context. `lib/builder/testimonials.ts` (`selectTestimonials`) + `tests/testimonials.test.ts`. **115 tests verde. Paso 3 (17 bloques) COMPLETO.**
- [x] Paso 4 — Render público (enfoque A). HECHO (pendiente aplicar seed+migración en Supabase y verificar en navegador). **Enfoque elegido: A** (ruta real mínima `app/[tenant]/[[...path]]` + seed de una página). Construye: `lib/builder/sanitize.ts` (`sanitizePublishedData`, descarta bloques no registrados; testeable), `lib/db/pages.ts` (`getPublishedPage`, service client, solo `published_data` nunca `draft_data`), `components/builder/PublicRender.tsx` (Server Component, `TenantProvider`+`<Render>`), ruta mínima (resuelve tenant, fetch, `notFound`), fila seed en `pages`. Layout completo/branding/SEO/nav → Fase 5. **Leer guías Next 16 (routing, params async, server components) antes de tocar la ruta.**
- [x] Paso 5 — Auth del dueño (HECHO, sin commit). Login `(portal)/auth` (email+contraseña, server actions signIn/signOut), guard `(portal)/layout.tsx` (espejo del admin: x-pathname salta /auth, getUser, `canAccessPortal`), placeholder `(portal)/builder`. `canAccessPortal(user,tenantId)` puro en `lib/guard.ts` + `tests/portalGuard.test.ts` (6). **Fix de diseño:** `resolveTenantForPortal` (lib/tenant.ts) NO exige status 'active' — el dueño edita en 'setup'; `findTenantsByDomainOrSlug` en lib/db. **125 tests verde.** **Método elegido: A — email + contraseña** (encaja con el invite de Fase 3). Construye: `(portal)/auth` (form + server actions signIn/signOut con `createClient()` SSR), `requireOwner(slugOrDomain)` en `lib/guard.ts` (getUser + `canAccessPortal` puro testeable: dueño-de-ese-tenant o admin), página protegida mínima `(portal)/builder` (placeholder → editor real en Paso 6). Seguridad: solo `app_metadata`, `getUser()` (no getSession), tenant resuelto server-side. Nota: escritura del editor por admin → service role en Paso 6 (RLS owner no le cubre). Sesión/refresh: **Supabase Auth nativo** (ver nota de seguridad abajo), NO tabla propia.
- [ ] Paso 5b (futuro, no bloquea) — Recuperación de contraseña + verificación de email del dueño. Vía Supabase Auth nativo: `resetPasswordForEmail()` (enlace de reset) + email confirmations. Requiere SMTP propio (Resend) configurado en Supabase para que los correos lleguen con tu dominio. Nota: el invite del admin (`inviteUserByEmail`) ya verifica el email al poner contraseña; esto añade el reset autoservicio.
- [ ] Paso 6 — Editor builder en `(portal)/builder` (Puck por página, guarda en `draft_data`). Dividido:
  - [x] 6a — Bucle mínimo. HECHO (tsc+lint+134 tests verde; falta smoke en navegador con login de dueño). Acceso a datos en `lib/db/pages.ts` (`listPagesForTenant`, `getPageForEditor`, `createPage`, `saveDraft` — service role, scoped a tenant con `.eq('tenant_id')`). Validación de path `lib/builder/pagePath.ts` (+`tests/pagePath.test.ts`, 9 casos; reserva `auth/builder/blog/api/reservar/dashboard/admin` como 1er segmento). Server actions `(portal)/builder/actions.ts` (`createPageAction`, `saveDraftAction`) con guard `authorizeBuilder` (x-tenant + getUser + `canAccessPortal`). UI: lista + alta en `builder/page.tsx`, editor `builder/[pageId]/page.tsx` (server, scoped → 404 cross-tenant) + `components/builder/BuilderEditor.tsx` (`'use client'`, `<Puck>` + `<TenantProvider>`, `overrides.headerActions` = botón "Guardar borrador", sin botón Publish). Escritura SIEMPRE service role + `canAccessPortal`. Publicar/zod → Paso 7; imágenes → Paso 8.
  - [x] 6b — HECHO (verificado E2E). `lib/db/pages.ts`: `updatePageMeta` + `deletePage` (scoped a tenant). Actions `updatePageMetaAction`/`deletePageAction` (devuelven resultado + `revalidatePath`). `builder/PageRow.tsx` (client): fila con "Editar" (link al editor), "Ajustes" desplegable → editar título/ruta (reusa `normalizePagePath`, maneja colisión de path unique) y "Borrar página" (con `confirm()`). Tras mutar, `router.refresh()` actualiza la lista en sitio (misma ruta → sin la nav blanda cross-subtree rota). Autoguardado: diferido (opcional).
- [x] Paso 7 — HECHO (verificado E2E: publicar→badge "Publicada"→público renderiza). `lib/builder/publish.ts` → `validatePuckData(raw, allowedTypes)` (zod: estructura root/content/zones, solo bloques registrados, límite 512KB, serializable) +`tests/publish.test.ts` (8). `lib/db/pages.ts` → `publishPage` (escribe `published_data` + `draft_data`). `publishAction` (valida con bloques de `builderConfig`, luego publica). Botón "Publicar" en `BuilderEditor` junto a "Guardar borrador".
- [~] Paso 8 — BASE HECHA (falta bucket + wiring de campo). `supabase/migrations/0007_storage.sql`: bucket `tenant-assets` (público lectura, 5MB, jpg/png/webp) + policy de lectura; escrituras solo service role. `lib/builder/upload.ts`: `validateImageFile` (MIME real, no extensión; **SVG prohibido**), `extForImageMime`, `buildAssetPath` (`{tenant_id}/{uuid}.{ext}`) +`tests/upload.test.ts` (11). `uploadImageAction` en builder/actions.ts (service role, tenant server-side, devuelve URL pública). **⚠️ DIFERIDO (bloqueado por Storage, sin acceso ahora):** (1) crear el bucket / aplicar `0007` en Supabase; (2) campo custom de subida en Puck (`type:'custom'` + `ImageField` cliente → llamar `uploadImageAction`) reemplazando los `type:'text'` de imagen — introduce import circular actions↔config, resolver poniendo la action en archivo aparte; (3) smoke de subida real. Hoy las imágenes funcionan pegando URL (campos `text`).
- [x] Paso 9 — HECHO (tests verdes; E2E del admin diferido por login). `lib/templates/`: `types.ts` (helpers `block()` que fusiona defaultProps + `page()`), `sectors.ts` (4 plantillas: clinica/restaurante/consultoria/estetica, cada una home + contacto, con branding por defecto), `index.ts` (`TEMPLATES`, `getTemplate`, `listTemplates`). `lib/db/pages.ts` → `insertTemplatePages` (páginas ya publicadas). Admin `tenants/new`: `<select>` de plantilla; la action inserta páginas + fija branding. `tests/templates.test.ts` (6): valida que TODA plantilla usa solo bloques registrados con estructura válida (vía `validatePuckData`), paths canónicos/únicos, home presente. **⚠️ Diferido:** smoke E2E de crear tenant con plantilla en el admin (requiere login de admin).
- [x] Paso 10 — HECHO (verificado E2E: guardar color → CSS var aplicada al árbol). `lib/branding.ts` → `contrastColor` (luminancia WCAG) + `brandingCssVars` (mapea config.branding a `--brand-*`, calcula `*-fg` por contraste; omite lo no definido → hereda defaults de globals.css) +`tests/branding.test.ts` (6). `app/[tenant]/layout.tsx` (NUEVO): resuelve tenant (cualquier status, cacheado) e inyecta las vars como style inline → branding en público y portal. Portal: `(portal)/branding` (page + `BrandingForm` cliente: colores con picker+hex, fuente curada, logo URL) + `updateBrandingAction` (zod, merge sobre config, `revalidatePath('/','layout')`). Nav "Páginas | Marca" en el header del portal (`<Link>`, funcionan).
- [→v2] Paso 11 — **DIFERIDO a v2.0.0.** Todos sus ítems (a-e) coinciden con la "Hoja de ruta v2.0.0 — Builder avanzado" de abajo, y el plan afirma que el builder v1 (17 bloques + borrador/publicado + plantillas + branding) ya es completo y vendible. No se hace ahora para priorizar Fase 5 y no meter bloques sin pase de diseño. **Libertad del editor (libertad ACOTADA, no lienzo libre)**. Extensiones para dar más juego sin romper "self-service a prueba de fallos" ni el responsive. Por impacto:
  - (a) **Layout multicolumna**: bloque `Columns`/`Grid` con zonas anidadas (DropZones/slots de Puck — confirmar API actual en docs, no asumir). El mayor desbloqueo. Cuidar el colapso en móvil.
  - (b) **Controles finos por sección**: espaciado (padding), fondo en cualquier bloque, alineación, ancho de contenedor; ajustes de página (root de Puck: ancho máx global).
  - (c) **Branding extendido** (encaja con Paso 10): color de acento, imagen de fondo de sección con overlay, emparejado display+cuerpo, escala tipográfica.
  - (d) **Más bloques**: Banner/aviso, Tabs, Acordeón genérico, grupo de botones, Newsletter, lista con iconos, Divisor.
  - (e) **Features de Puck no usadas**: edición inline, preview multi-dispositivo, plantillas/secciones insertables.
  - **NO**: lienzo con posicionamiento absoluto/solapamientos (mata responsive) ni bloque de HTML/embed libre (prohibido por seguridad). La libertad TOTAL es vía agencia creando bloques a medida en código (modelo de dos velocidades).

### Pasos
1. **Config de Puck** (`lib/builder/config.tsx`): el contrato central. Cada bloque se registra con sus campos (texto, textarea, imagen, select de variante, color, array de items...). Esta config es la única fuente de qué bloques existen y qué props aceptan. Tipada con los tipos de Puck.
2. **Primitivos UI** en `components/ui/` (Button, Container, Section, Heading...) con tokens por CSS variables (branding por tenant). Todo responsive móvil-primero.
3. **Bloques base** en `components/blocks/` — componentes React puros que reciben props. Cada uno con variantes de layout y opciones de estilo. Funcionan idénticos en el editor y en la web pública. **Todos son opcionales**: el cliente arrastra solo los que quiere, en el orden que quiere. Nadie obliga a poner nada.

   Catálogo completo (17 bloques):

   | Bloque | Descripción | Campos clave |
   |--------|-------------|--------------|
   | `Hero` | Cabecera principal de sección | título, subtítulo, variante (centrado/img-izq/img-der), imagen, CTA |
   | `Services` | Rejilla de servicios | array de items (nombre, descripción, icono opcional), variante (cards/lista/grid) |
   | `Pricing` | Tabla de precios | array de planes (nombre, precio, features[], destacado, CTA) |
   | `FAQ` | Preguntas frecuentes acordeón | array de pares q/a |
   | `Testimonials` | Reseñas de clientes | **`source`: `manual` \| `google`**. Manual: array (texto, nombre, cargo, avatar). Google: lee de Google Places API usando `google_place_id` de `tenants.config.integrations` — requiere `GOOGLE_PLACES_API_KEY` en `.env` y el Place ID en el config del tenant |
   | `CTA` | Llamada a la acción | título, subtítulo, botón (WhatsApp/formulario/reserva), fondo (color/imagen) |
   | `Contact` | Datos de contacto | layout del bloque; los datos vienen de `config.contact` del tenant, no son editables aquí |
   | `Gallery` | Galería de imágenes | array de imágenes con pie de foto, variante (grid/masonry/carrusel) |
   | `TextImage` | Texto + imagen | contenido rich text, imagen, variante (img-izq/img-der), proporción |
   | `Stats` | Cifras destacadas | array de items (número, label, sufijo opcional como % o +) |
   | `Map` | Mapa de ubicación | embed de Google Maps; usa `config.contact.address` o coordenadas manuales |
   | `Team` | Equipo / personas | array de miembros (foto, nombre, cargo, bio corta) |
   | `Steps` | Proceso / cómo funciona | array de pasos (número, título, descripción), variante (horizontal/vertical) |
   | `Video` | Vídeo embebido | URL de YouTube o Vimeo; se extrae el embed seguro (sin JS arbitrario) |
   | `LogoGrid` | Logos de partners/marcas/certificados | array de logos (imagen, nombre alt, URL opcional) |
   | `RichText` | Texto libre | contenido markdown renderizado de forma segura (sin HTML arbitrario) |
   | `Spacer` | Separador / espacio | altura configurable; útil para ajustar el layout sin un bloque de contenido |

   > **Google Reviews (Testimonials):** necesita `GOOGLE_PLACES_API_KEY` en `.env.example`/`.env.local` y `google_place_id` en `tenants.config.integrations`. Añadir ambos campos cuando se llegue a este bloque. La llamada a Google Places API ocurre en el servidor (no expone la API key). En el editor se muestra un placeholder si no hay Place ID configurado.
4. **Render público:** la web del tenant renderiza `pages.published_data` con `<Render>` de Puck en Server Components. Sin editor, sin JS extra en el cliente. Bloque desconocido → skip, no rompe.
5. **Auth del dueño** (adelantado desde la antigua Fase 8): login Supabase Auth en `(portal)/auth`. El JWT lleva `tenant_id` y `role: 'owner'` en `app_metadata` → habilita RLS sobre `pages`/`posts` y más adelante el CRM. Guard del segmento: sesión + tenant de la URL coincide con el del JWT.
6. **Editor builder** (`(portal)/builder`): lista de páginas del tenant; al abrir una, editor `<Puck>` a pantalla completa. Autoguardado/guardar a `draft_data`. El borrador nunca afecta a la web en vivo.
7. **Publicar:** botón que valida el JSON server-side (zod: solo bloques registrados, props con shape correcto, límites de tamaño) y copia `draft_data` → `published_data`. Historial simple opcional (guardar la versión anterior).
8. **Imágenes:** campo de imagen sube a Supabase Storage en `tenants/{tenant_id}/...` con límite de tamaño y tipos permitidos. La URL pública va en las props del bloque.
9. **Plantillas:** una plantilla = filas de `pages` predefinidas (con `draft_data` y `published_data` iniciales) + branding por defecto. Al crear tenant se elige plantilla y arranca con web completa que luego personaliza en el builder.
10. **Branding:** colores/tipografía del tenant como CSS variables en el layout de `[tenant]`. El portal tiene un editor de branding simple (colores, logo, fuente de una lista curada).

**Entregable:** el dueño de un tenant entra con su login, edita su página de inicio en el builder (arrastra bloques, cambia textos y fotos), guarda borrador, publica, y su web pública refleja el cambio. La agencia no ha tocado nada.

---

## Fase 5 — Web pública multi-página y blog (tier_1)

**Objetivo:** la web completa del tenant renderizada desde la tabla `pages` (todas las rutas que el cliente haya creado), más un blog que el cliente actualiza solo. SEO local en todo.

Referencias: `references/tiers.md` (tier_1), `references/builder.md`, `SKILL.md` (estructura).

### Estado
- [x] Paso 1 — HECHO. `app/[tenant]/layout.tsx` (branding, hecho en Paso 10) + `app/[tenant]/(public)/layout.tsx` (NUEVO): chrome público (header con logo/nombre + nav de páginas publicadas + botón "Contactar" WhatsApp; footer con contacto). Grupo `(public)` separa la web pública del `(portal)`. 404 lo maneja la página (resolveTenant active → notFound), no el layout.
- [x] Paso 2 — HECHO (verificado en navegador). Catch-all movido a `app/[tenant]/(public)/[[...path]]/page.tsx` (routing intacto: rutas concretas ganan al catch-all). Nav generada de páginas publicadas: `lib/db/pages.ts` → `listPublishedPages`; `lib/nav.ts` → `orderNav` (home primero, resto por título, locale es) +`tests/nav.test.ts` (4). Verificado: demo-clinica renderiza home dentro del chrome con branding púrpura.
- [x] Paso 3 — SEO. HECHO y verificado en navegador. `generateMetadata` por página + JSON-LD `LocalBusiness` en el layout + `sitemap.xml`/`robots.txt` por tenant (route handlers bajo `(public)/`, con excepción en `proxy.ts` para que se reescriban pese a llevar extensión). `lib/seo.ts` y `lib/sitemap.ts` (lógica pura, testeada). Confirmado el riesgo que quedaba abierto: las route handlers concretas **ganan** al catch-all `[[...path]]`.
- [ ] Paso 4 — Blog público: `app/[tenant]/blog` (lista) y `blog/[slug]` (post, markdown renderizado)
- [ ] Paso 5 — Editor de blog en `(portal)/blog`: crear/editar/publicar posts (markdown con preview)
- [ ] Paso 6 — CTA de derivación a WhatsApp/formulario visible en web

### Pasos
1. **`app/[tenant]/layout.tsx`** — *leer guía de layouts/`params` async de Next 16*:
   - Resuelve el tenant (vía middleware/host), inyecta branding (CSS vars), maneja 404 si no existe o `status != active` (salvo preview con sesión de dueño/admin).
2. **Routing por páginas:** catch-all `app/[tenant]/[[...path]]/page.tsx` busca en `pages` la fila con ese `path` y renderiza su `published_data` con `<Render>`. Sin fila publicada → 404. Navegación (menú) generada desde las páginas publicadas.
3. **SEO local dinámico:**
   - `generateMetadata` por página (título/descripción por fila de `pages` + base del tenant en `config.seo`).
   - Schema.org `LocalBusiness` (JSON-LD) desde `config.contact`.
   - `sitemap.ts` por tenant con páginas publicadas + posts publicados; `robots.ts`.
4. **Blog público:** `blog/` lista posts publicados (título, excerpt, cover); `blog/[slug]` renderiza el markdown (renderizado seguro, sin HTML arbitrario). Metadata por post.
5. **Editor de blog** en `(portal)/blog`: CRUD de posts del tenant (RLS), editor markdown con preview, estados borrador/publicado. El cliente lo actualiza sin tocar nada más.
6. **Derivación a WhatsApp/formulario** visible en la web (botón/CTA con el número de `config.contact`).

**Entregable:** un tenant tier_1 tiene web multi-página navegable creada por él mismo, blog que actualiza solo, SEO correcto y CTA de contacto. Lighthouse SEO razonable.

---

## Fase 6 — Agente IA (tier_1+)

**Objetivo:** agente embebido propio (Vercel AI SDK + Claude API), prompt construido por tenant en runtime, que responde FAQs y **sabe derivar**.

Referencia: `references/ai-agent.md`.

> Antes de implementar: usar la skill `claude-api` para confirmar model ids, parámetros de streaming y patrón de tool use vigentes. Modelo por defecto **clase Haiku** (`claude-haiku-4-5-20251001`) por coste; el modelo se lee de `ai_config.model` por tenant.

### Estado
- [x] Hardening (revisión de código) #6 — `lib/ai/provider.ts` adelantado: ÚNICO punto de acoplamiento con el motor de IA. `resolveModel(modelId)` mapea `proveedor:modelo` (sin prefijo asume anthropic, retrocompat con `ai_config.model` actuales) a una instancia del AI SDK vía un registro de proveedores. Hoy solo `anthropic`; añadir Ollama el día que escale = 3 líneas en el registro + poner `ollama:modelo` en config, cero cambios en call sites. Proveedor/modelo desconocido cae al por defecto sin lanzar (no tumba el chat). Regla: nadie más importa `@ai-sdk/anthropic`. Tests en `tests/aiProvider.test.ts` (5). El agente (Pasos 1-6) usará `resolveModel(tenant.ai_config.model)`.
- [ ] Paso 1 — `lib/ai/buildPrompt.ts` → `buildSystemPrompt(tenant)`
- [ ] Paso 2 — `app/[tenant]/api/chat/route.ts` — endpoint streaming con rate limiting (modelo vía `resolveModel`)
- [ ] Paso 3 — Persistencia de mensajes en tabla `messages`
- [ ] Paso 4 — Handoff: crea lead + dispara webhook n8n al derivar
- [ ] Paso 5 — Widget de chat en `components/` con streaming
- [ ] Paso 6 — Seguridad: resolución tenant server-side, sin exponer ai_config

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

### Estado
- [ ] Paso 1 — Gating: `app/[tenant]/reservar/` protegido por `hasFeature(tenant, 'bookings')`
- [ ] Paso 2 — Flujo de reserva: selección servicio, calendario, confirmación
- [ ] Paso 3 — API route: crea `booking` y `lead`; resuelve tenant en servidor
- [ ] Paso 4 — Formularios cualificados → `leads` con `status='qualified'`
- [ ] Paso 5 — Recordatorios: webhook a n8n al crear/confirmar cita
- [ ] Paso 6 — Webhook de callbacks: recibe confirmaciones/cancelaciones de n8n/Cal.com

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

### Estado
- [ ] Paso 1 — Gating del CRM dentro del portal: las secciones CRM/dashboard solo con `hasFeature(tenant, 'crm')` (el auth del dueño ya existe desde la Fase 4)
- [ ] Paso 2 — CRM: vista de leads con estados, notas y timeline de mensajes
- [ ] Paso 3 — Dashboard: panel con nº leads, citas, conversiones y gráficas
- [ ] Paso 4 — Seguimientos: cambios de estado disparan webhook a n8n
- [ ] Paso 5 — WhatsApp 360dialog: webhook entrante, conversaciones unificadas, envío saliente

### Pasos
1. **Gating dentro del portal:** el login del dueño existe desde la Fase 4 (builder, todos los tiers). Lo que se gatea aquí son las **secciones**: CRM/dashboard/WhatsApp solo con sus features (`crm`, `dashboard`, `whatsapp`). El layout del portal muestra el menú según features.
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

## Fase 9 — Onboarding end-to-end, plantillas n8n y modelo de negocio

**Objetivo:** validar que dar de alta un cliente es **insertar datos + apuntar dominio**, en horas no días.

Referencia: `references/onboarding.md`.

### Estado
- [ ] Paso 1 — Flujo de alta completo desde admin (checklist onboarding.md)
- [ ] Paso 2 — Plantillas n8n parametrizadas por `tenant_id`
- [ ] Paso 3 — Dominio propio: `domain` en tenant + config Vercel + middleware
- [ ] Paso 4 — Detección y cierre de deuda de plantilla
- [ ] Paso 5 — Validación del modelo de negocio (setup fee + cuota mensual)

### Pasos
1. **Flujo de alta completo** desde admin siguiendo el checklist de `onboarding.md`:
   tenant creado → plantilla elegida (pages creadas) → usuario dueño invitado → el cliente personaliza en el builder → agente (FAQs/handoff) → reservas (tier_2+) → CRM+WhatsApp (tier_3) → flujos n8n → dominio → `status=active` → smoke test.
2. **Plantillas n8n parametrizadas por `tenant_id`:** recordatorios, seguimientos, aviso de handoff. Documentar cómo clonar y fijar `tenant_id`.
3. **Dominio propio:** añadir `domain` al tenant + config en Vercel; el middleware resuelve por dominio o slug.
4. **Detección de deuda de plantilla:** si un alta tarda más de lo razonable, identificar el bloque/campo de config que falta y añadirlo a la plataforma (no parchear con código a medida).

5. **Modelo de negocio de la agencia:**
   - **Con plantilla** (web estándar): setup en horas → cobrar setup fee puntual + cuota mensual del tier.
   - **A medida** (bloques custom): setup en 1-2 días → setup fee mayor + cuota mensual del tier.
   - Los bloques custom creados para un cliente quedan en la plataforma y aceleran futuros proyectos similares.
   - La facturación/cobro al cliente final es externa a la plataforma (Stripe, factura manual, etc.).

**Entregable:** un tier_1 publicable en horas desde cero, solo con datos. Checklist de `onboarding.md` pasando.

---

## Fase 10 — Endurecimiento, despliegue y operación

**Objetivo:** dejar el sistema seguro, observable y desplegado.

### Estado
- [ ] Paso 1 — Auditoría de seguridad transversal (tenant_id, RLS, webhooks, rate limiting)
- [ ] Paso 2 — Observabilidad: logging de errores, coste IA por tenant, métricas webhooks
- [ ] Paso 3 — Deploy en Vercel: subdominios, env vars, dominios de tenants, migraciones prod
- [ ] Paso 4 — CI/lint: `npm run lint` + build limpio
- [ ] Paso 5 — Documentación operativa: runbook alta, incidencia fuga tenant, cambios n8n

### Pasos
1. **Seguridad transversal (auditoría):**
   - Verificar que **ningún** path acepta `tenant_id` del body sin validar contra slug/dominio.
   - RLS probado con tests de aislamiento entre tenants (intento de fuga debe fallar).
   - Validación de firma en todos los webhooks (`N8N_WEBHOOK_SECRET`, firma 360dialog).
   - Rate limiting en chat y endpoints públicos.
   - Service role nunca expuesto al cliente; claves solo server-side.
   - JSON del builder validado al publicar (solo bloques registrados); markdown del blog renderizado seguro; límites de Supabase Storage por tenant.
2. **Observabilidad:** logging de errores, coste de IA por tenant, métricas de webhooks.
3. **Deploy en Vercel:** routing por subdominio/dominio, variables de entorno, dominios de tenants. Migraciones aplicadas en Supabase prod.
4. **CI/lint:** `npm run lint` + build limpio; (opcional) tests en pipeline.
5. **Documentación operativa:** runbook de alta de cliente, de incidencia de fuga de tenant, y de cambio de flujos n8n.

**Entregable:** plataforma en producción, con un tenant real de prueba en cada tier funcionando end-to-end.

---

## Orden de ejecución y dependencias

```
Fase 0  (tooling)
  └─> Fase 1  (datos + Supabase, incl. 0003 pages/posts)
        └─> Fase 2  (resolveTenant + features)
              ├─> Fase 3  (admin + usuario dueño)   ── desbloquea crear/editar tenants
              ├─> Fase 4  (bloques + builder Puck)  ─┐
              │                                       └─> Fase 5  (web multi-página + blog)
              │                                             └─> Fase 6  (agente IA)
              ├─> Fase 7  (reservas tier_2)   [depende de 2,3,5]
              └─> Fase 8  (CRM tier_3)        [depende de 2,3,4,6,7]
                    └─> Fase 9  (onboarding e2e + n8n)
                          └─> Fase 10 (hardening + deploy)
```

Las fases 4–6 pueden solaparse una vez exista el admin (Fase 3) para generar datos de prueba. Tier_2 (Fase 7) y Tier_3 (Fase 8) son incrementales: **no se rehace nada al subir de nivel, solo se desbloquean features**. El builder y el blog son de **todos** los tiers: el auth del dueño nace en la Fase 4, no en la 8.

## Definición de "hecho" por tier

- **tier_1 listo** → Fases 0–6: web multi-página editada por el cliente con el builder + blog + SEO + agente que responde y deriva.
- **tier_2 listo** → + Fase 7: reservas + recordatorios + formularios cualificados.
- **tier_3 listo** → + Fase 8: CRM + dashboard + followups + WhatsApp en el portal.
- **Plataforma operable** → + Fases 9–10: alta por datos en horas, segura y desplegada.

---

---

## Hoja de ruta v2.0.0 — Builder avanzado

> Esta versión (v1) del builder es completa y funcional: 17 bloques, drag & drop, borrador/publicado, plantillas por sector, branding por CSS variables. Es más que suficiente para vender el producto.
>
> **Para v2.0.0** está planificada una supermejora del builder orientada a personalización 100% libre:
> - Editor de estilos inline por bloque (padding, tipografía, colores individuales por sección sin tocar CSS)
> - Sistema de tokens de diseño por tenant (paleta completa, escala tipográfica, radios, sombras)
> - Bloques de layout libre: columnas configurables, grids, solapamiento de elementos
> - Edición inline de texto directamente sobre el canvas (sin panel lateral para textos)
> - Historial de versiones completo con posibilidad de restaurar cualquier publicación anterior
> - Vista previa por dispositivo (móvil/tablet/desktop) en tiempo real dentro del editor
> - Biblioteca de secciones guardadas: el cliente guarda sus propias combinaciones y las reutiliza
> - Modo "tema": cambiar toda la paleta de un golpe sin tocar bloque por bloque
>
> v2.0.0 arranca una vez la plataforma esté en producción con clientes reales y se haya validado qué personalizaciones piden más.

---

## Módulo futuro — Tienda online (e-commerce)

> Idea para más adelante. **No construir hasta validar tiers 1-3 con clientes reales.** Se documenta para no perder el planteamiento.

**Posicionamiento:** NO competir con Shopify/WooCommerce. La propuesta es **tienda ligera como add-on** a la web inteligente: vender pocos productos, productos digitales o catálogo simple, integrado con la web + IA + reservas que ya tiene el cliente. El diferencial es el "todo en uno", no la potencia e-commerce.

**Encaja en el modelo sin romperlo** (misma regla de oro: un cliente = una fila + config):
- Feature nueva gateada: `hasFeature(tenant, 'shop')`. Puede ser un **tier nuevo** (`tier_4` "Tienda") o un **add-on ortogonal** a los tiers. Decidir al validar.
- Tablas nuevas con `tenant_id` + RLS: `products` (con variantes/precio/stock), `orders`, `order_items`, `carts`. Mismo patrón multi-tenant de siempre.
- Bloques nuevos registrados una vez en Puck → disponibles para todos: `ProductGrid`, `ProductDetail`, `Cart`, `Checkout`. El cliente los arrastra como cualquier otro bloque.
- El agente IA puede responder dudas de productos (lee del catálogo); los `leads`/`orders` alimentan el CRM (tier_3).

**El esquema actual NO necesita anticipar nada:** se añaden estas tablas cuando toque. La arquitectura (config por datos + features nombradas + `lib/db/` + bloques data-driven) ya lo soporta.

**La parte dura es PAGOS, no los productos:**
- Multi-tenant ⇒ **cada negocio cobra en SU cuenta**, no en la de la agencia. Eso es **Stripe Connect**: onboarding de cada tenant a Stripe, payouts directos, y la agencia puede retener una comisión (`application_fee`). Es el grueso del trabajo.
- Trae además: checkout, webhooks de pago (confirmar pedido al cobrar — patrón n8n/webhook ya existente), emails de pedido (Resend, ya integrado), gestión de stock, impuestos/envíos, devoluciones/reembolsos.
- Keys nuevas en `.env` cuando se aborde: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_CONNECT_CLIENT_ID` (añadir a `.env.example` en ese momento).

**Esfuerzo realista:** alto (es un vertical entero, con pagos como núcleo). Por eso va post-lanzamiento, como módulo, no como reescritura. Empezar por el alcance mínimo "tienda ligera" y crecer según demanda real.

---

## Contexto actual

> Actualizar este bloque al cerrar cada paso o sub-paso. Es la primera lectura al retomar una sesión.

### Estado
- **[Fuera de fase] Capa Claude Code montada** (`chore/claude-conventions`, sin mergear a la espera de revisión). Toda la config de agente pasa a estar **en git** (antes `.gitignore` la excluía entera). Nuevo: `CLAUDE.md` con memoria real de proyecto, `.claude/settings.json` (permisos + registro de hooks), 4 hooks en `.claude/hooks/` (bloqueo de `.env*`, `eslint --fix` post-edición, recordatorio de `plan.md` al terminar turno, inyección de este bloque al arrancar sesión), 5 comandos en `.claude/commands/` (`/paso`, `/cerrar-paso`, `/verify`, `/bloque`, `/contexto`) y 2 subagentes en `.claude/agents/` (`tenant-isolation-auditor`, `block-reviewer`). `gh` 2.97.0 instalado — **pendiente `gh auth login`** para que `/cerrar-paso` pueda abrir y mergear PRs.
- **Paso activo:** **FASE 5 — Paso 3 (SEO) CERRADO.** Fase 4 cerrada v1 (6a/6b/7/9/10 hechos, 8 base, 11→v2.0.0). Fase 5 Pasos 1+2+3 hechos.
- **Paso 3 — archivos:** `lib/seo.ts` (+`tests/seo.test.ts`): `pageTitle`, `pageMetadata`, `localBusinessJsonLd`. `lib/sitemap.ts` (+`tests/sitemap.test.ts`): `absUrl`, `buildSitemapPaths`, `buildSitemapXml`, `buildRobotsTxt`, `originFromHeaders`. `lib/db/posts.ts` (NUEVO, capa de datos del blog: `listPublishedPosts`/`listPublishedPostSlugs`/`getPublishedPost` + editor `listPostsForTenant`/`getPostForEditor`/`createPost`/`updatePost`/`deletePost`) — **ya sirve para Pasos 4 y 5**. `(public)/[[...path]]/page.tsx` (+`generateMetadata`), `(public)/layout.tsx` (+`<script ld+json>`), `(public)/sitemap.xml/route.ts`, `(public)/robots.txt/route.ts`, `proxy.ts` (excepción para los dos archivos SEO).
- **Verificado en navegador** (demo-clinica en **:3001** — el 3000 lo ocupa una app Express externa): `<title>`, `description` y `og:*` del tenant; JSON-LD `LocalBusiness` con sus datos de contacto; `/robots.txt` y `/sitemap.xml` devuelven texto/XML con `x-middleware-rewrite: /demo-clinica/...`; otro tenant devuelve su propio sitemap; tenant inexistente → 404 en ambos.
- **Decisión del Paso 3:** el sitemap **no anuncia `/blog` hasta que hay un post publicado** (`buildSitemapPaths`). Antes listaba `/blog` siempre, y esa ruta aún no existe (llega en el Paso 4) → el sitemap servía 404s. Cuando el Paso 4 esté y haya posts, aparece solo.
- **Siguiente:** Paso 4 (blog público: `(public)/blog` lista + `blog/[slug]` con markdown seguro — reusar `react-markdown` como en RichText; `lib/db/posts.ts` ya listo). Paso 5 (editor blog en `(portal)/blog`). Paso 6 (CTA derivación WhatsApp/formulario — el header público ya tiene botón "Contactar" wa.me; falta el CTA/flujo de formulario).
- **Nav aclarada (corrige nota previa):** los `<Link>` (nav blanda) del App Router **SÍ funcionan** entre secciones del tenant, incluido cross-subtree (verificado /builder↔/branding). Lo único que fallaba era el `redirect()` de **server action** (x-action-redirect push cae en 404 por el rewrite por host) → resuelto con navegación DURA (window.location) en login/crear/logout. Regla: en portal/público, `<Link>` para navegar; para post-acción que deba cambiar de ruta, hard nav.
- **Bloqueos externos diferidos (autorización/acceso, retomar cuando estén):** (a) Storage: crear bucket `tenant-assets` + aplicar `0007` + wiring del campo de subida en Puck + smoke. (b) Auth: flujo de invitación/set-password del dueño (Paso 5b) — el enlace de invite va a la raíz sin handler. (c) Testimonials-google: `GOOGLE_PLACES_API_KEY`.
- **Tests:** **184 verde** en 26 archivos (`npm run verify` completo: tsc + eslint + vitest).
- **Rama:** `feat/6a-builder-editor`, 10 commits sin pushear/PR (por decisión del usuario, todo en esta rama). Dev server quedó en **:3001** (3000 ocupado por app Express externa). Contraseña dev del dueño casa-frodo: `msaldise@zaldicode.com` / `BuilderTest123!`.
- **Rama activa:** `feat/6a-builder-editor` (se sigue trabajando en ella hasta Fase 5; no se abren más ramas por decisión del usuario). `main`: Paso 4 (PR #10) y Paso 5 (PR #11) mergeados.
- **6a — archivos:** `lib/builder/pagePath.ts` (+test), `lib/db/pages.ts` (ampliado: list/get/create/saveDraft, todo `.eq('tenant_id')`), `app/[tenant]/(portal)/builder/actions.ts` (create/saveDraft devuelven resultado, ya no `redirect()`), `builder/page.tsx` (lista), `builder/NewPageForm.tsx` (client, alta), `builder/[pageId]/page.tsx`, `components/builder/BuilderEditor.tsx` (client, `<Puck>`). CSS Puck: `@measured/puck/puck.css`.
- **FIX importante de routing (Next 16):** (1) `middleware.ts`→`proxy.ts` — migración oficial (middleware deprecado en 16). (2) **El rewrite de tenant por host rompe la navegación BLANDA del App Router**: un `redirect()` de server action a `/builder` cae en 404 (el router cliente no conoce el rewrite; interpreta `/builder` como `[tenant]=builder`). **Confirmado que pasa TAMBIÉN en build de producción**, no es quirk de dev. **Solución:** login, crear-página y logout navegan en **DURO** (`window.location.assign`) — las actions devuelven `{ok,error}` y el cliente navega. Componentes cliente nuevos: `(portal)/auth/LoginForm.tsx`, `auth/SignOutButton.tsx`, `builder/NewPageForm.tsx`. La navegación dura pasa por el proxy y resuelve bien. **Aclaración (verificado después):** los `<Link>` normales SÍ funcionan (incluido cross-subtree); solo el `redirect()` de server action necesitaba hard nav. No hace falta el refactor de tenant-por-host.
- **Commits en esta rama (6a):** `feat(builder): editor Puck por página con guardado de borrador (6a)` + `fix(routing): proxy.ts (Next 16) y navegación dura para redirects de portal`.
- **MCP de Supabase conectado** (proyecto `nswomycfkmchbjbgbcmw`). Útil: `get_advisors`, `execute_sql`, etc. Settings de Auth NO son del MCP → Dashboard.
- **Usuarios:** `msaldise@zaldicode.com` = owner de **casa-frodo** (tier_2, status=setup, 0 páginas). `martinsaldise94@gmail.com` = admin. Página pública publicada solo en **demo-clinica**.
- **Hardening Auth (Dashboard, plan Free):** rotación de refresh tokens nativa (gratis) — núcleo cubierto. Time-box/inactivity son Pro (diferidos). JWT expiry default 1h ok. Leaked password protection: revisar en Attack Protection.
- **Paso 4 cerrado y verificado en DB:** render público enfoque A. `lib/builder/sanitize.ts` (+test), `lib/db/pages.ts` (service role, solo `published_data`), `components/builder/PublicRender.tsx` (`'use client'`, recibe solo `TenantContext` seguro — nunca el tenant con `ai_config`), `app/[tenant]/[[...path]]/page.tsx` (params async Next 16, resolveTenant, notFound). **Seguridad:** migración `0006_pages_security.sql` **aplicada** (anon NO puede leer `pages`; cierra fuga de `draft_data` cross-tenant). Seed `pages` (home demo-clinica, formato Puck) **cargado**.
- **Paso 5 cerrado:** auth del dueño en `(portal)/auth` (email+contraseña, server actions signIn/signOut), guard `(portal)/layout.tsx`, placeholder `(portal)/builder/page.tsx`. `canAccessPortal` + `requireOwner` en `lib/guard.ts`, `resolveTenantForPortal`/`findTenantsByDomainOrSlug` (no exige status active).
- **Mergeado en `main`:** 3a + 3b + pase de diseño; fixes a11y/CTA; refactor reutilización; 3c Video; 3d RichText; **3e TenantProvider**. Ramas viejas borradas.
- **3f hecho:** `Contact` + `Map` (`'use client'`, leen `useTenant().contact`). `lib/builder/contact.ts` + `lib/builder/map.ts`. Iconos SVG inline. Map `output=embed` sin key.
- **3g hecho:** `Testimonials` manual completo; google → placeholder (diferido tras API key + fetch server-side + reviews en Context). `lib/builder/testimonials.ts`.
- **Paso 3 COMPLETO:** los 17 bloques con render real; `Placeholder` eliminado de config.tsx.
- **Diseño anti-genérico (mergeado):** auditado con `impeccable` + `frontend-design` (globales en `~/.agents/skills`). Detector determinista de impeccable roto (`ERR_MODULE_NOT_FOUND`) → auditoría manual.
- **Deps:** `react-markdown`, `remark-gfm`. Las 4 vulnerabilidades moderadas de `npm audit` son preexistentes (postcss vía next, uuid vía puck), no de estas.
- **Diferido a futuro:** Testimonials-google necesita `GOOGLE_PLACES_API_KEY` + `config.integrations.google_place_id` (añadir a tipo + admin) + fetch server-side + extender `TenantContext` con `reviews`.
- **Tests nuevos en esta rama:** `pagePath` (9) + `publish` (8). Total repo: 142.

### Estructura de carpetas relevante

```
components/
├── ui/                        ← primitivos
│   ├── BlockImage.tsx         ← <img> crudo centralizado + FramedImage (panel firma)
│   ├── Button.tsx
│   ├── Container.tsx
│   ├── Heading.tsx
│   ├── Section.tsx
│   ├── SectionHeader.tsx      ← cabecera reutilizable (align center|left)
│   ├── Text.tsx
│   └── index.ts
└── blocks/                    ← bloques del builder
    ├── Hero.tsx               ← [3a] brand-adaptive, 3 variantes, FramedImage
    ├── Services.tsx           ← [3b] cards/grid/list (rediseñadas, sin ghost-card)
    ├── Pricing.tsx            ← [3b] plan destacado elevado + badge
    ├── FAQ.tsx                ← [3b] use client, acordeón (h3>button)
    ├── CTA.tsx                ← [3b] white/primary/dark
    ├── Gallery.tsx            ← [3b] grid+masonry (carousel → Paso 8)
    ├── TextImage.tsx          ← [3b] 3 proporciones (default 60/40), img-left/right
    ├── Stats.tsx              ← [3b] variant grid/row/stacked
    ├── Team.tsx               ← [3b] variant grid/cards/list
    ├── Steps.tsx              ← [3b] horizontal/vertical
    ├── LogoGrid.tsx           ← [3b] grayscale→color on hover
    ├── Video.tsx              ← [3c] iframe allowlist YouTube/Vimeo o <video>
    ├── RichText.tsx           ← [3d] react-markdown sin rehype-raw, mapeo propio
    ├── Contact.tsx            ← [3f] 'use client', useTenant().contact, iconos SVG
    ├── Map.tsx                ← [3f] 'use client', iframe output=embed (sin key)
    ├── Testimonials.tsx       ← [3g] manual real; google → placeholder
    └── Spacer.tsx             ← [3b] sm/md/lg/xl

components/builder/
├── TenantProvider.tsx        ← [3e] 'use client'; Context + useTenant (default vacío)
├── PublicRender.tsx          ← [P4] 'use client'; <Render> público + TenantProvider
└── BuilderEditor.tsx         ← [6a] 'use client'; <Puck> + TenantProvider; botón Guardar borrador

app/[tenant]/(portal)/builder/
├── page.tsx                  ← [6a] lista de páginas + alta
├── actions.ts                ← [6a] createPageAction, saveDraftAction (guard authorizeBuilder)
└── [pageId]/page.tsx         ← [6a] editor de una página (server, scoped a tenant)

app/
└── dev/
    └── preview/
        └── page.tsx           ← [3a] harness de preview (solo dev)

lib/
└── builder/
    ├── config.tsx             ← Config<BuilderComponents>; los 17 bloques con render real
    ├── video.ts               ← [3c] parseVideoUrl + validateVideoFile (lógica pura testeada)
    ├── tenant-context.ts      ← [3e] TenantContext + buildTenantContext (whitelist, sin ai_config)
    ├── sanitize.ts            ← [P4] sanitizePublishedData (descarta bloques no registrados)
    ├── pagePath.ts            ← [6a] normalizePagePath (formato + reservadas) — testeado
    ├── contact.ts             ← [3f] buildContactItems (tel:/mailto:/wa.me)
    ├── map.ts                 ← [3f] buildMapEmbedUrl (output=embed, sin key)
    └── testimonials.ts        ← [3g] selectTestimonials (manual/google/placeholder)

.github/
└── workflows/
    └── ci.yml                 ← CI: typecheck + lint + test en cada PR a main
```

### Decisiones cerradas que afectan a 3b+
- CSS variables de branding (`--brand-primary`, `--brand-primary-fg`, etc.) — nunca colores hardcoded en bloques
- `Section` acepta `background: 'white' | 'gray' | 'brand' | 'dark'`; los bloques mapean sus props a ese tipo
- `FAQ` requiere `'use client'` (estado acordeón); el resto de los 11 bloques de 3b son Server Components
- `Gallery` variante `carousel` diferida a Paso 8 (necesita uploader de imágenes)
- `Testimonials` (`source:'google'`) diferido a 3g (requiere Context de 3e + `GOOGLE_PLACES_API_KEY`)
- `Video` UI de subida diferida a Paso 8; el render sobre URL existente va en 3c
- `Contact` y `Map` leen datos del tenant via React Context (3e) — diferidos a 3f
- Tests: solo lógica funcional (parseos, validaciones, sanitizado) — no render trivial
- **Diseño de bloques:** auditar con skills `impeccable` y `frontend-design` antes de dar por bueno un bloque. La identidad (color/fuente) la pone el tenant; los bloques solo aportan estructura, ritmo y un recurso firma. Anti-references vivas en `PRODUCT.md`/`DESIGN.md`: nada de cards idénticas, chrome triple (border+ring+sombra), ni "todo centrado". Preferir variantes que amplíen las posibilidades del builder.

### Gate de calidad
Antes de mergear cualquier rama: `npm run verify` (`tsc --noEmit` + `lint` + `npm test`) en verde.
Actualmente: **81 tests** verdes en `main`.

## Portabilidad futura — cambio de IA y de base de datos

> Contexto: hoy la plataforma usa **Claude (Anthropic)** como IA y **Supabase** como DB/Auth/Storage. A medida que escale, puede ser más rentable IA self-hosted (Ollama) y/o otro proveedor de DB. El código ya está preparado para que esos cambios sean acotados. Esta sección documenta exactamente qué tocar cuando llegue el momento. **No adelantar nada de esto ahora**: solo ejecutarlo cuando el coste lo justifique.

### A) Cambiar de IA (Claude → Ollama u otro)

**Estado de preparación:** ✅ listo. Punto único de acoplamiento: `lib/ai/provider.ts`. Nadie más importa `@ai-sdk/anthropic`. El modelo por tenant vive en `ai_config.model` con formato `proveedor:modelo` (sin prefijo = anthropic). Por defecto: constante `DEFAULT_MODEL` en ese archivo.

**Pasos para añadir Ollama (ejemplo):**
1. `npm i ollama-ai-provider` (provider community para el Vercel AI SDK).
2. En `lib/ai/provider.ts`: `import { createOllama } from 'ollama-ai-provider'`.
3. Registrar en `PROVIDERS`: `ollama: (model) => createOllama({ baseURL: process.env.OLLAMA_BASE_URL })(model)`.
4. Descomentar `OLLAMA_BASE_URL` en `.env.local` (ya está en `.env.example`).
5. Activar por tenant: poner `ollama:llama3.1` (o el modelo que sea) en el editor de `ai_config` del admin. Para migrar a TODOS los tenants sin modelo propio: cambiar la constante `DEFAULT_MODEL`.

**Qué NO cambia:** los call sites (`buildPrompt`, `api/chat/route.ts`, widget de chat), la construcción del prompt, la DB. Solo `provider.ts` + env + config.

**A verificar al migrar:** soporte de tool use (varía por modelo Ollama), que el streaming funciona (lo abstrae el AI SDK), y que la **derivación a humano** sigue bien (los modelos locales son más flojos; las `handoffRules` del prompt cubren ese riesgo). El modelo es por tenant: se puede dejar Claude en tier_3 (alto valor) y Ollama en tier_1, mezclando, sin tocar código.

### B) Cambiar de base de datos (Supabase → otro)

**Estado de preparación:** ⚠️ parcial, a propósito. La **capa de datos** (`lib/db/`) ya está aislada (#7); el **acoplamiento profundo** (Auth + RLS + Storage) NO, porque abstraerlo antes de necesitarlo es sobre-ingeniería y sería reescritura igualmente.

**Parte fácil — ya preparada (capa de datos):**
- Todas las queries de tablas viven en `lib/db/*` (hoy `tenants.ts`; añadir `leads.ts`, `pages.ts`… con el mismo patrón a medida que avancen las fases).
- Devuelven **tipos de dominio** (`lib/supabase/types.ts` → renombrable a `lib/types.ts`) y un resultado de escritura neutro `{ error: {message} | null }`, sin filtrar tipos de Supabase.
- Migrar: reimplementar el cuerpo de cada función de `lib/db/*` contra el nuevo motor, manteniendo firmas y tipos. **Los call sites (páginas, actions) no se tocan.**

**Parte difícil — NO abstraída (hacer solo si se migra):**
1. **Auth** (lo más acoplado). Supabase Auth está en: `lib/supabase/{server,browser,service}.ts`, `lib/admin.ts` (`isAdmin` lee `app_metadata.role`), las actions `inviteOwner`/`changeOwnerEmail` (`auth.admin.*`), el login admin y el auth del dueño (Fase 4 Paso 5). El JWT lleva `tenant_id`+`role` en `app_metadata`. Reemplazarlo = reimplementar login, sesión/JWT con esos claims, e invitación de usuarios. Recomendación: encapsular en un futuro `lib/auth/` cuando se decida migrar.
2. **Aislamiento por tenant.** Hoy lo garantiza **RLS de Postgres** (las migraciones `0002`/`0003`/`0004`). Si se mantiene Postgres en otro proveedor (Neon, RDS…), las policies se conservan → coste medio. Si se cambia de **motor**, RLS no existe en otros: hay que reimplementar el aislamiento como filtro `tenant_id` **obligatorio en cada función de `lib/db/`** y probarlo con tests de fuga. (Por eso centralizar en `lib/db` es clave: es el único sitio donde imponerlo.)
3. **Storage** (imágenes del builder, Fase 4 Paso 8): Supabase Storage → S3/R2/etc. Encapsular en un único helper de subida desde el principio de esa fase.
4. **Protección de columnas sensibles** (#1, `ai_config`): hoy son GRANTs de columna de Postgres. En otro modelo sin column-grants, reimplementar la protección en la capa de app (no seleccionar `ai_config` salvo en server).

**Recomendación clave:** si hay que migrar, **quedarse en Postgres** (cambiar solo de proveedor). Así RLS y las migraciones se conservan y el cambio se reduce a Auth + Storage + creación de cliente. Cambiar de motor de DB es reescribir el modelo de seguridad entero.

**Resumen de esfuerzo:** IA = horas (ya listo). DB en Postgres = días (Auth + Storage). DB cambiando de motor = reescritura del aislamiento (semanas). Decidir con esos números en mano.

---

## Riesgos y notas

- **Next.js 16.2.7 ≠ el Next que conoces.** Leer `node_modules/next/dist/docs/` antes de middleware, layouts, `params` async, server actions y routing por host. No asumir APIs de memoria.
- **Puck:** leer sus docs (puckeditor.com/docs) antes de integrar. El JSON que produce se valida server-side al publicar (zod: solo bloques registrados); nunca se renderiza contenido sin validar. El markdown del blog se renderiza seguro (sin HTML arbitrario).
- **Claude API:** consultar la skill `claude-api` para model ids, streaming y tool use vigentes antes de codear la Fase 6.
- **Fuga entre tenants = incidente grave.** El aislamiento (RLS + `tenant_id` server-side) es la propiedad de seguridad nº1; se prueba explícitamente, no se asume.
- **No improvisar arquitectura.** Antes de tocar un área, leer su `references/*.md`; este plan no sustituye esas guías, las secuencia.
