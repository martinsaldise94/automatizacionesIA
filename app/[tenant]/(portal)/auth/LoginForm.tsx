'use client'

import { useState, useTransition } from 'react'
import { ThrottleNotice } from '@/components/auth/ThrottleNotice'
import { signIn } from './actions'

// Formulario de login del dueño. En éxito navega en DURO a /builder
// (window.location), no con el router del App Router: el rewrite de tenant por
// host desincroniza la navegación blanda y un redirect() caería en 404.
export function LoginForm() {
  const [error, setError] = useState<string | null>(null)
  // Frenado por throttling: se pinta aparte para que la espera baje sola.
  // `key` con el valor hace que un frenazo nuevo reinicie la cuenta.
  const [waitMs, setWaitMs] = useState<number | null>(null)
  const [pending, startTransition] = useTransition()

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    startTransition(async () => {
      const res = await signIn(formData)
      if (res.ok) {
        // Navegación dura: recarga completa → el proxy reescribe el host y el
        // servidor resuelve /builder correctamente.
        window.location.assign('/builder')
      } else {
        setWaitMs(res.waitMs ?? null)
        setError(res.waitMs ? null : res.error)
      }
    })
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      {waitMs !== null && <ThrottleNotice key={waitMs} waitMs={waitMs} />}

      {error && (
        <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
      )}

      <div>
        <label htmlFor="email" className="mb-1 block text-sm font-medium text-gray-700">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
        />
      </div>

      <div>
        <label htmlFor="password" className="mb-1 block text-sm font-medium text-gray-700">
          Contraseña
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
        />
      </div>

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded bg-gray-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-700 disabled:opacity-50"
      >
        {pending ? 'Entrando…' : 'Entrar'}
      </button>
    </form>
  )
}
