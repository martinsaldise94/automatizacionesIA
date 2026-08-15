'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { startEnrollment, verifyEnrollment, type EnrollmentStart } from './actions'

// Alta del autenticador, en cliente A PROPÓSITO.
//
// La versión anterior generaba el QR dentro del render del Server Component, y
// eso churneaba el secreto: cada render creaba uno nuevo y borraba el anterior.
// Un refresco, o volver de un código mal tecleado, invalidaba el QR que el
// usuario acababa de escanear — y su app se llenaba de entradas idénticas de
// las que solo una servía. Aquí el QR se pide UNA vez al montar y se queda
// quieto en estado mientras el usuario lo escanea y teclea.

export function EnrollTotp() {
  const [alta, setAlta] = useState<EnrollmentStart | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pendiente, startTransition] = useTransition()

  // React monta dos veces en desarrollo (StrictMode). Sin esto, el segundo
  // montaje pediría otro QR y volveríamos al problema que este componente
  // existe para arreglar.
  const pedido = useRef(false)

  useEffect(() => {
    if (pedido.current) return
    pedido.current = true
    startEnrollment().then(setAlta)
  }, [])

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!alta?.ok) return

    const code = (new FormData(e.currentTarget).get('code') as string) ?? ''
    setError(null)

    startTransition(async () => {
      const res = await verifyEnrollment(alta.factorId, code)
      // Navegación dura: la sesión acaba de subir a aal2 y queremos que el
      // servidor la relea entera, sin caché del router de por medio.
      if (res.ok) window.location.assign('/admin/tenants')
      else setError(res.error)
    })
  }

  if (!alta) {
    return <p className="mt-6 text-sm text-gray-500">Generando el código…</p>
  }

  if (!alta.ok) {
    return <p className="mt-6 rounded bg-red-50 px-3 py-2 text-sm text-red-600">{alta.error}</p>
  }

  return (
    <div className="mt-6 rounded-lg border border-gray-200 bg-white p-6">
      {/* <img> crudo y no next/image: el QR llega como data URI con SVG en
          claro (comillas y saltos incluidos), que next/image rechaza — y no hay
          nada que optimizar en una imagen que ya viaja inline. */}
      {/* eslint-disable-next-line @next/next/no-img-element -- data URI del QR, no optimizable */}
      <img
        src={alta.qr}
        alt="Código QR para dar de alta el autenticador"
        width={200}
        height={200}
        className="mx-auto h-50 w-50"
      />

      <p className="mt-4 text-center text-xs text-gray-500">
        ¿No puedes escanear? Introduce esta clave a mano:
      </p>
      <code className="mt-1 block break-all text-center font-mono text-xs text-gray-700">
        {alta.secret}
      </code>

      <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-3">
        {error && (
          <p role="alert" className="rounded bg-red-50 px-3 py-2 text-sm text-red-600">
            {error}
          </p>
        )}

        <label htmlFor="code" className="text-sm font-medium text-gray-700">
          Código de 6 dígitos
        </label>
        <input
          id="code"
          name="code"
          inputMode="numeric"
          autoComplete="one-time-code"
          required
          placeholder="000000"
          className="w-full rounded border border-gray-300 px-3 py-2 text-center font-mono text-lg tracking-widest focus:outline-none focus:ring-2 focus:ring-gray-900"
        />
        <button
          type="submit"
          disabled={pendiente}
          className="w-full rounded bg-gray-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-700 disabled:opacity-50"
        >
          {pendiente ? 'Comprobando…' : 'Activar'}
        </button>
      </form>
    </div>
  )
}
