# Design

Sistema visual de los bloques del builder. Multi-tenant: el sistema define **estructura, escala y ritmo**; cada tenant inyecta **color y tipografía** vía tokens CSS. Ningún bloque hardcodea identidad.

## Theme

Light-first, limpio y profesional. Superficie sobria que cede el protagonismo al branding del tenant y al contenido. Sin modo oscuro por defecto (los negocios locales se presentan en claro); fondos `dark`/`brand` disponibles por bloque cuando el contenido lo pide.

## Color

Estrategia: **restrained** — neutros + el color de marca como acento que puede subir a superficie en bloques puntuales. Todo vía tokens en `app/globals.css`:

| Token | Uso |
|-------|-----|
| `--brand-primary` / `--brand-primary-fg` | color de marca y su texto legible encima (`bg-brand`, `text-brand-fg`) |
| `--brand-secondary` / `--brand-secondary-fg` | superficie secundaria de marca |
| `--brand-font` | tipografía de marca (`font-brand`) |
| `--background` / `--foreground` | neutros base |

Reglas: nunca un color hex en un bloque. Texto sobre fondo de marca usa `text-brand-fg` (con opacidad para jerarquía), nunca gris. Contraste verificado AA — el gris de cuerpo va al extremo tinta (`text-gray-600`+), no gris claro "elegante".

## Typography

- **Display / headings:** `font-brand` (la del tenant), escala de `components/ui/Heading.tsx`. Hero h1 hasta `text-6xl` (≤96px techo). `tracking-tight` (~-0.025em, nunca < -0.04em). `text-balance` en h1–h3.
- **Body:** sans del sistema (Geist), `Text.tsx`. Medida acotada a ~58–65ch. `leading-relaxed`.
- Sin emparejar dos sans parecidas: una familia de marca en pesos + la sans de cuerpo.

## Components

- **Primitivos** (`components/ui/`): `Section` (ritmo vertical + fondo), `Container` (medida y padding), `Heading`, `Text`, `Button` (variantes brand/outline/secondary/ghost, maneja `ctaType` whatsapp/booking/link). Todo por tokens.
- **Bloques** (`components/blocks/`): componen primitivos. Puros, reciben props, sirven igual en editor y web pública. Catálogo de 17 en `references/builder.md`.

## Layout

Móvil-primero. `Container` `max-w-6xl` (o `narrow` `max-w-3xl`). `Section` `py-16 md:py-24`. Splits asimétricos (no 50/50 genérico) en bloques con imagen. Grid para 2D, flex para 1D. Espaciado con ritmo variado, no uniforme.

## Motion

Intencional, no de relleno. `ease-out` (sin bounce/elastic). Micro-interacciones en CTAs (ej. flecha que avanza en hover). Toda animación con alternativa `prefers-reduced-motion`. Los reveals realzan un estado ya visible — nunca ocultan contenido tras una clase.

## Bans (heredados de impeccable + estos anti-references)

Side-stripe borders, gradient text, glassmorphism por defecto, hero-metric template, grids de cards idénticas, eyebrow tracked en mayúsculas sobre cada sección, marcadores numerados 01/02/03 de relleno, radios ≥24px en cards (tope 12–16px), `border 1px` + sombra difusa ≥16px en el mismo elemento, fondos de rayas, SVG dibujado a mano.
