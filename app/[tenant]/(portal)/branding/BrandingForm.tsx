'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { updateBrandingAction } from './actions'

// Fuentes ofrecidas (stacks seguros, sin carga externa). El valor va a --brand-font.
const FONT_OPTIONS = [
  { label: 'Por defecto', value: '' },
  { label: 'Sans (system)', value: 'system-ui, sans-serif' },
  { label: 'Serif (Georgia)', value: 'Georgia, "Times New Roman", serif' },
  { label: 'Mono', value: 'ui-monospace, "Courier New", monospace' },
] as const

type Branding = {
  primaryColor: string
  secondaryColor: string
  fontFamily: string
  logo: string
}

export function BrandingForm({ initial }: { initial: Branding }) {
  const router = useRouter()
  const [b, setB] = useState<Branding>(initial)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [pending, startTransition] = useTransition()

  function set<K extends keyof Branding>(key: K, value: Branding[K]) {
    setB((prev) => ({ ...prev, [key]: value }))
    setSaved(false)
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      const res = await updateBrandingAction(b)
      if (res.ok) {
        setSaved(true)
        router.refresh() // re-aplica el branding del layout
      } else {
        setError(res.error)
      }
    })
  }

  return (
    <form onSubmit={onSubmit} className="mt-6 space-y-5 rounded-lg border border-gray-200 bg-white p-6">
      {error && <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      {saved && <p className="rounded bg-green-50 px-3 py-2 text-sm text-green-700">Guardado.</p>}

      <div className="grid grid-cols-2 gap-4">
        <label className="block text-sm">
          <span className="text-gray-700">Color primario</span>
          <span className="mt-1 flex items-center gap-2">
            <input
              type="color"
              value={b.primaryColor}
              onChange={(e) => set('primaryColor', e.target.value)}
              className="h-9 w-12 rounded border border-gray-300"
              aria-label="Color primario"
            />
            <input
              type="text"
              value={b.primaryColor}
              onChange={(e) => set('primaryColor', e.target.value)}
              className="w-full rounded border border-gray-300 px-2 py-1.5 font-mono text-sm"
            />
          </span>
        </label>
        <label className="block text-sm">
          <span className="text-gray-700">Color secundario</span>
          <span className="mt-1 flex items-center gap-2">
            <input
              type="color"
              value={b.secondaryColor}
              onChange={(e) => set('secondaryColor', e.target.value)}
              className="h-9 w-12 rounded border border-gray-300"
              aria-label="Color secundario"
            />
            <input
              type="text"
              value={b.secondaryColor}
              onChange={(e) => set('secondaryColor', e.target.value)}
              className="w-full rounded border border-gray-300 px-2 py-1.5 font-mono text-sm"
            />
          </span>
        </label>
      </div>

      <label className="block text-sm">
        <span className="text-gray-700">Tipografía</span>
        <select
          value={b.fontFamily}
          onChange={(e) => set('fontFamily', e.target.value)}
          className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm"
        >
          {FONT_OPTIONS.map((f) => (
            <option key={f.label} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>
      </label>

      <label className="block text-sm">
        <span className="text-gray-700">Logo (URL)</span>
        <input
          type="url"
          value={b.logo}
          onChange={(e) => set('logo', e.target.value)}
          placeholder="https://…"
          className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm"
        />
      </label>

      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-gray-900 px-5 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
      >
        {pending ? 'Guardando…' : 'Guardar marca'}
      </button>
    </form>
  )
}
