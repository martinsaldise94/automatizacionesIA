import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { RichText } from '@/components/blocks/RichText'

function render(content: string): string {
  return renderToStaticMarkup(<RichText content={content} />)
}

describe('RichText — sanitizado', () => {
  it('escapa HTML crudo en vez de ejecutarlo (sin rehype-raw)', () => {
    const html = render('Hola <script>alert(1)</script> mundo')
    // El <script> NO debe aparecer como tag real…
    expect(html).not.toContain('<script>')
    expect(html).not.toContain('</script>')
    // …sino escapado como texto.
    expect(html).toContain('&lt;script&gt;')
  })

  it('no convierte HTML peligroso en un elemento vivo (<img onerror>)', () => {
    const html = render('Mira <img src=x onerror="alert(1)"> esto')
    // No hay un <img> REAL con onerror (escapado o descartado, ambos inertes).
    expect(html).not.toMatch(/<img[^>]*onerror/i)
    expect(html).not.toContain('<script')
  })

  it('neutraliza enlaces javascript:', () => {
    const html = render('[púlsame](javascript:alert(1))')
    expect(html).not.toContain('javascript:')
  })
})

describe('RichText — markdown válido', () => {
  it('renderiza encabezados (bajados un nivel), negrita y enlaces externos', () => {
    const html = render('# Título\n\nTexto **fuerte** y un [enlace](https://example.com).')
    expect(html).toContain('<h2') // # → h2 (la h1 es el Hero)
    expect(html).toContain('<strong')
    expect(html).toContain('href="https://example.com"')
    expect(html).toContain('target="_blank"')
  })

  it('aplica remark-gfm (tachado y tablas)', () => {
    expect(render('~~tachado~~')).toContain('<del>')
    const table = render('| A | B |\n| - | - |\n| 1 | 2 |')
    expect(table).toContain('<table')
    expect(table).toContain('<th')
  })
})
