import { describe, expect, it } from 'vitest'
import type { User } from '@supabase/supabase-js'
import { isAdmin } from '@/lib/admin'

function makeUser(appMetadata: Record<string, unknown>): User {
  return { app_metadata: appMetadata } as unknown as User
}

describe('isAdmin', () => {
  it('true si app_metadata.role es admin', () => {
    expect(isAdmin(makeUser({ role: 'admin' }))).toBe(true)
  })

  it('false con otro rol', () => {
    expect(isAdmin(makeUser({ role: 'portal_user' }))).toBe(false)
  })

  it('false sin rol en app_metadata', () => {
    expect(isAdmin(makeUser({}))).toBe(false)
  })

  it('false con user null', () => {
    expect(isAdmin(null)).toBe(false)
  })
})
