import { beforeEach, describe, expect, it, vi } from 'vitest'

// Estado controlable del mock de Supabase
const db = vi.hoisted(() => ({
  existing: null as { id: string } | null,
  insertedId: 'new-uuid-123' as string | null,
  insertError: null as { message: string } | null,
}))

vi.mock('@/lib/supabase/service', () => ({
  createServiceClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({ data: db.existing, error: null }),
        }),
      }),
      insert: () => ({
        select: () => ({
          single: async () => ({
            data: db.insertedId ? { id: db.insertedId } : null,
            error: db.insertError,
          }),
        }),
      }),
    }),
  }),
}))

vi.mock('next/navigation', () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`)
  }),
}))

import { createTenant } from '@/app/admin/tenants/new/actions'

function makeFormData(fields: Record<string, string>): FormData {
  const fd = new FormData()
  for (const [k, v] of Object.entries(fields)) fd.append(k, v)
  return fd
}

describe('createTenant', () => {
  beforeEach(() => {
    db.existing = null
    db.insertedId = 'new-uuid-123'
    db.insertError = null
  })

  it('redirige a /admin/tenants/[id] al crear con éxito', async () => {
    await expect(
      createTenant(makeFormData({ slug: 'casa-pepe', name: 'Casa Pepe', plan: 'tier_1' }))
    ).rejects.toThrow('NEXT_REDIRECT:/admin/tenants/new-uuid-123')
  })

  it('rechaza si el nombre está vacío', async () => {
    await expect(
      createTenant(makeFormData({ slug: 'casa-pepe', name: '', plan: 'tier_1' }))
    ).rejects.toThrow('NEXT_REDIRECT:/admin/tenants/new?error=El%20nombre%20es%20obligatorio')
  })

  it('rechaza slug reservado', async () => {
    await expect(
      createTenant(makeFormData({ slug: 'admin', name: 'Casa Pepe', plan: 'tier_1' }))
    ).rejects.toThrow('NEXT_REDIRECT:/admin/tenants/new?error=')
  })

  it('rechaza slug con formato inválido', async () => {
    await expect(
      createTenant(makeFormData({ slug: 'Casa Pepe!', name: 'Casa Pepe', plan: 'tier_1' }))
    ).rejects.toThrow('NEXT_REDIRECT:/admin/tenants/new?error=')
  })

  it('rechaza si el slug ya está en uso', async () => {
    db.existing = { id: 'otro-uuid' }
    await expect(
      createTenant(makeFormData({ slug: 'casa-pepe', name: 'Casa Pepe', plan: 'tier_1' }))
    ).rejects.toThrow('NEXT_REDIRECT:/admin/tenants/new?error=El%20slug%20ya%20est%C3%A1%20en%20uso')
  })

  it('rechaza plan inválido', async () => {
    await expect(
      createTenant(makeFormData({ slug: 'casa-pepe', name: 'Casa Pepe', plan: 'tier_99' }))
    ).rejects.toThrow('NEXT_REDIRECT:/admin/tenants/new?error=Plan%20inv%C3%A1lido')
  })

  it('redirige con error si falla la inserción en DB', async () => {
    db.insertedId = null
    db.insertError = { message: 'DB error' }
    await expect(
      createTenant(makeFormData({ slug: 'casa-pepe', name: 'Casa Pepe', plan: 'tier_1' }))
    ).rejects.toThrow('NEXT_REDIRECT:/admin/tenants/new?error=Error%20al%20crear%20el%20tenant')
  })

  it('normaliza el slug a minúsculas', async () => {
    await expect(
      createTenant(makeFormData({ slug: 'CASA-PEPE', name: 'Casa Pepe', plan: 'tier_1' }))
    ).rejects.toThrow('NEXT_REDIRECT:/admin/tenants/new-uuid-123')
  })
})
