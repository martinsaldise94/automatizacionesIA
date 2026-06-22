import { describe, expect, it } from 'vitest'
import {
  parseVideoUrl,
  validateVideoFile,
  looksLikeUploadedVideo,
  MAX_VIDEO_BYTES,
} from '@/lib/builder/video'

describe('parseVideoUrl — YouTube', () => {
  it('acepta watch?v=, youtu.be, embed, shorts y construye youtube-nocookie', () => {
    const expected = 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ'
    expect(parseVideoUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ')?.embedUrl).toBe(expected)
    expect(parseVideoUrl('https://youtu.be/dQw4w9WgXcQ')?.embedUrl).toBe(expected)
    expect(parseVideoUrl('https://www.youtube.com/embed/dQw4w9WgXcQ')?.embedUrl).toBe(expected)
    expect(parseVideoUrl('https://www.youtube.com/shorts/dQw4w9WgXcQ')?.embedUrl).toBe(expected)
    expect(parseVideoUrl('https://m.youtube.com/watch?v=dQw4w9WgXcQ')?.embedUrl).toBe(expected)
  })

  it('ignora parámetros extra y conserva solo el ID', () => {
    const r = parseVideoUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=42s&list=abc')
    expect(r).toEqual({
      provider: 'youtube',
      id: 'dQw4w9WgXcQ',
      embedUrl: 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ',
    })
  })

  it('rechaza IDs con formato inválido', () => {
    expect(parseVideoUrl('https://www.youtube.com/watch?v=short')).toBeNull()
    expect(parseVideoUrl('https://www.youtube.com/watch?v=way_too_long_id_here')).toBeNull()
    expect(parseVideoUrl('https://www.youtube.com/watch?v=')).toBeNull()
  })
})

describe('parseVideoUrl — Vimeo', () => {
  it('acepta vimeo.com/ID y player.vimeo.com/video/ID', () => {
    const expected = 'https://player.vimeo.com/video/123456789'
    expect(parseVideoUrl('https://vimeo.com/123456789')?.embedUrl).toBe(expected)
    expect(parseVideoUrl('https://player.vimeo.com/video/123456789')?.embedUrl).toBe(expected)
    expect(parseVideoUrl('https://vimeo.com/123456789/abcdef')?.embedUrl).toBe(expected)
  })

  it('rechaza paths de vimeo sin ID numérico', () => {
    expect(parseVideoUrl('https://vimeo.com/channels/staffpicks')).toBeNull()
    expect(parseVideoUrl('https://vimeo.com/')).toBeNull()
  })
})

describe('parseVideoUrl — entradas maliciosas o raras', () => {
  it('rechaza protocolos no http(s)', () => {
    expect(parseVideoUrl('javascript:alert(1)')).toBeNull()
    expect(parseVideoUrl('data:text/html,<script>alert(1)</script>')).toBeNull()
    expect(parseVideoUrl('file:///etc/passwd')).toBeNull()
  })

  it('rechaza hosts fuera del allowlist (incluido look-alike)', () => {
    expect(parseVideoUrl('https://evil.com/watch?v=dQw4w9WgXcQ')).toBeNull()
    expect(parseVideoUrl('https://youtube.com.evil.com/watch?v=dQw4w9WgXcQ')).toBeNull()
    expect(parseVideoUrl('https://notyoutube.com/watch?v=dQw4w9WgXcQ')).toBeNull()
  })

  it('rechaza código embed, HTML y basura', () => {
    expect(parseVideoUrl('<iframe src="https://evil.com"></iframe>')).toBeNull()
    expect(parseVideoUrl('not a url')).toBeNull()
    expect(parseVideoUrl('')).toBeNull()
  })
})

describe('validateVideoFile', () => {
  it('acepta mp4 y webm dentro del límite', () => {
    expect(validateVideoFile('video/mp4', 1_000_000)).toEqual({ ok: true })
    expect(validateVideoFile('video/webm', 1_000_000)).toEqual({ ok: true })
    expect(validateVideoFile('VIDEO/MP4', 1_000_000)).toEqual({ ok: true }) // case-insensitive
  })

  it('rechaza tipos no permitidos por MIME (no por extensión)', () => {
    expect(validateVideoFile('video/quicktime', 1_000_000)).toEqual({ ok: false, reason: 'tipo' })
    expect(validateVideoFile('application/octet-stream', 1_000_000)).toEqual({ ok: false, reason: 'tipo' })
    expect(validateVideoFile('text/html', 1_000_000)).toEqual({ ok: false, reason: 'tipo' })
  })

  it('rechaza tamaños fuera de rango', () => {
    expect(validateVideoFile('video/mp4', MAX_VIDEO_BYTES + 1)).toEqual({ ok: false, reason: 'tamano' })
    expect(validateVideoFile('video/mp4', 0)).toEqual({ ok: false, reason: 'tamano' })
    expect(validateVideoFile('video/mp4', -5)).toEqual({ ok: false, reason: 'tamano' })
  })
})

describe('looksLikeUploadedVideo', () => {
  it('acepta URLs que terminan en .mp4/.webm', () => {
    expect(looksLikeUploadedVideo('https://x.supabase.co/storage/v1/tenants/abc/clip.mp4')).toBe(true)
    expect(looksLikeUploadedVideo('https://x.supabase.co/clip.webm?token=xyz')).toBe(true)
  })

  it('rechaza otras extensiones o vacío', () => {
    expect(looksLikeUploadedVideo('https://x.supabase.co/clip.exe')).toBe(false)
    expect(looksLikeUploadedVideo('https://x.supabase.co/clip')).toBe(false)
    expect(looksLikeUploadedVideo('')).toBe(false)
  })
})
