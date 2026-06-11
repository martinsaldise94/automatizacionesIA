import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Tenant } from '@/lib/supabase/types'
import { makeTenant } from './helpers'

// Estado controlable del mock: qué devuelve la query por domain y por slug
const state = vi.hoisted(() => ({
  byDomain: null as Tenant | null,
  bySlug: null as Tenant | null,
}))

// Mock del cliente Supabase: replica la cadena .from().select().eq().eq().maybeSingle()
// La primera .eq() recibe la columna ('domain' o 'slug') y decide qué resultado devolver
vi.mock('@/lib/supabase/service', () => ({
  createServiceClient: () => ({
    from: () => ({
      select: () => ({
        eq: (column: string) => ({
          eq: () => ({
            maybeSingle: async () => ({
              data: column === 'domain' ? state.byDomain : state.bySlug,
              error: null,
            }),
          }),
        }),
      }),
    }),
  }),
}))

import { resolveTenant } from '@/lib/tenant'

describe('resolveTenant', () => {
  beforeEach(() => {
    state.byDomain = null
    state.bySlug = null
  })

  it('resuelve por domain primero', async () => {
    state.byDomain = makeTenant({ slug: 'casapepe', domain: 'casapepe.es' })
    state.bySlug = makeTenant({ slug: 'otro' })

    const tenant = await resolveTenant('casapepe.es')
    expect(tenant?.domain).toBe('casapepe.es')
  })

  it('cae a slug si no hay match por domain', async () => {
    state.bySlug = makeTenant({ slug: 'casapepe' })

    const tenant = await resolveTenant('casapepe')
    expect(tenant?.slug).toBe('casapepe')
  })

  it('devuelve null si no existe ni por domain ni por slug', async () => {
    const tenant = await resolveTenant('no-existe')
    expect(tenant).toBeNull()
  })
})
