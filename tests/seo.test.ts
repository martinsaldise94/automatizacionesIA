import { describe, expect, it } from 'vitest'
import { pageTitle, pageMetadata, localBusinessJsonLd } from '@/lib/seo'
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
