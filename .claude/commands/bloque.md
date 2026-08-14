---
description: Crea un bloque nuevo del builder siguiendo el contrato del proyecto
argument-hint: "<Nombre> [descripción de qué debe mostrar]"
---

Crea el bloque **$1** del builder. Lo que debe mostrar: $ARGUMENTS

Un bloque nuevo queda disponible para **todos los tenants** automáticamente. Nunca una
página hardcodeada para un cliente concreto.

## Lee antes de escribir

- `references/builder.md` — contrato de bloques, seguridad, criterio de tests.
- `DESIGN.md` — escala tipográfica, tokens, layout, motion, y la lista de **bans**.
- `PRODUCT.md` — anti-references (plantilla SaaS, default IA crema+serif, gris shadcn).
- Las docs de Puck (puckeditor.com/docs) si tocas la forma de los campos.
- Un bloque ya existente en `components/blocks/` — copia su forma, no inventes otra.

## Contrato

1. Componente React **puro** en `components/blocks/<Nombre>.tsx`: recibe props, no consulta
   DB ni APIs. Si necesita datos del tenant (contacto, reseñas), los lee del
   `TenantContext`, y esos datos **no** van en las props guardadas.
2. Registrado en `lib/builder/config.tsx` con campos editables, **variantes de layout**
   como `select`, y `defaultProps` sensatos: recién arrastrado tiene que verse bien sin
   configurar nada. Un dueño no técnico no puede dejarlo feo.
3. Compuesto con los primitivos (`Section`, `Container`, `Heading`, `Text`, `Button`).
   Cero hex: todo color y tipografía por tokens `--brand-*`.
4. Móvil-primero. Si se rompe en móvil, no se mergea.
5. Server Component salvo que necesite estado; entonces `'use client'` y dilo.
6. Sin campos que acepten HTML o "código embed" sin sanitizar. Si entra una URL externa,
   valídala contra un allowlist de hosts y construye tú el iframe.
7. La lógica pura (parseos, validaciones, selección de fuente) va en `lib/builder/<algo>.ts`
   **con test**. El render trivial no se testea.

## Diseño

Audita el resultado con las skills `impeccable` y `frontend-design` antes de darlo por
bueno. La identidad la pone el tenant; el bloque aporta **estructura, ritmo y un recurso
firma**. Prefiere variantes que amplíen lo que el dueño puede montar, no una más.

Prohibido (heredado de `DESIGN.md`): cards idénticas en grid, chrome triple
(border + ring + sombra), todo centrado, gradient text, glassmorphism por defecto,
eyebrow en mayúsculas tracked, marcadores 01/02/03 de relleno, radios ≥24px.

## Al terminar

`npm run verify` en verde, `plan.md` actualizado, y enséñame el bloque en el harness de
preview (`app/dev/preview`) o con `playwright-cli` — una captura vale más que la descripción.
