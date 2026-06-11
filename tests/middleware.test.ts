import { beforeAll, describe, expect, it } from 'vitest'
import { NextRequest } from 'next/server'

// El middleware lee NEXT_PUBLIC_APP_URL al cargar el módulo → fijar env ANTES de importar
process.env.NEXT_PUBLIC_APP_URL = 'https://miagencia.com'

let middleware: (req: NextRequest) => Response

beforeAll(async () => {
  const mod = await import('@/middleware')
  middleware = mod.middleware
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
