---
description: Integra el paso terminado — commit, PR, merge a main y limpieza de rama
---

Integra el trabajo de la rama actual en `main`. `main` está protegido: **todo entra por
PR con CI en verde**, nunca por push directo.

Tienes autorización permanente para commitear, pushear, abrir PR y mergear. No pidas
permiso; hazlo y reporta.

## Antes de nada

1. `npm run verify` en verde. Si falla, **para aquí** y arréglalo — no se integra en rojo.
2. `plan.md` actualizado: paso marcado `[x]` y `## Contexto actual` al día. Si no lo está,
   actualízalo antes de commitear (entra en el mismo commit).
3. `git status` — revisa que no se cuela nada que no toca (`.env*`, artefactos de build,
   `tsconfig.tsbuildinfo`).

## Integración

1. **Commit** en Conventional Commits, descripción en español:
   `tipo(scope): descripción` — tipos `feat`, `fix`, `chore`, `docs`, `refactor`, `test`.
   Ej: `feat(builder): bloque Hero + harness de preview`.
2. **Push**: `git push -u origin <rama>` — dispara el pre-push de husky (`verify` otra vez).
3. **PR**: `gh pr create --base main --fill` (o `--title`/`--body` si el commit no basta).
   El cuerpo dice qué paso del plan cierra y cómo verificarlo.
4. **Esperar CI**: `gh pr checks --watch`. Si sale rojo, arregla y repite; no fuerces.
5. **Merge**: `gh pr merge --squash --delete-branch`.
6. **Limpiar**: `git checkout main && git pull` y confirma que la rama local se borró
   (`git branch -d <rama>` si sigue viva — nunca `-D`).

Si `gh` no está disponible o falla la autenticación, deja el push hecho, imprime la URL
para abrir el PR a mano y dilo claramente. No intentes push directo a `main`.

## Al terminar

Reporta en 4 líneas: commit, nº de PR, resultado del CI, y en qué paso queda el plan.
