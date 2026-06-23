'use server'

import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { resolveTenantForPortal } from '@/lib/tenant'
import { canAccessPortal } from '@/lib/guard'

export async function signIn(formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  if (!email || !password) {
    redirect('/auth?error=Faltan credenciales')
  }

  const supabase = await createClient()
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    redirect('/auth?error=Credenciales incorrectas')
  }

  // El tenant viene del header de confianza que pone el middleware (no del form).
  const tenantIdentifier = (await headers()).get('x-tenant') ?? ''
  const tenant = await resolveTenantForPortal(tenantIdentifier)

  // Credenciales válidas pero el usuario no es dueño de ESTE tenant (ni admin)
  // → no dejamos la sesión viva en este portal.
  if (!tenant || !canAccessPortal(data.user, tenant.id)) {
    await supabase.auth.signOut()
    redirect('/auth?error=No autorizado')
  }

  redirect('/builder')
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/auth')
}
