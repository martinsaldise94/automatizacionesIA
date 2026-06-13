// ─── Capa de acceso a datos: tabla `tenants` ──────────────────────────────────
//
// ÚNICO sitio donde se consulta/escribe la tabla `tenants`. El resto de la app
// llama a estas funciones, nunca a `supabase.from('tenants')` directamente.
// Objetivo: un futuro cambio de base de datos toca SOLO este archivo (y sus
// hermanos en lib/db/), no los componentes ni las server actions.
//
// Nota: la elección de service role es deliberada. Toda lectura/escritura de
// `tenants` ocurre en servidor con tenant resuelto server-side; el aislamiento
// entre tenants se garantiza arriba (resolveTenant, guards) y por RLS para los
// accesos del portal. Auth (auth.admin.*) NO vive aquí: es otro acoplamiento.

import { createServiceClient } from '@/lib/supabase/service'
import type { Tenant, TenantConfig, TenantAiConfig } from '@/lib/supabase/types'

// Resultado de escritura neutro respecto al motor de DB (no expone tipos de Supabase).
type DbError = { message: string } | null

// ─── Lecturas ──────────────────────────────────────────────────────────────────

// Match por domain y/o slug entre tenants activos. La preferencia domain>slug
// y el saneo del identificador los aplica quien llama (lib/tenant.ts).
export async function findActiveTenantsByDomainOrSlug(identifier: string): Promise<Tenant[]> {
  const supabase = createServiceClient()
  const { data } = await supabase
    .from('tenants')
    .select('*')
    .or(`domain.eq.${identifier},slug.eq.${identifier}`)
    .eq('status', 'active')
  return (data ?? []) as Tenant[]
}

export async function getTenantById(id: string): Promise<Tenant | null> {
  const supabase = createServiceClient()
  const { data } = await supabase.from('tenants').select('*').eq('id', id).single()
  return (data as Tenant | null) ?? null
}

export type TenantListFilters = { q?: string; plan?: string; status?: string }

// Lista para el admin, con filtros opcionales. Devuelve también el error para
// que la página pueda mostrarlo.
export async function listTenants(
  filters: TenantListFilters = {}
): Promise<{ tenants: Tenant[]; error: DbError }> {
  const supabase = createServiceClient()
  let query = supabase
    .from('tenants')
    .select('*')
    .order('created_at', { ascending: false })

  if (filters.q) {
    // Solo alfanumérico + espacios + guiones — previene inyección PostgREST en .or()
    const safeQ = filters.q.replace(/[^a-zA-Z0-9\s\-áéíóúüñÁÉÍÓÚÜÑ]/g, '').trim()
    if (safeQ) query = query.or(`name.ilike.%${safeQ}%,slug.ilike.%${safeQ}%`)
  }
  if (filters.plan && filters.plan !== 'all') {
    query = query.eq('plan', filters.plan as Tenant['plan'])
  }
  if (filters.status && filters.status !== 'all') {
    query = query.eq('status', filters.status as Tenant['status'])
  }

  const { data, error } = await query
  return { tenants: (data ?? []) as Tenant[], error }
}

export async function tenantSlugExists(slug: string): Promise<boolean> {
  const supabase = createServiceClient()
  const { data } = await supabase.from('tenants').select('id').eq('slug', slug).maybeSingle()
  return !!data
}

export async function getTenantOwnerId(id: string): Promise<string | null> {
  const supabase = createServiceClient()
  const { data } = await supabase.from('tenants').select('owner_user_id').eq('id', id).single()
  return data?.owner_user_id ?? null
}

// ─── Escrituras ──────────────────────────────────────────────────────────────

export async function createTenant(input: {
  slug: string
  name: string
  plan: Tenant['plan']
}): Promise<{ id: string | null; error: DbError }> {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('tenants')
    .insert({ slug: input.slug, name: input.name, plan: input.plan, status: 'setup' })
    .select('id')
    .single()
  return { id: (data as { id: string } | null)?.id ?? null, error }
}

export async function updateTenantBasic(
  id: string,
  fields: { name: string; domain: string | null; plan: Tenant['plan']; status: Tenant['status'] }
): Promise<{ error: DbError }> {
  const supabase = createServiceClient()
  const { error } = await supabase.from('tenants').update(fields).eq('id', id)
  return { error }
}

export async function updateTenantConfig(id: string, config: TenantConfig): Promise<{ error: DbError }> {
  const supabase = createServiceClient()
  const { error } = await supabase.from('tenants').update({ config }).eq('id', id)
  return { error }
}

export async function updateTenantAiConfig(id: string, aiConfig: TenantAiConfig): Promise<{ error: DbError }> {
  const supabase = createServiceClient()
  const { error } = await supabase.from('tenants').update({ ai_config: aiConfig }).eq('id', id)
  return { error }
}

export async function setTenantOwner(id: string, ownerUserId: string): Promise<{ error: DbError }> {
  const supabase = createServiceClient()
  const { error } = await supabase.from('tenants').update({ owner_user_id: ownerUserId }).eq('id', id)
  return { error }
}
