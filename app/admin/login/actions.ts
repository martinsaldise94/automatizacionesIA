'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { isAdmin } from '@/lib/admin'

export async function signIn(formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  if (!email || !password) {
    redirect('/admin/login?error=Faltan credenciales')
  }

  const supabase = await createClient()
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    redirect('/admin/login?error=Credenciales incorrectas')
  }

  // Credenciales válidas pero sin rol admin → fuera. No dejamos la sesión viva.
  if (!isAdmin(data.user)) {
    await supabase.auth.signOut()
    redirect('/admin/login?error=No autorizado')
  }

  redirect('/admin/tenants')
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/admin/login')
}
