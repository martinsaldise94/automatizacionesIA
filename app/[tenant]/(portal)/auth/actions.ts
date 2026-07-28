'use server'

import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { resolveTenantForPortal } from '@/lib/tenant'
import { canAccessPortal } from '@/lib/guard'

// Resultado devuelto al cliente. NO usamos redirect() en éxito: el rewrite de
// tenant por host (proxy) desincroniza la navegación BLANDA del App Router y un
// redirect() blando a /builder cae en 404 (el router cliente no conoce el
// rewrite). El cliente navega en DURO con window.location tras el ok. Ver
// LoginForm.tsx y la nota en plan.md (Contexto actual → nav blanda + rewrite).
export type SignInResult = { ok: true } | { ok: false; error: string }

export async function signIn(formData: FormData): Promise<SignInResult> {
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  if (!email || !password) {
    return { ok: false, error: 'Faltan credenciales' }
  }

  const supabase = await createClient()
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    return { ok: false, error: 'Credenciales incorrectas' }
  }

  // El tenant viene del header de confianza que pone el middleware (no del form).
  const tenantIdentifier = (await headers()).get('x-tenant') ?? ''
  const tenant = await resolveTenantForPortal(tenantIdentifier)

  // Credenciales válidas pero el usuario no es dueño de ESTE tenant (ni admin)
  // → no dejamos la sesión viva en este portal.
  if (!tenant || !canAccessPortal(data.user, tenant.id)) {
    await supabase.auth.signOut()
    return { ok: false, error: 'No autorizado' }
  }

  return { ok: true }
}

// Cierra sesión (borra la cookie). NO redirige: el cliente navega en DURO a
// /auth (window.location) por el mismo motivo que signIn (rewrite de tenant).
export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
}
