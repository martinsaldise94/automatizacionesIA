import { describe, expect, it } from 'vitest'
import {
  MAX_POST_BYTES,
  nextPublishedAt,
  normalizePostSlug,
  slugFromTitle,
  validatePostInput,
} from '@/lib/posts'

describe('slugFromTitle', () => {
  it('pasa a minúsculas y une con guiones', () => {
    expect(slugFromTitle('Cinco ejercicios en casa')).toBe('cinco-ejercicios-en-casa')
  })

  it('quita tildes y eñes', () => {
    expect(slugFromTitle('Ñandú y Cigüeña')).toBe('nandu-y-ciguena')
  })

  it('descarta signos e interrogaciones', () => {
    expect(slugFromTitle('¿Cuándo ir al fisio?')).toBe('cuando-ir-al-fisio')
  })

  it('colapsa espacios y guiones repetidos', () => {
    expect(slugFromTitle('  Hola   ---  Mundo  ')).toBe('hola-mundo')
  })

  it('devuelve cadena vacía si no queda nada utilizable', () => {
    expect(slugFromTitle('¿¡!?')).toBe('')
  })
})

describe('normalizePostSlug', () => {
  it('acepta un slug ya correcto', () => {
    expect(normalizePostSlug('mi-primer-post')).toEqual({ ok: true, slug: 'mi-primer-post' })
  })

  it('normaliza en vez de rechazar lo que el dueño escriba a mano', () => {
    // El dueño no es técnico: arreglar es mejor que darle un error.
    expect(normalizePostSlug('Mi Primer Post')).toEqual({ ok: true, slug: 'mi-primer-post' })
  })

  it('quita las barras sobrantes', () => {
    expect(normalizePostSlug('/mi-post/')).toEqual({ ok: true, slug: 'mi-post' })
  })

  it('falla si queda vacío', () => {
    const res = normalizePostSlug('¿¡!?')
    expect(res.ok).toBe(false)
  })

  it('falla si es demasiado largo', () => {
    const res = normalizePostSlug('a'.repeat(250))
    expect(res.ok).toBe(false)
  })
})

describe('nextPublishedAt', () => {
  const ahora = '2026-08-14T12:00:00.000Z'
  const antes = '2026-01-02T09:00:00.000Z'

  it('fija la fecha al publicar por primera vez', () => {
    expect(nextPublishedAt(null, 'published', ahora)).toBe(ahora)
  })

  it('NO pisa la fecha original al re-publicar', () => {
    // Editar un post ya publicado no debe moverlo al principio del blog.
    expect(nextPublishedAt(antes, 'published', ahora)).toBe(antes)
  })

  it('conserva la fecha al pasar a borrador', () => {
    // Despublicar para corregir una errata y volver a publicar debe mantener
    // la fecha original, no saltar a hoy.
    expect(nextPublishedAt(antes, 'draft', ahora)).toBe(antes)
  })

  it('un borrador que nunca se publicó sigue sin fecha', () => {
    expect(nextPublishedAt(null, 'draft', ahora)).toBeNull()
  })
})

describe('validatePostInput', () => {
  const base = {
    title: 'Un título',
    slug: 'un-titulo',
    excerpt: '',
    coverUrl: '',
    content: 'Cuerpo del post',
    status: 'draft',
  }

  it('acepta una entrada válida', () => {
    const res = validatePostInput(base)
    expect(res.ok).toBe(true)
    if (res.ok) expect(res.data.slug).toBe('un-titulo')
  })

  it('convierte excerpt y coverUrl vacíos en null', () => {
    const res = validatePostInput(base)
    expect(res.ok).toBe(true)
    if (res.ok) {
      expect(res.data.excerpt).toBeNull()
      expect(res.data.coverUrl).toBeNull()
    }
  })

  it('exige título', () => {
    const res = validatePostInput({ ...base, title: '   ' })
    expect(res.ok).toBe(false)
  })

  it('deriva el slug del título si viene vacío', () => {
    const res = validatePostInput({ ...base, slug: '', title: '¿Cuándo ir al fisio?' })
    expect(res.ok).toBe(true)
    if (res.ok) expect(res.data.slug).toBe('cuando-ir-al-fisio')
  })

  it('rechaza un status desconocido', () => {
    const res = validatePostInput({ ...base, status: 'archivado' })
    expect(res.ok).toBe(false)
  })

  it('permite guardar un borrador vacío', () => {
    const res = validatePostInput({ ...base, content: '', status: 'draft' })
    expect(res.ok).toBe(true)
  })

  it('NO permite publicar un post sin contenido', () => {
    const res = validatePostInput({ ...base, content: '   ', status: 'published' })
    expect(res.ok).toBe(false)
  })

  it('rechaza contenido por encima del límite', () => {
    const res = validatePostInput({ ...base, content: 'a'.repeat(MAX_POST_BYTES + 1) })
    expect(res.ok).toBe(false)
  })

  it('mide bytes reales, no caracteres', () => {
    // 'é' son 2 bytes en UTF-8: la mitad de caracteres ya pasa del límite.
    const res = validatePostInput({ ...base, content: 'é'.repeat(MAX_POST_BYTES / 2 + 1) })
    expect(res.ok).toBe(false)
  })

  it('acepta portada http(s) y ruta relativa', () => {
    for (const url of ['https://cdn.ej.com/a.jpg', 'http://cdn.ej.com/a.jpg', '/img/a.jpg']) {
      expect(validatePostInput({ ...base, coverUrl: url }).ok).toBe(true)
    }
  })

  it('rechaza una portada con esquema peligroso', () => {
    // Acabaría en el src de un <img> y en el og:image.
    for (const url of ['javascript:alert(1)', 'data:text/html;base64,x', 'vbscript:x']) {
      expect(validatePostInput({ ...base, coverUrl: url }).ok).toBe(false)
    }
  })

  it('rechaza lo que no es un objeto', () => {
    expect(validatePostInput(null).ok).toBe(false)
    expect(validatePostInput('texto').ok).toBe(false)
  })
})
