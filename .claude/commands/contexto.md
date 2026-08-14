---
description: Dónde estamos — rama, trabajo sin commitear, tests y siguiente paso
allowed-tools: Bash(git branch --show-current), Bash(git status --short), Bash(git log --oneline -5), Bash(npm test)
---

Estado del repo:

- Rama: !`git branch --show-current`
- Sin commitear: !`git status --short`
- Últimos commits: !`git log --oneline -5`

Con eso y el bloque `## Contexto actual` de `plan.md`, dime en **6 líneas máximo**:

1. En qué paso del plan estamos y si está abierto o cerrado.
2. Qué hay a medias sin commitear (si algo).
3. Cuál es el siguiente paso pendiente.
4. Cualquier cosa que no cuadre: rama que no corresponde al paso, trabajo huérfano,
   `plan.md` desincronizado con lo que hay en disco.

No corras los tests salvo que te lo pida. No arregles nada todavía.
