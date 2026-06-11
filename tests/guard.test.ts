import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Tenant } from '@/lib/supabase/types'
import { makeTenant } from './helpers'

const state = vi.hoisted(() => ({
  tenant: null as Tenant | null,
}))

vi.mock('@/lib/tenant', () => ({
  resolveTenant: async () => state.tenant,
}))

// En Next.js real, notFound() y redirect() lanzan excepciones especiales.
// Aquí las simulamos con errores identificables.
vi.mock('next/navigation', () => ({
  notFound: vi.fn(() => {
    throw new Error('NEXT_NOT_FOUND')
  }),
  redirect: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`)
  }),
}))

import { requireFeature, requireTenant } from '@/lib/guard'

describe('requireFeature', () => {
  beforeEach(() => {
    state.tenant = null
  })

  it('devuelve el tenant si tiene la feature', async () => {
    state.tenant = makeTenant({ plan: 'tier_2' })
    const tenant = await requireFeature('demo', 'bookings')
    expect(tenant.slug).toBe('demo')
  })

  it('lanza notFound si el tenant no existe', async () => {
    await expect(requireFeature('no-existe', 'bookings')).rejects.toThrow('NEXT_NOT_FOUND')
  })

  it('lanza redirect si el tenant no tiene la feature', async () => {
    state.tenant = makeTenant({ plan: 'tier_1' })
    await expect(requireFeature('demo', 'bookings')).rejects.toThrow('NEXT_REDIRECT:/')
  })
})

describe('requireTenant', () => {
  beforeEach(() => {
    state.tenant = null
  })

  it('devuelve el tenant si existe', async () => {
    state.tenant = makeTenant()
    const tenant = await requireTenant('demo')
    expect(tenant.slug).toBe('demo')
  })

  it('lanza notFound si no existe', async () => {
    await expect(requireTenant('no-existe')).rejects.toThrow('NEXT_NOT_FOUND')
  })
})
