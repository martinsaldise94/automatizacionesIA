import { cache } from 'react'
import { createServiceClient } from './supabase/service'
import type { Tenant } from './supabase/types'

// Resuelve por domain primero, luego por slug. Solo devuelve tenants activos.
// React.cache deduplica llamadas dentro del mismo render (no resuelve dos veces).
// Nunca acepta tenant_id del cliente: el tenant_id se deriva de este resultado en servidor.

//busca primero con el dominio y luego por lo otro
export const resolveTenant = cache(async (slugOrDomain: string): Promise<Tenant | null> => {
  const supabase = createServiceClient()

  const { data: byDomain } = await supabase
    .from('tenants')
    .select('*')
    .eq('domain', slugOrDomain)
    .eq('status', 'active')
    .maybeSingle()

  if (byDomain) return byDomain

  const { data: bySlug } = await supabase
    .from('tenants')
    .select('*')
    .eq('slug', slugOrDomain)
    .eq('status', 'active')
    .maybeSingle()

  return bySlug ?? null
})
