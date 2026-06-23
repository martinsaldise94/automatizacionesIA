import { describe, expect, it } from 'vitest'
import type { User } from '@supabase/supabase-js'
import { canAccessPortal } from '@/lib/guard'

const TENANT = 'tenant-123'

// Fabrica un User mínimo con el app_metadata indicado.
function user(appMetadata: Record<string, unknown>): User {
  return { id: 'u1', app_metadata: appMetadata, user_metadata: {} } as unknown as User
}

describe('canAccessPortal', () => {
  it('permite al dueño de ESE tenant', () => {
    expect(canAccessPortal(user({ role: 'owner', tenant_id: TENANT }), TENANT)).toBe(true)
  })

  it('bloquea al dueño de OTRO tenant', () => {
    expect(canAccessPortal(user({ role: 'owner', tenant_id: 'otro' }), TENANT)).toBe(false)
  })

  it('permite al admin de la plataforma (cualquier tenant)', () => {
    expect(canAccessPortal(user({ role: 'admin' }), TENANT)).toBe(true)
  })

  it('bloquea sin sesión', () => {
    expect(canAccessPortal(null, TENANT)).toBe(false)
  })

  it('bloquea si falta rol o tenant_id', () => {
    expect(canAccessPortal(user({}), TENANT)).toBe(false)
    expect(canAccessPortal(user({ role: 'owner' }), TENANT)).toBe(false)
    expect(canAccessPortal(user({ tenant_id: TENANT }), TENANT)).toBe(false)
  })

  it('no se deja engañar por user_metadata (solo app_metadata)', () => {
    const u = { id: 'u1', app_metadata: {}, user_metadata: { role: 'owner', tenant_id: TENANT } } as unknown as User
    expect(canAccessPortal(u, TENANT)).toBe(false)
  })
})
