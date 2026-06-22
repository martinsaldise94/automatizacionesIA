import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { buildTenantContext, EMPTY_TENANT_CONTEXT } from '@/lib/builder/tenant-context'
import { TenantProvider, useTenant } from '@/components/builder/TenantProvider'
import type { Tenant } from '@/lib/supabase/types'

const fakeTenant: Tenant = {
  id: 'id-1',
  slug: 'clinica-demo',
  domain: null,
  name: 'Clínica Demo',
  plan: 'tier_2',
  config: {
    branding: { primaryColor: '#1f5e57', secondaryColor: '#e9f1ef' },
    contact: { phone: '600123456', whatsapp: '34600123456', email: 'hola@demo.com', address: 'Calle Mayor 1', hours: 'L-V 9-18' },
    seo: { title: 'Clínica Demo', description: 'desc' },
  },
  ai_config: {
    businessName: 'PROMPT_SECRETO_NO_DEBE_FILTRARSE',
    tone: 'cercano',
    services: ['fisio'],
    faqs: [{ q: 'p', a: 'r' }],
    handoffRules: ['regla interna'],
    model: 'claude-haiku-4-5-20251001',
  },
  status: 'active',
  owner_user_id: null,
  created_at: '2026-01-01T00:00:00Z',
}

describe('buildTenantContext', () => {
  it('expone businessName (nombre) y contact', () => {
    const ctx = buildTenantContext(fakeTenant)
    expect(ctx.businessName).toBe('Clínica Demo')
    expect(ctx.contact.phone).toBe('600123456')
    expect(ctx.contact.address).toBe('Calle Mayor 1')
  })

  it('NUNCA filtra ai_config ni el resto del config', () => {
    const ctx = buildTenantContext(fakeTenant)
    const serialized = JSON.stringify(ctx)
    expect(serialized).not.toContain('PROMPT_SECRETO_NO_DEBE_FILTRARSE')
    expect(serialized).not.toContain('regla interna')
    expect(ctx).not.toHaveProperty('ai_config')
    expect(ctx).not.toHaveProperty('config')
    // Solo las dos claves esperadas.
    expect(Object.keys(ctx).sort()).toEqual(['businessName', 'contact'])
  })

  it('maneja contacto ausente sin romper', () => {
    const sinContacto = { ...fakeTenant, config: { ...fakeTenant.config, contact: undefined as never } }
    expect(buildTenantContext(sinContacto).contact).toEqual({})
  })
})

// Sonda: un consumidor mínimo del hook para validar el Context.
function Probe() {
  const { businessName, contact } = useTenant()
  return <span>{businessName || 'SIN_NOMBRE'}|{contact.phone || 'SIN_TEL'}</span>
}

describe('useTenant', () => {
  it('dentro del provider devuelve el valor', () => {
    const html = renderToStaticMarkup(
      <TenantProvider value={buildTenantContext(fakeTenant)}>
        <Probe />
      </TenantProvider>,
    )
    expect(html).toContain('Clínica Demo')
    expect(html).toContain('600123456')
  })

  it('sin provider devuelve el default vacío (no rompe)', () => {
    const html = renderToStaticMarkup(<Probe />)
    expect(html).toContain('SIN_NOMBRE')
    expect(html).toContain('SIN_TEL')
    expect(EMPTY_TENANT_CONTEXT.contact).toEqual({})
  })
})
