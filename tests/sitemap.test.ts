import { describe, expect, it } from 'vitest'
import { absUrl, buildSitemapPaths, buildSitemapXml, buildRobotsTxt } from '@/lib/sitemap'

describe('absUrl', () => {
  it('une origin y path sin dobles barras', () => {
    expect(absUrl('https://x.com', '/servicios')).toBe('https://x.com/servicios')
    expect(absUrl('https://x.com/', '/servicios')).toBe('https://x.com/servicios')
    expect(absUrl('https://x.com', '/')).toBe('https://x.com')
  })
})

describe('buildSitemapXml', () => {
  it('lista todas las URLs absolutas', () => {
    const xml = buildSitemapXml('https://x.com', ['/', '/servicios'])
    expect(xml).toContain('<loc>https://x.com</loc>')
    expect(xml).toContain('<loc>https://x.com/servicios</loc>')
    expect(xml).toContain('<?xml')
    expect(xml).toContain('urlset')
  })

  it('escapa caracteres XML en la URL', () => {
    const xml = buildSitemapXml('https://x.com', ['/a&b'])
    expect(xml).toContain('/a&amp;b')
    expect(xml).not.toContain('/a&b</loc>')
  })
})

describe('buildSitemapPaths', () => {
  it('sin posts publicados no anuncia el índice del blog', () => {
    // Anunciar /blog cuando aún no existe la ruta (o está vacía) mete 404s en
    // el sitemap, que es peor que no listarlo.
    expect(buildSitemapPaths(['/', '/servicios'], [])).toEqual(['/', '/servicios'])
  })

  it('con posts publicados añade el índice y cada post', () => {
    expect(buildSitemapPaths(['/'], ['bienvenida', 'precios'])).toEqual([
      '/',
      '/blog',
      '/blog/bienvenida',
      '/blog/precios',
    ])
  })

  it('un tenant sin páginas publicadas ni posts no lista nada', () => {
    expect(buildSitemapPaths([], [])).toEqual([])
  })

  it('no muta los arrays que recibe', () => {
    const pages = ['/']
    buildSitemapPaths(pages, ['x'])
    expect(pages).toEqual(['/'])
  })
})

describe('buildRobotsTxt', () => {
  it('permite todo y apunta al sitemap', () => {
    const txt = buildRobotsTxt('https://x.com')
    expect(txt).toContain('User-agent: *')
    expect(txt).toContain('Allow: /')
    expect(txt).toContain('Sitemap: https://x.com/sitemap.xml')
  })
})
