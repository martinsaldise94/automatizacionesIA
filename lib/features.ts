import type { Tenant } from './supabase/types'

export type Feature =
  | 'web'
  | 'agent'
  | 'leads'
  | 'builder'
  | 'blog'
  | 'bookings'
  | 'reminders'
  | 'forms'
  | 'client_portal'
  | 'crm'
  | 'dashboard'
  | 'whatsapp'

const TIER_1: Feature[] = ['web', 'agent', 'leads', 'builder', 'blog']
const TIER_2: Feature[] = [...TIER_1, 'bookings', 'reminders', 'forms']
const TIER_3: Feature[] = [...TIER_2, 'client_portal', 'crm', 'dashboard', 'whatsapp']

const TIER_FEATURES: Record<string, Feature[]> = {
  tier_1: TIER_1,
  tier_2: TIER_2,
  tier_3: TIER_3,
}

export function hasFeature(tenant: Tenant, feature: Feature): boolean {
  return TIER_FEATURES[tenant.plan]?.includes(feature) ?? false
}
