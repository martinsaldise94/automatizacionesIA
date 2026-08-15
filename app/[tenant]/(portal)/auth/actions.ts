'use server'

import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { resolveTenantForPortal } from '@/lib/tenant'
import { canAccessPortal } from '@/lib/guard'
import { loginAttemptContext, throttleBlock, noteFailure, noteSuccess } from '@/lib/login-guard'

// Resultado devuelto al cliente. NO usamos redirect() en éxito: el rewrite de
// tenant por host (proxy) desincroniza la navegación BLANDA del App Router y un
// redirect() blando a /builder cae en 404 (el router cliente no conoce el
// rewrite). El cliente navega en DURO con window.location tras el ok. Ver
// LoginForm.tsx y la nota en plan.md (Contexto actual → nav blanda + rewrite).
// `waitMs` solo viaja cuando el rechazo es por throttling: el formulario lo usa
// para pintar la cuenta atrás en vivo.
export type SignInResult = { ok: true } | { ok: false; error: string; waitMs?: number }

export async function signIn(formData: FormData): Promise<SignInResult> {
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  if (!email || !password) {
    return { ok: false, error: 'Faltan credenciales' }
  }

  // Freno a la fuerza bruta ANTES de tocar Supabase: si está throttled, no
  // gastamos la llamada de auth. Aquí el throttling es la defensa principal —
  // los dueños no tienen segundo factor (ver lib/mfa.ts).
  const ctx = await loginAttemptContext('portal', email)
  const frenado = await throttleBlock(ctx)
  if (frenado) return { ok: false, error: frenado.message, waitMs: frenado.waitMs }

  const supabase = await createClient()
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    await noteFailure(ctx)
    return { ok: false, error: 'Credenciales incorrectas' }
  }

  // El tenant viene del header de confianza que pone el middleware (no del form).
  const tenantIdentifier = (await headers()).get('x-tenant') ?? ''
  const tenant = await resolveTenantForPortal(tenantIdentifier)

  // Credenciales válidas pero el usuario no es dueño de ESTE tenant (ni admin)
  // → no dejamos la sesión viva en este portal. Cuenta como fallo: si no,
  // probar una credencial robada contra el portal de otro saldría gratis.
  if (!tenant || !canAccessPortal(data.user, tenant.id)) {
    await supabase.auth.signOut()
    await noteFailure(ctx)
    return { ok: false, error: 'No autorizado' }
  }

  await noteSuccess(ctx)
  return { ok: true }
}

// Cierra sesión (borra la cookie). NO redirige: el cliente navega en DURO a
// /auth (window.location) por el mismo motivo que signIn (rewrite de tenant).
export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
}
