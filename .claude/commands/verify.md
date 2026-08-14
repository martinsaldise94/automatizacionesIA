---
description: Corre el gate de calidad (typecheck + lint + tests) y reporta
allowed-tools: Bash(npm run verify), Bash(npm run typecheck), Bash(npm run lint), Bash(npm test)
---

Corre `npm run verify` (typecheck + lint + tests) y reporta el resultado.

- **Verde:** una línea. Nº de tests que pasan y nada más.
- **Rojo:** enseña el error real (no lo parafrasees), di qué archivo y qué línea lo causa,
  y si el arreglo es obvio hazlo y vuelve a correrlo. Si no es obvio, explica las opciones
  en dos líneas y pregunta.

Nunca digas "está en verde" sin haber visto la salida del comando.
