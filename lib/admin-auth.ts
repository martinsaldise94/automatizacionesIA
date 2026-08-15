import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { isAdmin } from '@/lib/admin'
import { mfaGate } from '@/lib/mfa'

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

// Rutas del propio flujo de MFA. Exigirles aal2 sería un bucle: no se puede
// llegar a aal2 sin pasar por ellas.
export const MFA_PATHS = ['/admin/mfa'] as const

export function isMfaPath(pathname: string): boolean {
  return MFA_PATHS.some((p) => pathname.startsWith(p))
}

// Cliente SSR ya tipado con nuestro Database. Se deriva de `createClient` en
// vez de escribir `SupabaseClient<...>` a mano: así no hay dos declaraciones
// del mismo tipo que se puedan desincronizar.
type ServerSupabase = Awaited<ReturnType<typeof createClient>>

// A dónde mandar al admin según el estado de su segundo factor, o null si puede
// seguir. Separado de `requireAdmin` porque el layout necesita lo mismo.
export async function mfaRedirectPath(supabase: ServerSupabase): Promise<string | null> {
  const { data } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()

  switch (mfaGate(data)) {
    case 'ok':
      return null
    case 'challenge':
      return '/admin/mfa/challenge'
    case 'enroll':
      return '/admin/mfa'
  }
}

// Sesión + rol admin + segundo factor verificado EN ESTA SESIÓN.
//
// Que el segundo factor se compruebe aquí y no solo al hacer login es el punto
// entero: una action es alcanzable directamente por POST, así que una sesión
// robada a medio elevar (contraseña sí, TOTP no) llegaría a ella sin pasar por
// la pantalla del código.
export async function requireAdmin(): Promise<void> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user || !isAdmin(user)) redirect('/admin/login')

  const destino = await mfaRedirectPath(supabase)
  if (destino) redirect(destino)
}
