import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { hasVerifiedTotp } from '@/lib/mfa'
import { EnrollTotp } from './EnrollTotp'

// Alta del autenticador. El layout de /admin ya ha comprobado sesión + rol
// admin; esta ruta está exenta de la exigencia de aal2 (sería pedir el código
// para poder dar de alta el código).
//
// El QR NO se genera aquí: lo pide `EnrollTotp` en cliente, una sola vez. Si se
// generara en el render, cada refresco crearía un secreto nuevo e invalidaría
// el que el usuario acabara de escanear.
export default async function MfaEnrollPage() {
  const supabase = await createClient()
  const { data: factors } = await supabase.auth.mfa.listFactors()

  // Ya tiene autenticador → lo que falta es usarlo, no darlo de alta otra vez.
  if (hasVerifiedTotp(factors?.totp)) redirect('/admin/mfa/challenge')

  return (
    <div className="mx-auto max-w-md">
      <h1 className="text-xl font-semibold text-gray-900">Protege tu cuenta de admin</h1>
      <p className="mt-2 text-sm text-gray-600">
        Esta cuenta abre el panel de la agencia y el portal de todos los clientes. Necesita un
        segundo factor. Escanea el código con tu app de autenticación (Google Authenticator,
        1Password, Authy…) y teclea los 6 dígitos que aparezcan.
      </p>

      <EnrollTotp />

      <p className="mt-4 text-xs text-gray-500">
        Guarda la clave en tu gestor de contraseñas. Si pierdes el autenticador y no la tienes, la
        única salida es el Dashboard de Supabase.
      </p>
    </div>
  )
}
