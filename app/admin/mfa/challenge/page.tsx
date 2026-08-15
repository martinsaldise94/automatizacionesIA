import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { hasVerifiedTotp } from '@/lib/mfa'
import { ThrottleNotice } from '@/components/auth/ThrottleNotice'
import { submitChallenge } from '../actions'

interface Props {
  searchParams: Promise<{ error?: string; wait?: string }>
}

// Segundo paso del login del admin: la contraseña ya está verificada, falta el
// código del autenticador para elevar la sesión a aal2.
export default async function MfaChallengePage({ searchParams }: Props) {
  const { error, wait } = await searchParams

  // `wait` llega de la URL: texto de fuera, se valida antes de usarlo.
  const waitMs = Number(wait)
  const frenado = Number.isFinite(waitMs) && waitMs > 0 ? waitMs : null

  const supabase = await createClient()
  const { data: factors } = await supabase.auth.mfa.listFactors()

  // Sin autenticador dado de alta no hay reto posible → al alta.
  if (!hasVerifiedTotp(factors?.totp)) redirect('/admin/mfa')

  return (
    <div className="mx-auto max-w-sm">
      <h1 className="text-xl font-semibold text-gray-900">Verificación en dos pasos</h1>
      <p className="mt-2 text-sm text-gray-600">
        Abre tu app de autenticación y teclea el código de 6 dígitos.
      </p>

      {frenado !== null && (
        <div className="mt-4">
          <ThrottleNotice waitMs={frenado} />
        </div>
      )}

      {error && !frenado && (
        <p className="mt-4 rounded bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
      )}

      <form action={submitChallenge} className="mt-6 flex flex-col gap-3">
        <label htmlFor="code" className="text-sm font-medium text-gray-700">
          Código
        </label>
        <input
          id="code"
          name="code"
          inputMode="numeric"
          autoComplete="one-time-code"
          autoFocus
          required
          placeholder="000000"
          className="w-full rounded border border-gray-300 px-3 py-2 text-center font-mono text-lg tracking-widest focus:outline-none focus:ring-2 focus:ring-gray-900"
        />
        <button
          type="submit"
          className="w-full rounded bg-gray-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-700"
        >
          Entrar
        </button>
      </form>
    </div>
  )
}
