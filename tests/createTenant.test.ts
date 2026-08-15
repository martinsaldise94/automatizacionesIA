import { beforeEach, describe, expect, it, vi } from 'vitest'

// Estado controlable del mock de Supabase
const db = vi.hoisted(() => ({
  existing: null as { id: string } | null,
  insertedId: 'new-uuid-123' as string | null,
  insertError: null as { message: string } | null,
  // Cuenta escrituras: sirve para probar que un no-admin ni siquiera llega a la DB.
  inserts: 0,
}))

// Sesión de admin controlable. `requireAdmin` real hace redirect('/admin/login');
// aquí se reproduce ese contrato para poder probar los dos lados.
const auth = vi.hoisted(() => ({ isAdmin: true }))

vi.mock('@/lib/admin-auth', () => ({
  requireAdmin: async () => {
    if (!auth.isAdmin) throw new Error('NEXT_REDIRECT:/admin/login')
  },
}))

vi.mock('@/lib/supabase/service', () => ({
  createServiceClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({ data: db.existing, error: null }),
        }),
      }),
      insert: () => {
        db.inserts += 1
        return {
          select: () => ({
            single: async () => ({
              data: db.insertedId ? { id: db.insertedId } : null,
              error: db.insertError,
            }),
          }),
        }
      },
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
    db.inserts = 0
    auth.isAdmin = true
  })

  // Esta action se publicó SIN guard: el guard del layout no protege una server
  // action, que es un endpoint POST propio. Ver tests/adminGuards.test.ts.
  it('rechaza a quien no es admin y no llega a escribir en la DB', async () => {
    auth.isAdmin = false

    await expect(
      createTenant(makeFormData({ slug: 'casa-pepe', name: 'Casa Pepe', plan: 'tier_1' }))
    ).rejects.toThrow('NEXT_REDIRECT:/admin/login')

    expect(db.inserts).toBe(0)
  })

  it('corta al no-admin antes de validar la entrada (no filtra si el slug existe)', async () => {
    auth.isAdmin = false
    db.existing = { id: 'otro-tenant' }

    // Si el guard fuese después de la validación, el mensaje de error revelaría
    // qué slugs están ocupados a cualquiera. Debe salir por /admin/login.
    await expect(
      createTenant(makeFormData({ slug: 'casa-pepe', name: 'Casa Pepe', plan: 'tier_1' }))
    ).rejects.toThrow('NEXT_REDIRECT:/admin/login')
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
