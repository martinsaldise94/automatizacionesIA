import type { ContactConfig, Tenant } from '@/lib/supabase/types'

// Datos del tenant que los bloques pueden leer vía <TenantProvider> (Contact,
// Map, Testimonials...). NUNCA entran en las props ni en `published_data`, así
// que no son manipulables desde el JSON guardado.
export type TenantContext = {
  businessName: string
  contact: ContactConfig
}

// Default seguro: si un bloque lee el context sin provider, degrada sin romper.
export const EMPTY_TENANT_CONTEXT: TenantContext = {
  businessName: '',
  contact: {},
}

// Whitelist EXPLÍCITO de lo que se expone a los bloques. No hace spread del
// tenant a propósito: así es imposible que se cuele `ai_config` (system prompt,
// handoff, etc.) ni ningún campo interno.
export function buildTenantContext(tenant: Tenant): TenantContext {
  return {
    businessName: tenant.name,
    contact: tenant.config?.contact ?? {},
  }
}
