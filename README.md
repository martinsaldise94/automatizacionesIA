# Agency Platform

Plataforma multi-tenant para vender webs inteligentes con IA, reservas y CRM a negocios locales.

## El producto

Un cliente = una fila en la base de datos. La misma base de código sirve a todos, configurada por datos.

| Nivel | Precio | Incluye |
|-------|--------|---------|
| tier_1 | xx€/mes | Web premium, SEO local, agente IA (FAQs + derivación a WhatsApp) |
| tier_2 | xx€/mes | + Reservas online, formularios cualificados, recordatorios automáticos |
| tier_3 | xx€/mes | + CRM, panel del cliente, seguimientos automáticos, WhatsApp API |

## Stack

- **Next.js 16 (App Router)** + TypeScript
- **Supabase** — Postgres + Auth + RLS multi-tenant
- **Vercel AI SDK + Claude API** — agente IA embebido, prompt por tenant en DB
- **n8n** — todas las automatizaciones (recordatorios, seguimientos, handoff)
- **360dialog** — WhatsApp Business API
- **Cal.com** — motor de reservas (tier_2+)
- **Resend** — emails transaccionales

## Arrancar en local



