---
name: agency-platform
description: Contexto y convenciones del proyecto Agency Platform, una plataforma multi-tenant en Next.js y Supabase para vender webs inteligentes con IA, reservas y CRM a negocios locales en tres niveles de suscripción. Usa esta skill SIEMPRE que se trabaje en este repositorio, al crear o configurar un nuevo cliente (tenant), al tocar el agente IA, las reservas, el CRM, el panel de admin, los webhooks de n8n o WhatsApp, o al decidir dónde vive una pieza de código. También cuando se hable de niveles, tier, tenant, cliente nuevo, plantilla, onboarding o multi-tenant. No improvises arquitectura; esta skill define cómo está montado todo y dónde va cada cosa.
---

# Agency Platform — Contexto del proyecto

Plataforma **multi-tenant** que permite vender, a negocios locales, un producto digital en tres niveles de suscripción. Una sola base de código sirve a todos los clientes; cada cliente es un `tenant` configurado por datos en la base de datos, no por código duplicado.

**La regla de oro:** nunca se crea un proyecto nuevo por cliente. Un cliente = una fila en `tenants` + su configuración. Si alguna vez te ves copiando una carpeta entera para un cliente concreto, párate: estás rompiendo el modelo.

## El producto: tres niveles

Cada tenant tiene un campo `plan` (`tier_1`, `tier_2`, `tier_3`) que activa funcionalidad de forma incremental. Nada se rehace al subir de nivel: solo se desbloquean módulos.

| Nivel | Nombre | Desbloquea |
|-------|--------|------------|
| `tier_1` | Web Inteligente | Web multi-página que el cliente edita él mismo (builder visual), blog propio, SEO local, agente IA básico (FAQs), derivación a WhatsApp |
| `tier_2` | Web + Reservas | Todo lo anterior + reservas, formularios cualificados, recordatorios automáticos |
| `tier_3` | Sistema Conectado | Todo lo anterior + CRM, dashboard, seguimientos automáticos, WhatsApp API |

El **builder y el blog son de todos los tiers**: el valor diferencial es que el cliente personaliza su web en autoservicio (como un puzle, estilo Squarespace) y la agencia interviene solo para diseño a medida.

Precios y detalle completo de cada nivel: `references/tiers.md` es la única fuente de verdad. No dupliques precios aquí ni en código.

## Stack

- **Next.js 16.2.7 (App Router)** — frontend + API routes. TypeScript en todo.
- **Supabase** — Postgres + Auth + Storage + Realtime. Multi-tenancy se aplica con Row Level Security (RLS) por `tenant_id`.
- **Vercel** — deploy. Routing por subdominio/slug hacia el tenant correcto.
- **Puck** (`@measured/puck`, MIT) — editor visual del builder. Solo participa en la pantalla de edición; la web pública renderiza el JSON publicado en servidor. Ver `references/builder.md`.
- **Vercel AI SDK + Claude API** — el agente IA embebido. El system prompt vive en la DB, no en el código.
- **n8n** (self-hosted) — todas las automatizaciones de todos los tenants. Next.js dispara webhooks; n8n orquesta.
- **360dialog** — WhatsApp Business API.
- **Cal.com** (embed o API) — motor de reservas en `tier_2+`. Citas se reflejan en Supabase.
- **Resend** — emails transaccionales.

Tailwind para estilos. Sin librerías de UI pesadas por defecto; componentes propios en `components/ui`.

## Estructura del repo

```
app/
├── [tenant]/                 # web pública de cada cliente, resuelta por slug
│   ├── [[...path]]/          # renderiza la página de `pages` que coincida (home = '/')
│   ├── blog/                 # blog público del tenant (lista + [slug])
│   ├── reservar/             # tier_2+: sistema de citas
│   ├── (portal)/             # área privada del DUEÑO del negocio (todos los tiers)
│   │   ├── auth/             # login del dueño (JWT con tenant_id en app_metadata)
│   │   ├── builder/          # editor visual de páginas (Puck)
│   │   ├── blog/             # editor de posts (markdown)
│   │   └── dashboard/        # tier_3: CRM, métricas
│   └── api/
│       ├── chat/             # endpoint del agente IA
│       └── webhook/          # recibe callbacks de n8n / 360dialog
├── admin/                    # TU panel: gestión de todos los tenants
│   ├── tenants/
│   └── tenants/[id]/         # configurar un cliente concreto
lib/
├── supabase/                 # clientes server/browser, helpers RLS
├── tenant.ts                 # resolveTenant(slug) — punto único de verdad
├── admin.ts                  # isAdmin(user) — guard de rol para /admin
├── slug.ts                   # validateSlug() + slugs reservados
├── builder/                  # config de Puck: registro de bloques + validación zod al publicar
├── templates/                # plantillas por sector: sets de pages predefinidos
└── ai/                       # construcción del prompt del agente
components/
├── ui/                       # primitivos
└── blocks/                   # bloques del builder (hero, pricing, faq...) — React puro
supabase/
└── migrations/               # esquema versionado (tenants, leads, bookings, messages, pages, posts)
```

## Convenciones que no se rompen

1. **Aislamiento por tenant.** Toda tabla con datos de cliente lleva `tenant_id` y una policy RLS. Nunca consultes sin filtrar por tenant. El tenant se resuelve una sola vez con `resolveTenant()` en `lib/tenant.ts`.

2. **Configuración por datos, no por código.** Logo, colores, textos, servicios, horarios y el prompt del agente viven en `tenants.config` (JSONB) y tablas relacionadas. Añadir un cliente = insertar filas, no escribir componentes.

3. **Los bloques son data-driven y el cliente los edita él mismo.** `components/blocks/*` son componentes React puros registrados en la config de Puck (`lib/builder/`). El cliente arma su web en el builder (drag & drop); las páginas viven en la tabla `pages`. Bloque nuevo = registrarlo una vez, disponible para todos los tenants. Ver `references/builder.md`.

3b. **Borrador y publicado son sagrados.** La web pública SOLO renderiza `pages.published_data` y posts con `status='published'`. `draft_data` jamás llega al público. Publicar pasa siempre por validación zod server-side (solo bloques registrados).

4. **Las automatizaciones viven en n8n, no en Next.js.** Next.js solo dispara eventos (`POST` a un webhook) y recibe callbacks. La lógica de "si no reserva en 48h, enviar WhatsApp" es un flujo n8n, no un cron en el código. Esto mantiene el código limpio y permite cambiar flujos sin desplegar.

5. **Gating por nivel centralizado.** No esparzas `if (plan === 'tier_3')` por todo el código. Usa el helper de `references/tiers.md` (`hasFeature(tenant, 'crm')`). Las features son nombradas, no los tiers.

6. **El agente IA siempre sabe derivar.** Nunca un agente que finja resolver todo. El prompt incluye reglas de cuándo pasar a humano/WhatsApp. Ver `references/ai-agent.md`.

7. **Todo bajo `/admin` requiere rol admin, no solo sesión.** Sesión válida ≠ admin: los dueños de negocio también tienen sesión en el mismo Supabase Auth (desde tier_1, por el builder). El guard es `isAdmin(user)` en `lib/admin.ts` (comprueba `app_metadata.role === 'admin'`). Toda ruta o action nueva bajo `/admin` debe pasar por él. El dueño lleva `app_metadata: { tenant_id, role: 'owner' }` — siempre `app_metadata` (solo escribible con service role), nunca `user_metadata`.

8. **Headers `x-tenant` y `x-pathname` solo los pone el middleware.** El middleware borra/sobrescribe siempre los que vengan del cliente. Nunca confíes en un header de request sin pasar por ahí.

9. **Slugs validados siempre.** Todo alta o edición de slug pasa por `validateSlug()` en `lib/slug.ts` (formato + lista de reservados como `admin`, `www`, `api`).

## Tareas frecuentes — a dónde ir

- **Dar de alta un cliente nuevo** → `references/onboarding.md` (proceso paso a paso, qué filas insertar, cómo apuntar el dominio).
- **Builder, bloques, plantillas o blog** → `references/builder.md` (Puck, tabla pages, draft/publish, seguridad).
- **Modelo de datos / nueva tabla** → `references/data-model.md` (esquema, RLS, patrón multi-tenant).
- **Tocar o configurar el agente IA** → `references/ai-agent.md` (cómo se construye el prompt, derivación, coste).
- **Entender qué hace cada nivel y cómo se activa** → `references/tiers.md`.
- **Ver en qué punto está el desarrollo** → `plan.md` (plan por fases con estado actualizado).

Lee el archivo de referencia relevante antes de escribir código en esa área. No reconstruyas de memoria patrones que ya están documentados ahí.

## Herramientas del repo

Comandos (`.claude/commands/`):

| Comando | Para qué |
|---|---|
| `/paso [nº]` | ejecuta de principio a fin el siguiente paso pendiente de `plan.md` |
| `/cerrar-paso` | commit → push → PR → CI → merge a `main` → limpiar rama |
| `/verify` | corre el gate (`typecheck` + `lint` + `test`) y reporta |
| `/bloque <Nombre>` | bloque nuevo del builder con el contrato de `references/builder.md` |
| `/contexto` | dónde estamos: rama, trabajo suelto, siguiente paso |

Subagentes (`.claude/agents/`):

- **`tenant-isolation-auditor`** — caza fugas entre tenants. Pásalo antes de mergear cualquier cambio en `lib/db/`, migraciones, guards, API routes o server actions.
- **`block-reviewer`** — audita bloques contra `DESIGN.md` y las anti-references de `PRODUCT.md`.

Hooks (`.claude/hooks/`, registrados en `.claude/settings.json`) — los ejecuta el harness, no Claude:

- `guard-env.mjs` (PreToolUse) bloquea leer o escribir `.env*` real.
- `lint-file.mjs` (PostToolUse) pasa `eslint --fix` al archivo recién editado.
- `plan-reminder.mjs` (Stop) impide terminar el turno con código tocado y `plan.md` sin actualizar.
- `session-context.mjs` (SessionStart) inyecta rama, trabajo sin commitear y `## Contexto actual`.

## Reglas de sesión

- **Responder siempre en modo caveman:** frases cortas, directas, sin florituras.
- **El flujo de trabajo es por pasos, no por fases.** Avanzar un paso a la vez. Cuando el usuario diga "vamos", ejecutar el siguiente paso pendiente en `plan.md`.
- **Definition of done:** un paso no se marca `[x]` sin `npx tsc --noEmit` limpio y `npm test` en verde. Si algo falla, el paso sigue abierto.
- **Actualizar `plan.md` SIEMPRE, sin que el usuario lo pida.** Cada vez que se complete un paso: marcarlo `[x]`. No esperar instrucción. Es obligatorio antes de responder al usuario.
- **Mantener el bloque `## Contexto actual` al final de `plan.md` siempre actualizado.** Tras cada paso (o sub-paso) actualizar: rama activa, commit pendiente, archivos nuevos/modificados, primitivos/utilidades disponibles, siguiente paso. Es la primera fuente de verdad al retomar una sesión. Si se crea o elimina una carpeta o archivo relevante, reflejarlo aquí inmediatamente.
- **Al empezar una sesión nueva**, leer `plan.md` (especialmente `## Contexto actual`) para saber en qué paso estamos y qué queda pendiente antes de hacer nada.
- **Si surge una duda sobre el modelo o dónde va algo, revisar esta skill y los archivos de referencia antes de improvisar.** La arquitectura ya está definida; no es necesario reinventarla.
- **Nunca ver el .env.local real.** Si necesitas variables de entorno para una tarea, revisa `references/onboarding.md` o `references/data-model.md` según corresponda. No expongas secretos en la conversación. Sugiereme que cambie cosas de ahí si ese es el error.
- **Hacer archivos de test para cualquier función con lógica importante.** No es opcional. Si no sabes cómo, revisa ejemplos en el código o pide guía. El objetivo es que no se rompa nada sin que lo detectemos y que esté listo para escalar a más clientes sin miedo a bugs. Los test los corro yo, pero tú eres responsable de escribirlos.
  - **Los tests cubren funcionalidad/lógica** (parseos, validaciones, ramas de decisión, sanitizado), **no aserciones triviales de render** ("el componente pinta un `<h1>`"). Cobertura por cobertura es ruido. En bloques del builder, ver el criterio en `references/builder.md` ("Tests de bloques").

## Workflow de git y CI

**Hay tests automáticos antes de subir — ya montado.** Dos redes en cascada:
- **Local (husky):** `pre-commit` corre `lint-staged`; `pre-push` corre `npm run verify` (`typecheck` + `lint` + `test`). Si algo falla, el push se aborta en tu máquina.
- **GitHub Actions** (`.github/workflows/ci.yml`): repite `verify` en cada push y PR a `main`, con el Node del `.nvmrc`. `main` está **protegido**: no acepta push directo y solo se mergea por PR con el check en verde.

**Una rama por paso del plan.** Como `main` está protegido, todo el código entra por PR. Cada paso (o sub-paso, ej. 3a) va en su rama:
- Nombre: `feat|fix|chore/<paso>-<resumen-corto>` — ej. `feat/3a-hero`.
- Flujo: `git checkout -b feat/3a-hero` → trabajar → `git push -u origin <rama>` (dispara el pre-push) → PR a `main` → check verde → merge → `git checkout main && git pull` → `git branch -d <rama>`.
- Borrar ramas siempre con `git branch -d` (minúscula): se niega si hay trabajo sin mergear. Nunca `-D` salvo querer tirar trabajo.

**Al cerrar un paso, proponer SIEMPRE el commit — sin que el usuario lo pida.** Cuando un paso queda en verde (`tsc` + `test`) y se marca `[x]`, decir cómo nombrar el commit, formato **Conventional Commits** con descripción en español:
- `tipo(scope): descripción`. Tipos: `feat`, `fix`, `chore`, `docs`, `refactor`, `test`.
- Ej: `feat(builder): bloque Hero + harness de preview`.
