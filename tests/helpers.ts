import type { Tenant } from '@/lib/supabase/types'

// Tenant mínimo válido para tests. Sobreescribir campos con overrides.
export function makeTenant(overrides: Partial<Tenant> = {}): Tenant {
  return {
    id: '00000000-0000-0000-0000-000000000001',
    slug: 'demo',
    domain: null,
    name: 'Demo',
    plan: 'tier_1',
    status: 'active',
    owner_user_id: null,
    config: {
      branding: { primaryColor: '#000000', secondaryColor: '#ffffff' },
      contact: {},
      seo: { title: 'Demo', description: 'Demo' },
    },
    ai_config: {
      businessName: 'Demo',
      tone: 'neutro',
      services: [],
      faqs: [],
      handoffRules: [],
    },
    created_at: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}
