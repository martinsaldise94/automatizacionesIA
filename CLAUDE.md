@AGENTS.md

# Agency Platform

Plataforma **multi-tenant** (Next.js 16 App Router + Supabase) que vende webs inteligentes con IA, reservas y CRM a negocios locales en tres niveles (`tier_1`, `tier_2`, `tier_3`).

**Regla de oro:** un cliente = una fila en `tenants` + su config. Nunca se duplica código por cliente. Si te ves copiando una carpeta para un cliente concreto, párate.

## Comandos

| Comando | Qué hace |
|---|---|
| `npm run dev` | servidor de desarrollo |
| `npm run verify` | **el gate**: `typecheck` + `lint` + `test` |
| `npm test` | vitest (una pasada) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run db:types` | regenera tipos desde Supabase |

## Dónde vive cada cosa

```
app/[tenant]/           web pública del cliente (renderiza SOLO published_data)
app/[tenant]/(portal)/  área privada del dueño: builder, blog, dashboard
app/admin/              panel de la agencia (requiere isAdmin, no solo sesión)
lib/db/                 única capa que habla con la DB (patrón repositorio)
lib/builder/            config de Puck + lógica pura de bloques
components/ui/          primitivos    components/blocks/  bloques del builder
supabase/migrations/    esquema versionado + RLS
tests/                  vitest — lógica, no render trivial
```

Arquitectura completa, convenciones y modelo de datos: **skill `agency-platform`** (`.claude/skills/agency-platform/SKILL.md`). Léela antes de decidir dónde va algo.

Guías por área — léelas antes de escribir código en esa área, no reconstruyas de memoria:
`references/builder.md` · `references/data-model.md` · `references/ai-agent.md` · `references/tiers.md` · `references/onboarding.md`

Estado del desarrollo: `plan.md` (bloque `## Contexto actual` al final).
Producto y sistema visual: `PRODUCT.md` · `DESIGN.md`.

## Invariantes que no se rompen

1. **Aislamiento por tenant.** Toda tabla de cliente lleva `tenant_id` + RLS. El `tenant_id` se deriva **siempre** en servidor (`resolveTenant()`), jamás del body. Una fuga entre tenants es incidente grave: se prueba, no se asume.
2. **Configuración por datos, no por código.** Branding, textos, horarios y el prompt del agente viven en `tenants.config` / `ai_config`.
3. **Borrador ≠ publicado.** El público solo ve `pages.published_data` y posts `published`. Publicar pasa siempre por validación zod server-side.
4. **Gating por features nombradas.** `hasFeature(tenant, 'crm')`, nunca `if (plan === 'tier_3')`.
5. **Automatizaciones en n8n.** Next.js dispara webhooks y recibe callbacks; no hay crons de negocio en el código.
6. **`app_metadata`, nunca `user_metadata`,** para `tenant_id` y `role` (el usuario puede escribir el segundo).
7. **Sin colores hex en bloques.** Todo por tokens `--brand-*`.

## Reglas de sesión

- **Modo caveman:** frases cortas, directas, sin florituras.
- **Un paso a la vez.** Al arrancar, leer `## Contexto actual` de `plan.md`. `/paso` ejecuta el siguiente pendiente; `/cerrar-paso` lo integra.
- **Autonomía dentro del paso.** No preguntes a mitad: ejecuta el paso entero (código + tests + verify + plan.md + commit + PR + merge) y para **al final** para que el usuario revise. Solo interrumpe si algo es irreversible, ambiguo de verdad, o rompe una invariante.
- **Definition of done:** un paso no se marca `[x]` sin `npm run verify` en verde. Si falla, el paso sigue abierto.
- **Actualizar `plan.md` SIEMPRE**, sin que te lo pidan: marcar `[x]` y refrescar `## Contexto actual` (rama, archivos nuevos, siguiente paso). Un hook te lo recordará si se te olvida.
- **Al cerrar un paso, dos cosas: qué has hecho y cómo verlo.** El informe final SIEMPRE termina con instrucciones concretas para ver el resultado en el navegador: comando de arranque, URL exacta (con puerto y tenant), con qué usuario entrar si hace falta, y qué debería verse. Nada de "ya está hecho" a secas — si el usuario no lo puede mirar, el paso no está entregado.
- **Tests obligatorios** para cualquier lógica (parseos, validaciones, ramas de decisión, sanitizado). No aserciones triviales de render.
- **Nunca abrir `.env.local`.** Un hook lo bloquea. Si falta una variable, dilo y señala `.env.example`.
- **Next.js 16.2.7 ≠ el Next que conoces.** Lee `node_modules/next/dist/docs/` antes de tocar middleware/proxy, routing, `params` async o server actions.

## Git

`main` está **protegido**: todo entra por PR con CI en verde. Una rama por paso: `feat|fix|chore/<paso>-<resumen>` (ej. `feat/3a-hero`).

Claude está autorizado a `commit`, `push`, abrir PR y **mergear a main** sin pedir permiso, dentro del flujo de un paso. Commits en **Conventional Commits** con descripción en español: `feat(builder): bloque Hero + harness de preview`. Borrar ramas con `git branch -d` (minúscula), nunca `-D`.

Redes de seguridad ya montadas: husky `pre-commit` (lint-staged) y `pre-push` (`verify`), más GitHub Actions en cada PR.
