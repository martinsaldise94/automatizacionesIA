// Lógica de seguridad del bloque Video.
//
// REGLA DE ORO (references/builder.md): nunca se acepta "código embed" del
// usuario. Solo recibimos una URL, la parseamos contra un allowlist de hosts,
// extraemos el ID y CONSTRUIMOS NOSOTROS la URL de embed. Un host no reconocido
// devuelve null → el bloque pinta un placeholder, nunca un iframe arbitrario.

export type VideoProvider = 'youtube' | 'vimeo'

export type ParsedVideo = {
  provider: VideoProvider
  id: string
  embedUrl: string
}

// IDs de YouTube: 11 chars de [A-Za-z0-9_-]. IDs de Vimeo: solo dígitos.
const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/
const VIMEO_ID = /^\d+$/

function youtubeEmbed(id: string): ParsedVideo {
  return { provider: 'youtube', id, embedUrl: `https://www.youtube-nocookie.com/embed/${id}` }
}

function vimeoEmbed(id: string): ParsedVideo {
  return { provider: 'vimeo', id, embedUrl: `https://player.vimeo.com/video/${id}` }
}

/**
 * Parsea una URL de YouTube o Vimeo a un embed seguro construido por nosotros.
 * Devuelve null si la URL es inválida, el host no está en el allowlist, el
 * protocolo no es http(s), o el ID no tiene el formato esperado.
 */
export function parseVideoUrl(raw: string): ParsedVideo | null {
  if (!raw || typeof raw !== 'string') return null

  let url: URL
  try {
    url = new URL(raw.trim())
  } catch {
    return null // no es una URL absoluta (incluye "javascript:..." sin //, basura, etc.)
  }

  // Solo http(s). Bloquea javascript:, data:, file:, etc.
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return null

  const host = url.hostname.replace(/^www\./, '').toLowerCase()

  // ── YouTube ──────────────────────────────────────────────────────────────
  if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'youtube-nocookie.com') {
    // watch?v=ID
    let id = url.searchParams.get('v') ?? ''
    // /embed/ID, /shorts/ID, /v/ID
    if (!id) {
      const m = url.pathname.match(/^\/(?:embed|shorts|v)\/([^/?#]+)/)
      if (m) id = m[1]
    }
    return YOUTUBE_ID.test(id) ? youtubeEmbed(id) : null
  }

  if (host === 'youtu.be') {
    const id = url.pathname.slice(1).split('/')[0]
    return YOUTUBE_ID.test(id) ? youtubeEmbed(id) : null
  }

  // ── Vimeo ────────────────────────────────────────────────────────────────
  if (host === 'vimeo.com') {
    // vimeo.com/123456789 (con o sin segmentos extra)
    const m = url.pathname.match(/^\/(\d+)(?:\/|$)/)
    return m && VIMEO_ID.test(m[1]) ? vimeoEmbed(m[1]) : null
  }

  if (host === 'player.vimeo.com') {
    const m = url.pathname.match(/^\/video\/(\d+)(?:\/|$)/)
    return m && VIMEO_ID.test(m[1]) ? vimeoEmbed(m[1]) : null
  }

  return null
}

// ── Validación de subida (source: 'upload') ──────────────────────────────────
// La UI de subida llega en el Paso 8, pero la lógica de validación vive aquí ya
// para poder testearla y reutilizarla en la API route del uploader.

export const ALLOWED_VIDEO_MIME = ['video/mp4', 'video/webm'] as const
export const ALLOWED_VIDEO_EXT = ['mp4', 'webm'] as const
export const MAX_VIDEO_BYTES = 50 * 1024 * 1024 // 50 MB (ajustable en Paso 8)

export type VideoFileError = 'tipo' | 'tamano'

/**
 * Valida un archivo de vídeo subido. El MIME se valida por su valor real
 * (lo aporta el servidor en el Paso 8), NUNCA por la extensión del nombre.
 */
export function validateVideoFile(
  mime: string,
  size: number,
): { ok: true } | { ok: false; reason: VideoFileError } {
  if (!(ALLOWED_VIDEO_MIME as readonly string[]).includes(mime?.toLowerCase?.() ?? '')) {
    return { ok: false, reason: 'tipo' }
  }
  if (!Number.isFinite(size) || size <= 0 || size > MAX_VIDEO_BYTES) {
    return { ok: false, reason: 'tamano' }
  }
  return { ok: true }
}

/**
 * Comprobación ligera de que una URL ya almacenada apunta a un archivo de vídeo
 * permitido (por extensión del path). Es defensa en profundidad para el render;
 * la validación fuerte (MIME server-side) ocurre al subir, en validateVideoFile.
 */
export function looksLikeUploadedVideo(raw: string): boolean {
  if (!raw) return false
  let pathname: string
  try {
    pathname = new URL(raw, 'https://example.com').pathname
  } catch {
    return false
  }
  const ext = pathname.split('.').pop()?.toLowerCase() ?? ''
  return (ALLOWED_VIDEO_EXT as readonly string[]).includes(ext)
}
