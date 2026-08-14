---
description: Ejecuta de principio a fin el siguiente paso pendiente de plan.md
argument-hint: "[nº de paso, opcional — si se omite, el siguiente pendiente]"
---

Ejecuta un paso completo del plan. **No pares a mitad para preguntar**: el usuario
solo revisa al final. Interrumpe únicamente si algo es irreversible, rompe una
invariante del proyecto, o el plan es genuinamente ambiguo en dos direcciones que
llevarían a trabajo distinto.

Paso a ejecutar: **$1** (si está vacío, el primer `[ ]` pendiente de `plan.md`).

## Antes de escribir código

1. Invoca la skill `agency-platform` y lee el bloque `## Contexto actual` de `plan.md`.
2. Lee el `references/*.md` del área que vas a tocar (builder, data-model, ai-agent,
   tiers, onboarding). No reconstruyas de memoria patrones ya documentados.
3. Si tocas framework (proxy/middleware, routing, `params`, server actions), lee antes
   `node_modules/next/dist/docs/`. Esta versión de Next tiene breaking changes.
4. Comprueba que estás en una rama del paso, no en `main`:
   `git checkout -b feat|fix|chore/<paso>-<resumen-corto>` (ej. `feat/3a-hero`).

## Mientras construyes

- **TDD**: test primero para cualquier lógica (parseos, validaciones, ramas de decisión,
  sanitizado). Nada de aserciones triviales de render.
- Toda query a DB va en `lib/db/`. Todo dato de cliente lleva `tenant_id` y su policy RLS.
- El `tenant_id` se deriva en servidor, **jamás** del body.
- Gating con `hasFeature(tenant, ...)`, nunca comparando el tier.
- Si el paso crea o cambia un bloque del builder, audítalo contra `DESIGN.md` y las
  anti-references de `PRODUCT.md` antes de darlo por bueno (skills `impeccable` y
  `frontend-design`).

## Para cerrar el paso

1. `npm run verify` en verde. Si falla, el paso **sigue abierto**: arréglalo.
2. Marca `[x]` el paso en `plan.md` y actualiza el bloque `## Contexto actual`:
   rama activa, archivos nuevos/modificados, primitivos disponibles, siguiente paso.
3. Ejecuta `/cerrar-paso` para integrar (commit → PR → merge → limpiar rama).
4. Resume al usuario en 5 líneas o menos: qué hiciste, qué archivos, tests que pasan,
   y **qué decisión tomaste tú** que quizá quiera discutir.
