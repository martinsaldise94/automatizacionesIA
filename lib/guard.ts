import { notFound, redirect } from 'next/navigation'
import type { User } from '@supabase/supabase-js'
import { resolveTenant } from './tenant'
import { hasFeature, type Feature } from './features'
import { isAdmin } from './admin'
import type { Tenant } from './supabase/types'

// Resuelve el tenant y verifica que tiene la feature activa.
// Si el tenant no existe → 404. Si no tiene la feature → redirect('/').
// Uso: const tenant = await requireFeature(params.tenant, 'bookings')
export async function requireFeature(slugOrDomain: string, feature: Feature): Promise<Tenant> {
  const tenant = await resolveTenant(slugOrDomain)
  if (!tenant) notFound()
  if (!hasFeature(tenant, feature)) redirect('/')
  return tenant
}

// Versión sin feature: solo resuelve el tenant o lanza 404.
// Uso: const tenant = await requireTenant(params.tenant)
export async function requireTenant(slugOrDomain: string): Promise<Tenant> {
  const tenant = await resolveTenant(slugOrDomain)
  if (!tenant) notFound()
  return tenant
}

// ¿Puede este usuario entrar al portal de ESTE tenant?
// - Admin de la plataforma: sí (la agencia gestiona cualquier tenant).
// - Dueño: solo el de su propio tenant (claim en app_metadata, no manipulable).
// Función pura para poder testearla sin Supabase.
export function canAccessPortal(user: User | null, tenantId: string): boolean {
  if (!user) return false
  if (isAdmin(user)) return true
  return (
    user.app_metadata?.role === 'owner' &&
    user.app_metadata?.tenant_id === tenantId
  )
}
