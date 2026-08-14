import type { Metadata } from 'next'
import type { Tenant } from '@/lib/supabase/types'

// Lógica pura del blog público: fechas, resúmenes y SEO por post. Sin runtime de
// Next ni acceso a DB, para poder testearla. Las páginas solo la consumen.

export type PostLike = {
  excerpt: string | null
  content: string
}

// Fecha larga en español. Fija UTC a propósito: `published_at` es un instante y no
// queremos que el día mostrado baile según la zona horaria del servidor.
export function formatPostDate(iso: string | null): string | null {
  if (!iso) return null
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return null
  return new Intl.DateTimeFormat('es-ES', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date)
}

// Markdown → texto plano, para resúmenes y meta description. NO es un sanitizador
// de seguridad: el render seguro lo hace react-markdown (sin rehype-raw). Esto solo
// evita que asteriscos y corchetes se cuelen en un `<meta>`.
export function stripMarkdown(markdown: string): string {
  return markdown
    .replace(/```[\s\S]*?```/g, ' ') // bloques de código completos
    .replace(/`([^`]*)`/g, '$1') // código en línea: fuera las comillas, dentro el texto
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ') // imágenes: fuera enteras
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1') // enlaces: se queda el texto
    .replace(/^\s{0,3}(?:-{3,}|\*{3,}|_{3,})\s*$/gm, ' ') // reglas horizontales
    .replace(/^\s{0,3}#{1,6}\s+/gm, '') // encabezados
    .replace(/^\s{0,3}>\s?/gm, '') // citas
    .replace(/^\s{0,3}[-*+]\s+/gm, '') // listas sin orden
    .replace(/^\s{0,3}\d+\.\s+/gm, '') // listas ordenadas
    .replace(/(\*\*|__)(.*?)\1/g, '$2') // negrita
    .replace(/(\*|_)(.*?)\1/g, '$2') // cursiva
    .replace(/~~(.*?)~~/g, '$1') // tachado
    .replace(/\s+/g, ' ')
    .trim()
}

// Resumen del post: el que escribió el dueño si lo hay; si no, se deriva del cuerpo
// recortando por palabra completa.
export function postExcerpt(post: PostLike, maxLen = 160): string {
  const explicit = post.excerpt?.trim()
  if (explicit) return explicit

  const plain = stripMarkdown(post.content)
  if (plain.length <= maxLen) return plain

  const cut = plain.slice(0, maxLen)
  const lastSpace = cut.lastIndexOf(' ')
  const base = lastSpace > 0 ? cut.slice(0, lastSpace) : cut
  return `${base.replace(/[\s.,;:!?—-]+$/, '')}…`
}

// SEO de un post. A diferencia de las páginas (que heredan la description del
// tenant), un post describe su propio contenido: usa su excerpt.
export function postMetadata(
  tenant: Tenant,
  post: PostLike & { title: string; coverUrl: string | null },
): Metadata {
  const base = tenant.config?.seo?.title?.trim() || tenant.name
  const postTitle = post.title?.trim()
  const title = postTitle ? `${postTitle} | ${base}` : base
  const description = postExcerpt(post) || undefined

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'article',
      ...(post.coverUrl ? { images: [post.coverUrl] } : {}),
    },
  }
}
