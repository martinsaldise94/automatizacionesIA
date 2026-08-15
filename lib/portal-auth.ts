import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { resolveTenantForPortal } from '@/lib/tenant'
import { canAccessPortal } from '@/lib/guard'

// Guard ÚNICO de las server actions del portal del dueño (builder, blog, marca…).
//
// Estaba duplicado en builder/actions.ts; vive aquí para que no se desincronice.
// Duplicar un guard de tenant es como se acaba filtrando datos de un cliente a
// otro: si mañana cambia la regla de acceso, tiene que cambiar en un solo sitio.
//
// El tenant sale del header de confianza `x-tenant`, que SOLO escribe el proxy
// (borra el que venga del cliente). Nunca del body de la petición.
//
// Devuelve el `tenant_id` autorizado, o null. Toda action debe cortar con null.
export async function authorizePortal(): Promise<string | null> {
  const tenantIdentifier = (await headers()).get('x-tenant') ?? ''
  const tenant = await resolveTenantForPortal(tenantIdentifier)
  if (!tenant) return null

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return canAccessPortal(user, tenant.id) ? tenant.id : null
}
