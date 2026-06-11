import { cache } from 'react'
import { createServiceClient } from './supabase/service'
import type { Tenant } from './supabase/types'

// El identificador viene del header Host o de la URL: no es de fiar.
// Solo aceptamos caracteres válidos en hostnames/slugs; evita además
// inyección en la sintaxis .or() de PostgREST (comas, paréntesis).
const IDENTIFIER_PATTERN = /^[a-z0-9.-]+$/i

// Resuelve por domain primero, luego por slug. Solo devuelve tenants activos.
// React.cache deduplica llamadas dentro del mismo render (no resuelve dos veces).
// Nunca acepta tenant_id del cliente: el tenant_id se deriva de este resultado en servidor.
export const resolveTenant = cache(async (slugOrDomain: string): Promise<Tenant | null> => {
  if (!IDENTIFIER_PATTERN.test(slugOrDomain)) return null

  const supabase = createServiceClient()

  // Una sola query trae el match por domain y/o por slug
  const { data } = await supabase
    .from('tenants')
    .select('*')
    .or(`domain.eq.${slugOrDomain},slug.eq.${slugOrDomain}`)
    .eq('status', 'active')

  const rows = (data ?? []) as Tenant[]

  // Preferencia: domain gana sobre slug si hubiera dos matches
  return (
    rows.find((t) => t.domain === slugOrDomain) ??
    rows.find((t) => t.slug === slugOrDomain) ??
    null
  )
})
