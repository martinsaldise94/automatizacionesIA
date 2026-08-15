import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { isAdmin } from '@/lib/admin'

// Guard ÚNICO de las server actions del panel de agencia.
//
// Estaba dentro de `admin/tenants/[id]/actions.ts`, y por eso la action de
// `admin/tenants/new/actions.ts` se quedó sin él: un guard que vive dentro de
// un archivo no se ve desde el de al lado. Vive aquí para que sea importable.
//
// IMPORTANTE: el guard del layout NO protege una server action. Una action es
// un endpoint POST propio, alcanzable sin renderizar la página que la contiene.
// Toda action bajo /admin llama a esto en su PRIMERA línea, sin excepción.
//
// Rol admin ≠ sesión válida: los dueños de negocio también tienen sesión en el
// mismo Supabase Auth. `isAdmin` mira `app_metadata.role`, que solo es
// escribible con service role.
export async function requireAdmin(): Promise<void> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user || !isAdmin(user)) redirect('/admin/login')
}
