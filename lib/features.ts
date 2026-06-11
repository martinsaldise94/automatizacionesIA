import type { Tenant } from './supabase/types'

export type Feature =
  | 'web'
  | 'agent'
  | 'leads'
  | 'bookings'
  | 'reminders'
  | 'forms'
  | 'client_portal'
  | 'crm'
  | 'dashboard'
  | 'whatsapp'

const TIER_FEATURES: Record<string, Feature[]> = {
  tier_1: ['web', 'agent', 'leads'],
  tier_2: ['web', 'agent', 'leads', 'bookings', 'reminders', 'forms'],
  tier_3: ['web', 'agent', 'leads', 'bookings', 'reminders', 'forms', 'client_portal', 'crm', 'dashboard', 'whatsapp'],
}

export function hasFeature(tenant: Tenant, feature: Feature): boolean {
  return TIER_FEATURES[tenant.plan]?.includes(feature) ?? false
}
