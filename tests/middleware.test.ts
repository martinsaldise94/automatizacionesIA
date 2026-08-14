import { beforeAll, describe, expect, it } from 'vitest'
import { NextRequest } from 'next/server'

// El middleware lee NEXT_PUBLIC_APP_URL al cargar el módulo → fijar env ANTES de importar
process.env.NEXT_PUBLIC_APP_URL = 'https://miagencia.com'

let middleware: (req: NextRequest) => Response

beforeAll(async () => {
  const mod = await import('@/proxy')
  middleware = mod.proxy
})

// Construye una request con el header host correcto (fetch no lo añade solo)
function req(url: string): NextRequest {
  return new NextRequest(url, {
    headers: { host: new URL(url).host },
  })
}

// La URL de rewrite que el middleware deja en la respuesta
function rewriteUrl(res: Response): string | null {
  return res.headers.get('x-middleware-rewrite')
}

describe('middleware — subdominio de plataforma', () => {
  it('casapepe.miagencia.com/ reescribe a /casapepe', () => {
    const res = middleware(req('https://casapepe.miagencia.com/'))
    expect(rewriteUrl(res)).toContain('/casapepe')
  })

  it('conserva el path: /sobre → /casapepe/sobre', () => {
    const res = middleware(req('https://casapepe.miagencia.com/sobre'))
    expect(rewriteUrl(res)).toContain('/casapepe/sobre')
  })

  it('inyecta el header x-tenant upstream', () => {
    const res = middleware(req('https://casapepe.miagencia.com/'))
    expect(res.headers.get('x-middleware-request-x-tenant')).toBe('casapepe')
  })
})

describe('middleware — dominio raíz (la plataforma)', () => {
  it('miagencia.com pasa sin rewrite', () => {
    const res = middleware(req('https://miagencia.com/'))
    expect(rewriteUrl(res)).toBeNull()
  })

  it('www.miagencia.com pasa sin rewrite', () => {
    const res = middleware(req('https://www.miagencia.com/'))
    expect(rewriteUrl(res)).toBeNull()
  })
})

describe('middleware — dominio propio del tenant', () => {
  it('casapepe.es/ reescribe a /casapepe.es (resolución por domain)', () => {
    const res = middleware(req('https://casapepe.es/'))
    expect(rewriteUrl(res)).toContain('/casapepe.es')
  })

  it('pasa el host completo como x-tenant', () => {
    const res = middleware(req('https://casapepe.es/contacto'))
    expect(res.headers.get('x-middleware-request-x-tenant')).toBe('casapepe.es')
  })
})

describe('middleware — dev local', () => {
  it('casapepe.localhost:3000 reescribe a /casapepe', () => {
    const res = middleware(req('http://casapepe.localhost:3000/'))
    expect(rewriteUrl(res)).toContain('/casapepe')
  })
})

describe('middleware — anti-spoofing de headers', () => {
  it('sobrescribe un x-pathname falso enviado por el cliente', () => {
    const r = new NextRequest('https://miagencia.com/admin/tenants', {
      headers: { host: 'miagencia.com', 'x-pathname': '/admin/login' },
    })
    const res = middleware(r)
    expect(res.headers.get('x-middleware-request-x-pathname')).toBe('/admin/tenants')
  })

  it('elimina un x-tenant falso en el dominio raíz', () => {
    const r = new NextRequest('https://miagencia.com/', {
      headers: { host: 'miagencia.com', 'x-tenant': 'casapepe' },
    })
    const res = middleware(r)
    expect(res.headers.get('x-middleware-request-x-tenant')).toBeNull()
  })

  it('un x-tenant falso no puede pisar el real en subdominio', () => {
    const r = new NextRequest('https://casapepe.miagencia.com/', {
      headers: { host: 'casapepe.miagencia.com', 'x-tenant': 'otro' },
    })
    const res = middleware(r)
    expect(res.headers.get('x-middleware-request-x-tenant')).toBe('casapepe')
  })
})

describe('middleware — rutas excluidas', () => {
  it('/admin pasa sin tocar aunque venga de subdominio', () => {
    const res = middleware(req('https://casapepe.miagencia.com/admin/tenants'))
    expect(rewriteUrl(res)).toBeNull()
  })

  it('archivos estáticos pasan sin tocar', () => {
    const res = middleware(req('https://casapepe.miagencia.com/logo.svg'))
    expect(rewriteUrl(res)).toBeNull()
  })
})

// sitemap.xml y robots.txt son la excepción a "todo lo que lleva extensión pasa
// sin tocar": cada tenant tiene los suyos, así que deben reescribirse igual que
// una página. Si dejan de hacerlo, todos los tenants comparten (o pierden) su SEO.
describe('middleware — sitemap.xml y robots.txt por tenant', () => {
  it('/sitemap.xml reescribe a /casapepe/sitemap.xml', () => {
    const res = middleware(req('https://casapepe.miagencia.com/sitemap.xml'))
    expect(rewriteUrl(res)).toContain('/casapepe/sitemap.xml')
  })

  it('/robots.txt reescribe a /casapepe/robots.txt', () => {
    const res = middleware(req('https://casapepe.miagencia.com/robots.txt'))
    expect(rewriteUrl(res)).toContain('/casapepe/robots.txt')
  })

  it('inyecta x-tenant también en esas rutas', () => {
    const res = middleware(req('https://casapepe.miagencia.com/sitemap.xml'))
    expect(res.headers.get('x-middleware-request-x-tenant')).toBe('casapepe')
  })

  it('en dominio propio usa el host como identificador', () => {
    const res = middleware(req('https://casapepe.es/sitemap.xml'))
    expect(rewriteUrl(res)).toContain('/casapepe.es/sitemap.xml')
  })

  it('en el dominio raíz NO se reescriben (son de la plataforma)', () => {
    expect(rewriteUrl(middleware(req('https://miagencia.com/sitemap.xml')))).toBeNull()
    expect(rewriteUrl(middleware(req('https://miagencia.com/robots.txt')))).toBeNull()
  })

  it('la excepción es solo para esos dos: otros .xml/.txt siguen pasando sin tocar', () => {
    expect(rewriteUrl(middleware(req('https://casapepe.miagencia.com/feed.xml')))).toBeNull()
    expect(rewriteUrl(middleware(req('https://casapepe.miagencia.com/ads.txt')))).toBeNull()
    expect(
      rewriteUrl(middleware(req('https://casapepe.miagencia.com/blog/sitemap.xml'))),
    ).toBeNull()
  })
})
