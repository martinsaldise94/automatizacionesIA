'use client'

import { useTransition } from 'react'
import { signOut } from './actions'

// Cierra sesión y navega en DURO a /auth (window.location): el rewrite de tenant
// por host rompe la navegación blanda. Ver nota en actions.ts.
export function SignOutButton() {
  const [pending, startTransition] = useTransition()

  function onClick() {
    startTransition(async () => {
      await signOut()
      window.location.assign('/auth')
    })
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      className="text-sm text-gray-500 hover:text-gray-900 disabled:opacity-50"
    >
      Salir
    </button>
  )
}
