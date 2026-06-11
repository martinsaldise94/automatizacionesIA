import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Tenant } from '@/lib/supabase/types'
import { makeTenant } from './helpers'

// Estado controlable del mock: filas que devuelve la query .or()
const state = vi.hoisted(() => ({
  rows: [] as Tenant[],
  queried: false,
}))

// Mock del cliente Supabase: replica la cadena .from().select().or().eq()
vi.mock('@/lib/supabase/service', () => ({
  createServiceClient: () => ({
    from: () => ({
      select: () => ({
        or: () => ({
          eq: async () => {
            state.queried = true
            return { data: state.rows, error: null }
          },
        }),
      }),
    }),
  }),
}))

import { resolveTenant } from '@/lib/tenant'

describe('resolveTenant', () => {
  beforeEach(() => {
    state.rows = []
    state.queried = false
  })

  it('resuelve por domain con preferencia sobre slug', async () => {
    state.rows = [
      makeTenant({ slug: 'casapepe-es', domain: null }), // ningún match real
      makeTenant({ slug: 'otro', domain: 'casapepe.es' }),
    ]

    const tenant = await resolveTenant('casapepe.es')
    expect(tenant?.domain).toBe('casapepe.es')
    expect(tenant?.slug).toBe('otro')
  })

  it('cae a slug si no hay match por domain', async () => {
    state.rows = [makeTenant({ slug: 'casapepe', domain: null })]

    const tenant = await resolveTenant('casapepe')
    expect(tenant?.slug).toBe('casapepe')
  })

  it('devuelve null si no existe ni por domain ni por slug', async () => {
    const tenant = await resolveTenant('no-existe')
    expect(tenant).toBeNull()
  })

  it('rechaza identificadores con caracteres inválidos sin tocar la DB', async () => {
    const tenant = await resolveTenant('mal,formado(eq.x)')
    expect(tenant).toBeNull()
    expect(state.queried).toBe(false)
  })
})
