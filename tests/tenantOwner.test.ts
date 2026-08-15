import { beforeEach, describe, expect, it, vi } from 'vitest'

// ─── Estado mutable del mock ───────────────────────────────────────────────────

const m = vi.hoisted(() => ({
  isAdminResult: true,
  ownerUserId: null as string | null,   // tenants.owner_user_id leído de la DB
  linkUpdateError: null as { message: string } | null,
  inviteError: null as { message: string } | null,
  metaError: null as { message: string } | null,
  updateUserError: null as { message: string } | null,
  // espías
  inviteCalls: [] as string[],
  updateUserCalls: [] as Array<{ id: string; attrs: Record<string, unknown> }>,
  linkUpdates: [] as Array<Record<string, unknown>>,
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: {
      getUser: async () => ({ data: { user: { app_metadata: { role: 'admin' } } } }),
      // Sesión ya elevada a aal2: estos tests van del comportamiento de las
      // actions, no del segundo factor (que tiene los suyos en mfa.test.ts).
      mfa: {
        getAuthenticatorAssuranceLevel: async () => ({
          data: { currentLevel: 'aal2', nextLevel: 'aal2' },
        }),
      },
    },
  }),
}))

vi.mock('@/lib/admin', () => ({
  isAdmin: () => m.isAdminResult,
}))

vi.mock('@/lib/supabase/service', () => ({
  createServiceClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          single: async () => ({ data: { owner_user_id: m.ownerUserId }, error: null }),
        }),
      }),
      update: (vals: Record<string, unknown>) => {
        m.linkUpdates.push(vals)
        return { eq: async () => ({ error: m.linkUpdateError }) }
      },
    }),
    auth: {
      admin: {
        inviteUserByEmail: async (email: string) => {
          m.inviteCalls.push(email)
          return { data: { user: { id: 'new-user-id' } }, error: m.inviteError }
        },
        updateUserById: async (id: string, attrs: Record<string, unknown>) => {
          m.updateUserCalls.push({ id, attrs })
          return { error: id && attrs.email ? m.updateUserError : m.metaError }
        },
      },
    },
  }),
}))

vi.mock('next/navigation', () => ({
  redirect: vi.fn((url: string) => { throw new Error(`NEXT_REDIRECT:${url}`) }),
}))

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

import { inviteOwner, changeOwnerEmail } from '@/app/admin/tenants/[id]/actions'

const ID = 'tenant-uuid-123'

function fd(fields: Record<string, string>): FormData {
  const f = new FormData()
  for (const [k, v] of Object.entries(fields)) f.append(k, v)
  return f
}

const ok  = () => `NEXT_REDIRECT:/admin/tenants/${ID}?ok=1`
const err = (msg: string) => `NEXT_REDIRECT:/admin/tenants/${ID}?error=${encodeURIComponent(msg)}`

function reset() {
  m.isAdminResult = true
  m.ownerUserId = null
  m.linkUpdateError = null
  m.inviteError = null
  m.metaError = null
  m.updateUserError = null
  m.inviteCalls = []
  m.updateUserCalls = []
  m.linkUpdates = []
}

// ─── inviteOwner ───────────────────────────────────────────────────────────────

describe('inviteOwner', () => {
  beforeEach(reset)

  it('invita, fija app_metadata y enlaza owner_user_id', async () => {
    await expect(inviteOwner(ID, fd({ email: 'Dueño@Mail.com' }))).rejects.toThrow(ok())
    // email normalizado a minúsculas
    expect(m.inviteCalls).toEqual(['dueño@mail.com'])
    // app_metadata = fuente de verdad para RLS
    expect(m.updateUserCalls[0]).toEqual({
      id: 'new-user-id',
      attrs: { app_metadata: { tenant_id: ID, role: 'owner' } },
    })
    // owner_user_id enlazado en el tenant
    expect(m.linkUpdates).toContainEqual({ owner_user_id: 'new-user-id' })
  })

  it('rechaza email vacío', async () => {
    await expect(inviteOwner(ID, fd({ email: '' }))).rejects.toThrow(err('El email es obligatorio'))
    expect(m.inviteCalls).toHaveLength(0)
  })

  it('no invita un segundo dueño si ya hay uno', async () => {
    m.ownerUserId = 'existing-owner'
    await expect(inviteOwner(ID, fd({ email: 'otro@mail.com' })))
      .rejects.toThrow(err('Este tenant ya tiene dueño. Cambia su email en vez de invitar a otro.'))
    expect(m.inviteCalls).toHaveLength(0)
  })

  it('redirige a login si no es admin', async () => {
    m.isAdminResult = false
    await expect(inviteOwner(ID, fd({ email: 'x@mail.com' }))).rejects.toThrow('NEXT_REDIRECT:/admin/login')
  })

  it('propaga error de invitación', async () => {
    m.inviteError = { message: 'invite fallida' }
    await expect(inviteOwner(ID, fd({ email: 'x@mail.com' }))).rejects.toThrow(err('invite fallida'))
  })

  it('propaga error al enlazar owner_user_id', async () => {
    m.linkUpdateError = { message: 'link fallido' }
    await expect(inviteOwner(ID, fd({ email: 'x@mail.com' }))).rejects.toThrow(err('link fallido'))
  })
})

// ─── changeOwnerEmail ───────────────────────────────────────────────────────────

describe('changeOwnerEmail', () => {
  beforeEach(reset)

  it('cambia el email del dueño leído de la DB (no del form)', async () => {
    m.ownerUserId = 'real-owner-id'
    // se incluye un userId manipulado en el form: debe IGNORARSE
    await expect(
      changeOwnerEmail(ID, fd({ email: 'Nuevo@Mail.com', userId: 'atacante-id' }))
    ).rejects.toThrow(ok())
    expect(m.updateUserCalls[0]).toEqual({ id: 'real-owner-id', attrs: { email: 'nuevo@mail.com' } })
  })

  it('rechaza email vacío', async () => {
    m.ownerUserId = 'real-owner-id'
    await expect(changeOwnerEmail(ID, fd({ email: '' }))).rejects.toThrow(err('El nuevo email es obligatorio'))
    expect(m.updateUserCalls).toHaveLength(0)
  })

  it('rechaza si el tenant no tiene dueño', async () => {
    m.ownerUserId = null
    await expect(changeOwnerEmail(ID, fd({ email: 'x@mail.com' })))
      .rejects.toThrow(err('Este tenant no tiene dueño asignado'))
    expect(m.updateUserCalls).toHaveLength(0)
  })

  it('redirige a login si no es admin', async () => {
    m.isAdminResult = false
    await expect(changeOwnerEmail(ID, fd({ email: 'x@mail.com' }))).rejects.toThrow('NEXT_REDIRECT:/admin/login')
  })

  it('propaga error de updateUserById', async () => {
    m.ownerUserId = 'real-owner-id'
    m.updateUserError = { message: 'no se pudo' }
    await expect(changeOwnerEmail(ID, fd({ email: 'x@mail.com' }))).rejects.toThrow(err('no se pudo'))
  })
})
