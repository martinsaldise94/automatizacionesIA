import { describe, expect, it } from 'vitest'
import { formatPostDate, postExcerpt, postMetadata, stripMarkdown } from '@/lib/blog'
import type { Tenant } from '@/lib/supabase/types'

const tenant = {
  id: 't1',
  name: 'Clínica Demo',
  slug: 'demo-clinica',
  domain: null,
  plan: 'tier_1',
  status: 'active',
  config: { seo: { title: 'Clínica Demo — Fisioterapia', description: 'Fisioterapia en Madrid.' } },
} as unknown as Tenant

describe('formatPostDate', () => {
  it('formatea en español largo', () => {
    expect(formatPostDate('2026-08-14T10:30:00Z')).toBe('14 de agosto de 2026')
  })

  it('no depende de la hora local (fija UTC)', () => {
    // 23:30 UTC no debe adelantar al día siguiente ni retroceder al anterior.
    expect(formatPostDate('2026-01-01T23:30:00Z')).toBe('1 de enero de 2026')
  })

  it('devuelve null si no hay fecha', () => {
    expect(formatPostDate(null)).toBeNull()
  })

  it('devuelve null si la fecha es inválida', () => {
    expect(formatPostDate('no-es-una-fecha')).toBeNull()
  })
})

describe('stripMarkdown', () => {
  it('quita encabezados y énfasis', () => {
    expect(stripMarkdown('# Título\n\nTexto **fuerte** y _suave_.')).toBe('Título Texto fuerte y suave.')
  })

  it('deja el texto del enlace y descarta la URL', () => {
    expect(stripMarkdown('Ver [nuestra guía](https://ejemplo.com/guia) ahora')).toBe(
      'Ver nuestra guía ahora',
    )
  })

  it('elimina imágenes por completo', () => {
    expect(stripMarkdown('![foto de la clínica](/img/clinica.jpg) Bienvenido')).toBe('Bienvenido')
  })

  it('elimina bloques de código enteros', () => {
    expect(stripMarkdown('Antes\n\n```js\nconst x = 1\n```\n\nDespués')).toBe('Antes Después')
  })

  it('quita marcadores de lista, cita y regla horizontal', () => {
    expect(stripMarkdown('> Cita\n\n- uno\n- dos\n\n---\n\n1. tres')).toBe('Cita uno dos tres')
  })

  it('quita el código en línea pero conserva su contenido', () => {
    expect(stripMarkdown('Usa `npm run dev` para arrancar')).toBe('Usa npm run dev para arrancar')
  })

  it('colapsa espacios y saltos de línea', () => {
    expect(stripMarkdown('Uno\n\n\nDos   tres')).toBe('Uno Dos tres')
  })
})

describe('postExcerpt', () => {
  it('prefiere el excerpt explícito del post', () => {
    const out = postExcerpt({ excerpt: 'Resumen a mano', content: '# Otra cosa' })
    expect(out).toBe('Resumen a mano')
  })

  it('ignora un excerpt en blanco y cae al contenido', () => {
    const out = postExcerpt({ excerpt: '   ', content: 'Cuerpo del post' })
    expect(out).toBe('Cuerpo del post')
  })

  it('deriva del contenido limpiando el markdown', () => {
    const out = postExcerpt({ excerpt: null, content: '## Cabecera\n\nUn **párrafo** normal.' })
    expect(out).toBe('Cabecera Un párrafo normal.')
  })

  it('trunca por palabra completa y añade puntos suspensivos', () => {
    const content = 'palabra '.repeat(40).trim()
    const out = postExcerpt({ excerpt: null, content }, 40)
    expect(out.length).toBeLessThanOrEqual(41) // 40 + '…'
    expect(out.endsWith('…')).toBe(true)
    expect(out).not.toContain('palabr…') // no parte una palabra por la mitad
  })

  it('no trunca si cabe entero', () => {
    const out = postExcerpt({ excerpt: null, content: 'Corto' }, 40)
    expect(out).toBe('Corto')
  })

  it('devuelve cadena vacía si no hay ni excerpt ni contenido', () => {
    expect(postExcerpt({ excerpt: null, content: '' })).toBe('')
  })
})

describe('postMetadata', () => {
  it('antepone el título del post al título base del sitio', () => {
    const md = postMetadata(tenant, { title: 'Cómo aliviar la lumbalgia', excerpt: null, content: 'Texto', coverUrl: null })
    expect(md.title).toBe('Cómo aliviar la lumbalgia | Clínica Demo — Fisioterapia')
  })

  it('cae al nombre del negocio si no hay seo.title', () => {
    const sin = { ...tenant, config: {} } as unknown as Tenant
    const md = postMetadata(sin, { title: 'Post', excerpt: null, content: '', coverUrl: null })
    expect(md.title).toBe('Post | Clínica Demo')
  })

  it('usa el excerpt del post como description, no el del tenant', () => {
    const md = postMetadata(tenant, {
      title: 'Post',
      excerpt: 'Resumen del post',
      content: '',
      coverUrl: null,
    })
    expect(md.description).toBe('Resumen del post')
    expect(md.openGraph?.description).toBe('Resumen del post')
  })

  it('marca el openGraph como article e incluye la portada si existe', () => {
    const md = postMetadata(tenant, {
      title: 'Post',
      excerpt: null,
      content: 'Texto',
      coverUrl: 'https://cdn.ejemplo.com/portada.jpg',
    })
    expect(md.openGraph).toMatchObject({
      type: 'article',
      images: ['https://cdn.ejemplo.com/portada.jpg'],
    })
  })

  it('omite images cuando no hay portada', () => {
    const md = postMetadata(tenant, { title: 'Post', excerpt: null, content: 'Texto', coverUrl: null })
    expect(md.openGraph && 'images' in md.openGraph).toBe(false)
  })
})
