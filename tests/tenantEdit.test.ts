import { beforeEach, describe, expect, it, vi } from 'vitest'

// ─── Mocks ───────────────────────────────────────────────────────────────────

const db = vi.hoisted(() => ({
  updateError: null as { message: string } | null,
  isAdminResult: true,
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: {
      getUser: async () => ({
        data: { user: { app_metadata: { role: 'admin' } } },
      }),
    },
  }),
}))

vi.mock('@/lib/admin', () => ({
  isAdmin: () => db.isAdminResult,
}))

vi.mock('@/lib/supabase/service', () => ({
  createServiceClient: () => ({
    from: () => ({
      update: () => ({
        eq: async () => ({ error: db.updateError }),
      }),
    }),
  }),
}))

vi.mock('next/navigation', () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`)
  }),
}))

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

import { updateBasic, updateConfig, updateAiConfig } from '@/app/admin/tenants/[id]/actions'

const ID = 'tenant-uuid-123'

function fd(fields: Record<string, string>): FormData {
  const f = new FormData()
  for (const [k, v] of Object.entries(fields)) f.append(k, v)
  return f
}

function ok() { return `NEXT_REDIRECT:/admin/tenants/${ID}?ok=1` }
function err(msg: string) {
  return `NEXT_REDIRECT:/admin/tenants/${ID}?error=${encodeURIComponent(msg)}`
}

// ─── updateBasic ─────────────────────────────────────────────────────────────

describe('updateBasic', () => {
  beforeEach(() => { db.updateError = null; db.isAdminResult = true })

  it('redirige a ?ok=1 al guardar correctamente', async () => {
    await expect(
      updateBasic(ID, fd({ name: 'Casa Pepe', domain: '', plan: 'tier_1', status: 'active' }))
    ).rejects.toThrow(ok())
  })

  it('rechaza si el nombre está vacío', async () => {
    await expect(
      updateBasic(ID, fd({ name: '', domain: '', plan: 'tier_1', status: 'active' }))
    ).rejects.toThrow(err('El nombre es obligatorio'))
  })

  it('rechaza plan inválido', async () => {
    await expect(
      updateBasic(ID, fd({ name: 'Casa Pepe', domain: '', plan: 'tier_99', status: 'active' }))
    ).rejects.toThrow(err('Plan inválido'))
  })

  it('rechaza estado inválido', async () => {
    await expect(
      updateBasic(ID, fd({ name: 'Casa Pepe', domain: '', plan: 'tier_1', status: 'borrado' }))
    ).rejects.toThrow(err('Estado inválido'))
  })

  it('redirige a login si no es admin', async () => {
    db.isAdminResult = false
    await expect(
      updateBasic(ID, fd({ name: 'Casa Pepe', domain: '', plan: 'tier_1', status: 'active' }))
    ).rejects.toThrow('NEXT_REDIRECT:/admin/login')
  })

  it('redirige con error si falla la DB', async () => {
    db.updateError = { message: 'DB error' }
    await expect(
      updateBasic(ID, fd({ name: 'Casa Pepe', domain: '', plan: 'tier_1', status: 'active' }))
    ).rejects.toThrow(err('DB error'))
  })
})

// ─── updateConfig ─────────────────────────────────────────────────────────────

describe('updateConfig', () => {
  const validConfig = {
    'branding.primaryColor': '#123456',
    'branding.secondaryColor': '#abcdef',
    'branding.logo': '',
    'branding.fontFamily': '',
    'contact.phone': '',
    'contact.whatsapp': '',
    'contact.email': '',
    'contact.address': '',
    'contact.hours': '',
    'seo.title': 'Mi Negocio',
    'seo.description': 'Descripción del negocio',
    'seo.keywords': 'Madrid, local',
  }

  beforeEach(() => { db.updateError = null; db.isAdminResult = true })

  it('redirige a ?ok=1 al guardar config válida', async () => {
    await expect(updateConfig(ID, fd(validConfig))).rejects.toThrow(ok())
  })

  it('rechaza color primario con formato incorrecto', async () => {
    await expect(
      updateConfig(ID, fd({ ...validConfig, 'branding.primaryColor': 'rojo' }))
    ).rejects.toThrow(err('Color primario inválido (usa #rrggbb)'))
  })

  it('rechaza si el título SEO está vacío', async () => {
    await expect(
      updateConfig(ID, fd({ ...validConfig, 'seo.title': '' }))
    ).rejects.toThrow(err('Título SEO obligatorio'))
  })

  it('rechaza si la descripción SEO está vacía', async () => {
    await expect(
      updateConfig(ID, fd({ ...validConfig, 'seo.description': '' }))
    ).rejects.toThrow(err('Descripción SEO obligatoria'))
  })

  it('parsea keywords separadas por coma como array', async () => {
    // Solo verificamos que no lanza error — el array se guarda en DB
    await expect(
      updateConfig(ID, fd({ ...validConfig, 'seo.keywords': 'a, b, c' }))
    ).rejects.toThrow(ok())
  })
})

// ─── updateAiConfig ───────────────────────────────────────────────────────────

describe('updateAiConfig', () => {
  const validAi = {
    businessName: 'Casa Pepe',
    tone: 'cercano',
    model: 'claude-haiku-4-5-20251001',
    services: 'Corte\nColoración',
    handoffRules: 'Si piden precio, derivar a WhatsApp',
    faqs: '[{"q":"¿Dónde estáis?","a":"Centro"}]',
  }

  beforeEach(() => { db.updateError = null; db.isAdminResult = true })

  it('redirige a ?ok=1 al guardar config IA válida', async () => {
    await expect(updateAiConfig(ID, fd(validAi))).rejects.toThrow(ok())
  })

  it('rechaza si businessName está vacío', async () => {
    await expect(
      updateAiConfig(ID, fd({ ...validAi, businessName: '' }))
    ).rejects.toThrow(err('Nombre del negocio obligatorio'))
  })

  it('rechaza FAQs con JSON inválido', async () => {
    await expect(
      updateAiConfig(ID, fd({ ...validAi, faqs: 'no es json' }))
    ).rejects.toThrow(/FAQs%3A/)
  })

  it('rechaza FAQs que no son array', async () => {
    await expect(
      updateAiConfig(ID, fd({ ...validAi, faqs: '{"q":"a","a":"b"}' }))
    ).rejects.toThrow(/FAQs%3A/)
  })

  it('acepta faqs vacío (sin FAQs)', async () => {
    await expect(
      updateAiConfig(ID, fd({ ...validAi, faqs: '' }))
    ).rejects.toThrow(ok())
  })

  it('parsea servicios separados por línea como array', async () => {
    await expect(
      updateAiConfig(ID, fd({ ...validAi, services: 'A\nB\nC' }))
    ).rejects.toThrow(ok())
  })
})
