# Product

## Register

brand

## Users

Dos públicos sobre la misma base de código:

- **Dueños de negocios locales** (clínicas, estética, restaurantes, consultoría). No técnicos. Entran al portal a editar su propia web con el builder (drag & drop), cambian textos y fotos, publican. Su contexto: poco tiempo, cero tolerancia a romper algo.
- **La agencia** (admin): da de alta tenants, configura branding y plan, interviene para diseño a medida.

El visitante final de cada web es el cliente del negocio local: llega buscando confianza y una acción clara (reservar, llamar, escribir por WhatsApp).

## Product Purpose

Plataforma multi-tenant que vende a negocios locales una web inteligente en tres niveles. Una sola base de código sirve a todos; cada cliente es datos, no código duplicado. Los **bloques** son el producto visible: componentes reutilizables que el dueño combina para montar su web. Éxito = el dueño publica una web que **no parece plantilla** sin tocar la agencia, y escala a cientos de tenants sin rehacer nada.

## Brand Personality

**Limpio y profesional.** Credibilidad y sobriedad por encima de efectismo. Estructura clara, contención, aire. Transmite confianza a un visitante que decide si dejar su dinero en ese negocio. La personalidad de color y tipografía la aporta **cada tenant** vía branding; los bloques aportan estructura, jerarquía y ritmo. Voz de 3 palabras: **claro, fiable, sin ruido.**

## Anti-references

Evitar explícitamente:

- **Plantilla SaaS:** hero centrado + 3 cards idénticas + gradiente + botón. El clché que grita "plantilla".
- **Default IA crema+serif:** fondo crema/sand, serif de alto contraste, acento terracota. El look IA saturado de 2026.
- **Shadcn / Vercel gris:** todo gris, bordes de 1px, radios uniformes, sombras suaves difusas. Reconocible al instante como "hecho con IA".

## Design Principles

1. **Brand-adaptive por diseño.** El bloque lleva estructura, escala y ritmo; el tenant lleva color y tipografía. Nunca se hardcodea identidad — todo color/fuente sale de tokens CSS (`--brand-*`).
2. **Estructura, no decoración.** La distinción viene del layout, la jerarquía tipográfica, el ritmo de espaciado y un elemento firma. No de gradientes, sombras difusas ni efectos.
3. **La claridad es el producto.** Legibilidad y contraste primero (AA real). Un negocio local debe leerse fiable de un vistazo.
4. **Autoservicio a prueba de fallos.** Los bloques se ven bien sin configurar (defaults sensatos); un dueño no técnico no puede dejarlo feo.
5. **Anti-reflejo.** Rechazar activamente los reflejos IA/SaaS saturados. Si parece generado por IA sin duda, está mal.

## Accessibility & Inclusion

WCAG **AA**: texto de cuerpo ≥4.5:1, texto grande ≥3:1, foco visible en todo interactivo, navegación por teclado. Toda animación con alternativa `prefers-reduced-motion`. Imágenes con `alt` gestionable por el dueño.
