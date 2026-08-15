import { z } from 'zod'

// Lógica pura del EDITOR de blog (portal del dueño): slugs, fecha de publicación
// y validación server-side del formulario. Sin DB ni runtime de Next → testeable.
//
// `lib/blog.ts` es la otra mitad: render público (fechas, resúmenes, SEO).

export type PostStatus = 'draft' | 'published'

// Límite del cuerpo en markdown. Defensa contra payloads enormes, igual que
// MAX_PUBLISHED_BYTES en el builder.
export const MAX_POST_BYTES = 256 * 1024 // 256 KB

const MAX_SLUG_LENGTH = 120

// Título → slug utilizable en la URL. Quita tildes/eñes vía descomposición
// Unicode (NFD) y borra todo lo que no sea alfanumérico o guion.
export function slugFromTitle(title: string): string {
  return (title ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // marcas diacríticas sueltas tras el NFD
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

export type PostSlugResult = { ok: true; slug: string } | { ok: false; error: string }

// El dueño del negocio no es técnico: ante un slug raro se NORMALIZA en vez de
// devolverle un error de formato (a diferencia de normalizePagePath, donde la
// ruta la escribe alguien que entiende lo que es una ruta).
export function normalizePostSlug(input: string): PostSlugResult {
  const slug = slugFromTitle(input)

  if (!slug) {
    return { ok: false, error: 'La dirección del post no puede quedar vacía.' }
  }
  if (slug.length > MAX_SLUG_LENGTH) {
    return { ok: false, error: 'La dirección del post es demasiado larga.' }
  }
  return { ok: true, slug }
}

// Fecha de publicación resultante tras guardar.
//
// Reglas: se fija la primera vez que se publica y NO se vuelve a tocar. Editar un
// post publicado no lo mueve al principio del blog, y despublicar para corregir
// una errata conserva la fecha original en vez de saltar a hoy.
export function nextPublishedAt(
  current: string | null,
  status: PostStatus,
  nowIso: string,
): string | null {
  if (status === 'published') return current ?? nowIso
  return current
}

// Esquemas peligrosos en la portada: acabaría en el `src` de un <img> y en el
// `og:image`. Solo http(s) absoluto o ruta relativa del propio sitio.
const SAFE_COVER = /^(https?:\/\/|\/)/i

const inputSchema = z.object({
  title: z.string(),
  slug: z.string().optional().default(''),
  excerpt: z.string().optional().default(''),
  coverUrl: z.string().optional().default(''),
  content: z.string().optional().default(''),
  status: z.enum(['draft', 'published']),
})

export type ValidPostInput = {
  title: string
  slug: string
  excerpt: string | null
  coverUrl: string | null
  content: string
  status: PostStatus
}

export type PostInputValidation =
  | { ok: true; data: ValidPostInput }
  | { ok: false; error: string }

// Validación server-side del formulario del editor. Es la barrera dura: la action
// nunca escribe en DB sin pasar por aquí.
export function validatePostInput(raw: unknown): PostInputValidation {
  const parsed = inputSchema.safeParse(raw)
  if (!parsed.success) {
    return { ok: false, error: 'Faltan datos del post o el estado no es válido.' }
  }

  const { title: rawTitle, slug: rawSlug, excerpt, coverUrl, content, status } = parsed.data

  const title = rawTitle.trim()
  if (!title) return { ok: false, error: 'Falta el título.' }

  // Slug vacío → se deriva del título, que es lo que espera quien solo escribe.
  const slugResult = normalizePostSlug(rawSlug.trim() || title)
  if (!slugResult.ok) return { ok: false, error: slugResult.error }

  // Bytes reales: el markdown lleva acentos y en UTF-8 no son un byte.
  if (Buffer.byteLength(content, 'utf8') > MAX_POST_BYTES) {
    return { ok: false, error: 'El post es demasiado largo.' }
  }

  // Un borrador vacío es legítimo (se empieza a escribir mañana); publicar vacío no.
  if (status === 'published' && !content.trim()) {
    return { ok: false, error: 'No puedes publicar un post sin contenido.' }
  }

  const cover = coverUrl.trim()
  if (cover && !SAFE_COVER.test(cover)) {
    return { ok: false, error: 'La portada debe ser una URL http(s) o una ruta del sitio.' }
  }

  return {
    ok: true,
    data: {
      title,
      slug: slugResult.slug,
      excerpt: excerpt.trim() || null,
      coverUrl: cover || null,
      content,
      status,
    },
  }
}
