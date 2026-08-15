'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { isAdmin } from '@/lib/admin'
import { normalizeTotpCode, hasVerifiedTotp } from '@/lib/mfa'
import { loginAttemptContext, throttleBlock, noteFailure, noteSuccess } from '@/lib/login-guard'

// Actions del segundo factor. NO llaman a `requireAdmin()`: ese guard exige
// aal2, y aquí venimos precisamente a conseguirlo — sería un bucle. El guard
// que sí aplica es "sesión válida + rol admin", escrito a mano abajo.
//
// Verificar tiene que pasar por una server action y no por un Server Component
// porque `verify()` renueva la sesión, y en un Server Component las cookies son
// de solo lectura: la elevación a aal2 se perdería.

async function requireAdminSession() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user || !isAdmin(user)) redirect('/admin/login')
  return { supabase, user }
}

export type EnrollmentStart =
  | { ok: true; factorId: string; qr: string; secret: string }
  | { ok: false; error: string }

// Genera el QR. Se llama UNA vez desde el cliente, al montar la pantalla.
//
// Antes esto vivía en el render del Server Component y fue un error caro: cada
// render creaba un secreto nuevo y borraba el anterior, así que un simple
// refresco —o volver de un código mal tecleado— invalidaba el QR que el usuario
// acababa de escanear. Se quedaba con varias entradas idénticas en su app de
// autenticación y solo una válida, sin forma de saber cuál.
export async function startEnrollment(): Promise<EnrollmentStart> {
  const { supabase } = await requireAdminSession()

  const { data: factors } = await supabase.auth.mfa.listFactors()

  // Altas a medias de intentos anteriores. Su secreto ya no lo tenemos, así que
  // no sirven para nada y encima chocarían por nombre.
  for (const factor of factors?.all ?? []) {
    if (factor.status !== 'verified') {
      await supabase.auth.mfa.unenroll({ factorId: factor.id })
    }
  }

  const { data, error } = await supabase.auth.mfa.enroll({
    factorType: 'totp',
    // Nombre único: si por lo que sea queda algún resto, no colisiona. Y en la
    // app del usuario se distingue de entradas viejas por la fecha.
    friendlyName: `Admin ${new Date().toISOString().slice(0, 16).replace('T', ' ')}`,
  })

  if (error || !data) {
    return { ok: false, error: error?.message ?? 'No se ha podido generar el código.' }
  }

  return { ok: true, factorId: data.id, qr: data.totp.qr_code, secret: data.totp.secret }
}

export type MfaResult = { ok: true } | { ok: false; error: string }

// Da por bueno el autenticador recién escaneado. Al verificar, la sesión sube
// a aal2 sola: no hay que "activar" nada aparte.
//
// Devuelve resultado en vez de redirigir en el error, y esa es la corrección
// importante: un código mal tecleado NO puede tirar el secreto que el usuario
// acaba de escanear. Se queda en la misma pantalla, con el mismo QR.
export async function verifyEnrollment(factorId: string, rawCode: string): Promise<MfaResult> {
  const { supabase } = await requireAdminSession()

  const code = normalizeTotpCode(rawCode)
  if (!code) return { ok: false, error: 'El código son 6 dígitos.' }
  if (!factorId) return { ok: false, error: 'Vuelve a generar el código QR.' }

  const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({ factorId })
  if (challengeError) return { ok: false, error: challengeError.message }

  const { error } = await supabase.auth.mfa.verify({
    factorId,
    challengeId: challenge.id,
    code,
  })
  if (error) return { ok: false, error: 'Código incorrecto. Prueba con el siguiente.' }

  return { ok: true }
}

// Eleva a aal2 una sesión que ya tiene el autenticador dado de alta.
//
// Frenado igual que la contraseña, y con más motivo: esta es la ÚLTIMA barrera.
// Quien está aquí ya tiene la contraseña. Ámbito 'mfa' propio para que fallar
// el código no frene también el login (ver `0009`). La clave es el email del
// usuario ya autenticado, no uno tecleado: aquí no hay nada que enumerar.
export async function submitChallenge(formData: FormData) {
  const { supabase, user } = await requireAdminSession()

  const ctx = await loginAttemptContext('mfa', user.email ?? user.id)
  const frenado = await throttleBlock(ctx)
  if (frenado) redirect(`/admin/mfa/challenge?wait=${frenado.waitMs}`)

  const code = normalizeTotpCode(formData.get('code') as string)
  if (!code) redirect(`/admin/mfa/challenge?error=${encodeURIComponent('El código son 6 dígitos.')}`)

  const { data: factors } = await supabase.auth.mfa.listFactors()
  const totp = (factors?.totp ?? []).find((f) => f.status === 'verified')

  // Sin factor verificado no hay nada que retar: al alta.
  if (!hasVerifiedTotp(factors?.totp) || !totp) redirect('/admin/mfa')

  const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({
    factorId: totp.id,
  })
  if (challengeError) {
    redirect(`/admin/mfa/challenge?error=${encodeURIComponent(challengeError.message)}`)
  }

  const { error } = await supabase.auth.mfa.verify({
    factorId: totp.id,
    challengeId: challenge.id,
    code,
  })

  // Mensaje idéntico para código caducado, mal tecleado o inventado: no damos
  // pistas sobre en qué falló. Aquí sí se puede redirigir: no hay ningún
  // secreto en pantalla que perder (a diferencia del alta).
  if (error) {
    await noteFailure(ctx)
    redirect(`/admin/mfa/challenge?error=${encodeURIComponent('Código incorrecto.')}`)
  }

  await noteSuccess(ctx)
  redirect('/admin/tenants')
}
