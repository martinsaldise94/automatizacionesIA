---
name: agency-platform
description: Contexto y convenciones del proyecto Agency Platform, una plataforma multi-tenant en Next.js y Supabase para vender webs inteligentes con IA, reservas y CRM a negocios locales en tres niveles de suscripción. Usa esta skill SIEMPRE que se trabaje en este repositorio, al crear o configurar un nuevo cliente (tenant), al tocar el agente IA, las reservas, el CRM, el panel de admin, los webhooks de n8n o WhatsApp, o al decidir dónde vive una pieza de código. También cuando se hable de niveles, tier, tenant, cliente nuevo, plantilla, onboarding o multi-tenant. No improvises arquitectura; esta skill define cómo está montado todo y dónde va cada cosa.
---

# Agency Platform — Contexto del proyecto

Plataforma **multi-tenant** que permite vender, a negocios locales, un producto digital en tres niveles de suscripción. Una sola base de código sirve a todos los clientes; cada cliente es un `tenant` configurado por datos en la base de datos, no por código duplicado.

**La regla de oro:** nunca se crea un proyecto nuevo por cliente. Un cliente = una fila en `tenants` + su configuración. Si alguna vez te ves copiando una carpeta entera para un cliente concreto, párate: estás rompiendo el modelo.

## El producto: tres niveles

Cada tenant tiene un campo `plan` (`tier_1`, `tier_2`, `tier_3`) que activa funcionalidad de forma incremental. Nada se rehace al subir de nivel: solo se desbloquean módulos.

| Nivel | Nombre | Precio orientativo | Desbloquea |
|-------|--------|-------------------|------------|
| `tier_1` | Web Inteligente | 49€/mes | Web premium 4-5 páginas, SEO local, agente IA básico (FAQs), derivación a WhatsApp |
| `tier_2` | Web + Reservas | 69€/mes | Todo lo anterior + reservas, formularios cualificados, recordatorios automáticos |
| `tier_3` | Sistema Conectado | 89€/mes | Todo lo anterior + CRM, panel del cliente, seguimientos automáticos, WhatsApp API |

Detalle completo de qué incluye cada nivel y cómo se activa en código: ver `references/tiers.md`.

## Stack

- **Next.js 16.2.7 (App Router)** — frontend + API routes. TypeScript en todo.
- **Supabase** — Postgres + Auth + Storage + Realtime. Multi-tenancy se aplica con Row Level Security (RLS) por `tenant_id`.
- **Vercel** — deploy. Routing por subdominio/slug hacia el tenant correcto.
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
│   ├── page.tsx              # landing del tenant (lee config de DB)
│   ├── reservar/             # tier_2+: sistema de citas
│   ├── (portal)/             # tier_3: área privada del cliente final
│   │   ├── auth/
│   │   └── dashboard/
│   └── api/
│       ├── chat/             # endpoint del agente IA
│       └── webhook/          # recibe callbacks de n8n / 360dialog
├── admin/                    # TU panel: gestión de todos los tenants
│   ├── tenants/
│   └── tenants/[id]/         # configurar un cliente concreto
lib/
├── supabase/                 # clientes server/browser, helpers RLS
├── tenant.ts                 # resolveTenant(slug) — punto único de verdad
└── ai/                       # construcción del prompt del agente
components/
├── ui/                       # primitivos
└── blocks/                   # secciones de landing reutilizables (hero, pricing, faq...)
supabase/
└── migrations/               # esquema versionado
```

## Convenciones que no se rompen

1. **Aislamiento por tenant.** Toda tabla con datos de cliente lleva `tenant_id` y una policy RLS. Nunca consultes sin filtrar por tenant. El tenant se resuelve una sola vez con `resolveTenant()` en `lib/tenant.ts`.

2. **Configuración por datos, no por código.** Logo, colores, textos, servicios, horarios y el prompt del agente viven en `tenants.config` (JSONB) y tablas relacionadas. Añadir un cliente = insertar filas, no escribir componentes.

3. **Los bloques de landing son data-driven.** `components/blocks/*` reciben props desde la config del tenant. Un cliente nuevo arma su web eligiendo y configurando bloques, no maquetando desde cero.

4. **Las automatizaciones viven en n8n, no en Next.js.** Next.js solo dispara eventos (`POST` a un webhook) y recibe callbacks. La lógica de "si no reserva en 48h, enviar WhatsApp" es un flujo n8n, no un cron en el código. Esto mantiene el código limpio y permite cambiar flujos sin desplegar.

5. **Gating por nivel centralizado.** No esparzas `if (plan === 'tier_3')` por todo el código. Usa el helper de `references/tiers.md` (`hasFeature(tenant, 'crm')`). Las features son nombradas, no los tiers.

6. **El agente IA siempre sabe derivar.** Nunca un agente que finja resolver todo. El prompt incluye reglas de cuándo pasar a humano/WhatsApp. Ver `references/ai-agent.md`.

## Tareas frecuentes — a dónde ir

- **Dar de alta un cliente nuevo** → `references/onboarding.md` (proceso paso a paso, qué filas insertar, cómo apuntar el dominio).
- **Modelo de datos / nueva tabla** → `references/data-model.md` (esquema, RLS, patrón multi-tenant).
- **Tocar o configurar el agente IA** → `references/ai-agent.md` (cómo se construye el prompt, derivación, coste).
- **Entender qué hace cada nivel y cómo se activa** → `references/tiers.md`.

Lee el archivo de referencia relevante antes de escribir código en esa área. No reconstruyas de memoria patrones que ya están documentados ahí.
