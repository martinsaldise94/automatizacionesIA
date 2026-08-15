'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { isAdmin } from '@/lib/admin'
import { mfaGate } from '@/lib/mfa'
import { loginAttemptContext, throttleBlock, noteFailure, noteSuccess } from '@/lib/login-guard'

export async function signIn(formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  if (!email || !password) {
    redirect('/admin/login?error=Faltan credenciales')
  }

  // Freno a la fuerza bruta ANTES de tocar Supabase: si está throttled, no
  // gastamos la llamada de auth. El panel de agencia es el objetivo goloso —
  // una credencial de aquí abre, vía canAccessPortal, el portal de TODOS los
  // tenants.
  const ctx = await loginAttemptContext('admin', email)
  const frenado = await throttleBlock(ctx)
  if (frenado) {
    // `wait` viaja en la URL para que la página pinte la cuenta atrás en vivo.
    // El redirect es inmediato, así que el desfase es de milisegundos.
    redirect(`/admin/login?wait=${frenado.waitMs}`)
  }

  const supabase = await createClient()
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    await noteFailure(ctx)
    redirect('/admin/login?error=Credenciales incorrectas')
  }

  // Credenciales válidas pero sin rol admin → fuera. No dejamos la sesión viva.
  // Cuenta como fallo: probar credenciales robadas contra el panel a ver cuál
  // tiene rol admin no puede salir gratis.
  if (!isAdmin(data.user)) {
    await supabase.auth.signOut()
    await noteFailure(ctx)
    redirect('/admin/login?error=No autorizado')
  }

  await noteSuccess(ctx)

  // La contraseña es solo el primer factor. A dónde va ahora lo decide el
  // estado de su autenticador; el layout de /admin vuelve a comprobarlo en
  // cada página, así que saltarse esto no sirve de nada.
  const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()

  switch (mfaGate(aal)) {
    case 'ok':
      redirect('/admin/tenants')
    case 'challenge':
      redirect('/admin/mfa/challenge')
    case 'enroll':
      redirect('/admin/mfa')
  }
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/admin/login')
}
