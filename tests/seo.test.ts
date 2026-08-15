import { describe, expect, it } from 'vitest'
import { pageTitle, pageMetadata, localBusinessJsonLd, jsonLdScript } from '@/lib/seo'
import type { Tenant } from '@/lib/supabase/types'

function tenant(overrides: Partial<Tenant> = {}): Tenant {
  return {
    id: 't1',
    slug: 'demo',
    domain: null,
    name: 'Casa Pepe',
    plan: 'tier_1',
    status: 'active',
    owner_user_id: null,
    created_at: '',
    config: {
      branding: { primaryColor: '#000000', secondaryColor: '#ffffff' },
      contact: {},
      seo: { title: 'Casa Pepe — Cocina de siempre', description: 'El mejor menú del día.' },
    },
    ai_config: {} as Tenant['ai_config'],
    ...overrides,
  } as Tenant
}

describe('pageTitle', () => {
  it('home usa el título base del sitio', () => {
    expect(pageTitle(tenant(), { title: 'Inicio' }, true)).toBe('Casa Pepe — Cocina de siempre')
  })
  it('otras páginas anteponen su título', () => {
    expect(pageTitle(tenant(), { title: 'Servicios' }, false)).toBe(
      'Servicios | Casa Pepe — Cocina de siempre',
    )
  })
  it('fallback al nombre si no hay seo.title', () => {
    const t = tenant({ config: { ...tenant().config, seo: { title: '', description: '' } } })
    expect(pageTitle(t, { title: 'X' }, true)).toBe('Casa Pepe')
  })
})

describe('pageMetadata', () => {
  it('incluye título, descripción y openGraph', () => {
    const m = pageMetadata(tenant(), { title: 'Inicio' }, true)
    expect(m.title).toBe('Casa Pepe — Cocina de siempre')
    expect(m.description).toBe('El mejor menú del día.')
    expect((m.openGraph as { type?: string })?.type).toBe('website')
  })
})

describe('localBusinessJsonLd', () => {
  it('genera LocalBusiness con los campos presentes', () => {
    const t = tenant({
      domain: 'casapepe.com',
      config: {
        ...tenant().config,
        contact: { phone: '600', email: 'a@b.c', address: 'Calle 1' },
      },
    })
    const ld = localBusinessJsonLd(t)!
    expect(ld['@type']).toBe('LocalBusiness')
    expect(ld.name).toBe('Casa Pepe')
    expect(ld.telephone).toBe('600')
    expect(ld.url).toBe('https://casapepe.com')
    expect((ld.address as { streetAddress: string }).streetAddress).toBe('Calle 1')
  })

  it('omite campos ausentes', () => {
    const ld = localBusinessJsonLd(tenant())!
    expect(ld.telephone).toBeUndefined()
    expect(ld.url).toBeUndefined()
  })
})

describe('jsonLdScript', () => {
  // El JSON-LD se inyecta con dangerouslySetInnerHTML dentro de un <script>.
  // JSON.stringify NO escapa '<' ni '/', así que un '</script>' en cualquier
  // campo de texto del tenant cierra la etiqueta y ejecuta lo que venga detrás.
  // Hoy esos campos los escribe el admin; con el autoservicio los escribirá el
  // cliente. Esto es la barrera.

  it('neutraliza un cierre de script en el nombre del negocio', () => {
    const t = tenant({ name: 'Casa Pepe</script><script>alert(1)</script>' })
    const html = jsonLdScript(localBusinessJsonLd(t)!)
    expect(html).not.toContain('</script>')
    expect(html).not.toContain('<script>')
  })

  it('neutraliza un cierre de script en la descripción SEO', () => {
    const t = tenant({
      config: { seo: { title: 'X', description: '</script><img src=x onerror=alert(1)>' } },
    } as Partial<Tenant>)
    const html = jsonLdScript(localBusinessJsonLd(t)!)
    expect(html).not.toContain('</script>')
    expect(html).not.toContain('<img')
  })

  it('escapa todo < y > venga de donde venga', () => {
    const html = jsonLdScript({ a: '<>', b: ['<b>'] })
    expect(html).not.toMatch(/[<>]/)
  })

  it('sigue siendo JSON válido y con los mismos datos tras escapar', () => {
    const original = { '@type': 'LocalBusiness', name: 'Casa </script> Pepe', n: 3 }
    const parsed = JSON.parse(jsonLdScript(original))
    expect(parsed).toEqual(original)
  })
})
