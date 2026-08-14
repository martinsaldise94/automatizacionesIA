// Normalización + validación del `path` de una página del builder.
//
// El path es la ruta pública de la página dentro del tenant (`/`, `/servicios`,
// `/sobre-nosotros/equipo`). Es unique por tenant (la colisión real la detecta
// la action contra DB; aquí solo se valida el FORMATO).
//
// Lógica pura, sin DB → testeable. Es la pieza que se rompe en silencio: un path
// con formato raro generaría rutas públicas inválidas o que chocan con rutas
// reservadas del sistema (portal, blog, api...).

export type PagePathResult = { ok: true; path: string } | { ok: false; error: string }

// Primer segmento prohibido: chocaría con rutas concretas del sistema, que
// siempre ganan al catch-all `[[...path]]` → la página quedaría inalcanzable.
const RESERVED_SEGMENTS = new Set([
  'auth',
  'builder',
  'blog',
  'api',
  'reservar',
  'dashboard',
  'admin',
])

const MAX_LENGTH = 200
// Cada segmento: slug minúsculo (sin guion al inicio/fin, sin dobles).
const SEGMENT = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

// Normaliza y valida. Devuelve el path canónico (siempre con `/` inicial, sin
// `/` final salvo la home) o un error legible para mostrar en el formulario.
export function normalizePagePath(input: string): PagePathResult {
  const trimmed = (input ?? '').trim().toLowerCase()

  // Vacío o solo barra = home.
  if (trimmed === '' || trimmed === '/') return { ok: true, path: '/' }

  if (trimmed.length > MAX_LENGTH) {
    return { ok: false, error: 'La ruta es demasiado larga.' }
  }

  // Trocear por `/` ignorando vacíos (colapsa `//` y barras inicial/final).
  const segments = trimmed.split('/').filter((s) => s.length > 0)
  if (segments.length === 0) return { ok: true, path: '/' }

  for (const seg of segments) {
    if (!SEGMENT.test(seg)) {
      return {
        ok: false,
        error: 'Usa solo minúsculas, números y guiones (ej. /sobre-nosotros).',
      }
    }
  }

  if (RESERVED_SEGMENTS.has(segments[0])) {
    return { ok: false, error: `"/${segments[0]}" es una ruta reservada del sistema.` }
  }

  return { ok: true, path: '/' + segments.join('/') }
}
