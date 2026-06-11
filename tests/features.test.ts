import { describe, expect, it } from 'vitest'
import { hasFeature } from '@/lib/features'
import { makeTenant } from './helpers'

describe('hasFeature', () => {
  it('tier_1 tiene web, agent y leads', () => {
    const tenant = makeTenant({ plan: 'tier_1' })
    expect(hasFeature(tenant, 'web')).toBe(true)
    expect(hasFeature(tenant, 'agent')).toBe(true)
    expect(hasFeature(tenant, 'leads')).toBe(true)
  })

  it('tier_1 NO tiene bookings ni crm', () => {
    const tenant = makeTenant({ plan: 'tier_1' })
    expect(hasFeature(tenant, 'bookings')).toBe(false)
    expect(hasFeature(tenant, 'crm')).toBe(false)
    expect(hasFeature(tenant, 'whatsapp')).toBe(false)
  })

  it('tier_2 añade bookings, reminders y forms', () => {
    const tenant = makeTenant({ plan: 'tier_2' })
    expect(hasFeature(tenant, 'bookings')).toBe(true)
    expect(hasFeature(tenant, 'reminders')).toBe(true)
    expect(hasFeature(tenant, 'forms')).toBe(true)
  })

  it('tier_2 NO tiene features de tier_3', () => {
    const tenant = makeTenant({ plan: 'tier_2' })
    expect(hasFeature(tenant, 'client_portal')).toBe(false)
    expect(hasFeature(tenant, 'crm')).toBe(false)
    expect(hasFeature(tenant, 'dashboard')).toBe(false)
    expect(hasFeature(tenant, 'whatsapp')).toBe(false)
  })

  it('tier_3 tiene todas las features', () => {
    const tenant = makeTenant({ plan: 'tier_3' })
    const all = [
      'web', 'agent', 'leads',
      'bookings', 'reminders', 'forms',
      'client_portal', 'crm', 'dashboard', 'whatsapp',
    ] as const
    for (const feature of all) {
      expect(hasFeature(tenant, feature)).toBe(true)
    }
  })

  it('tier_2 conserva todo lo de tier_1 (incremental)', () => {
    const tenant = makeTenant({ plan: 'tier_2' })
    expect(hasFeature(tenant, 'web')).toBe(true)
    expect(hasFeature(tenant, 'agent')).toBe(true)
    expect(hasFeature(tenant, 'leads')).toBe(true)
  })

  it('plan desconocido devuelve false, no rompe', () => {
    const tenant = makeTenant({ plan: 'tier_99' as never })
    expect(hasFeature(tenant, 'web')).toBe(false)
  })
})
