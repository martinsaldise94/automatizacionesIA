import Link from 'next/link'
import { createTenant } from './actions'
import { listTemplates } from '@/lib/templates'

export default async function NewTenantPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await searchParams

  return (
    <div className="max-w-lg">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin/tenants" className="text-gray-400 hover:text-gray-600 text-sm">
          ← Tenants
        </Link>
        <span className="text-gray-300">/</span>
        <h1 className="text-xl font-semibold text-gray-900">Nuevo tenant</h1>
      </div>

      {error && (
        <div className="mb-4 px-4 py-3 rounded bg-red-50 border border-red-200 text-red-700 text-sm">
          {error}
        </div>
      )}

      <form action={createTenant} className="bg-white rounded-lg border border-gray-200 p-6 space-y-5">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
            Nombre del negocio
          </label>
          <input
            id="name"
            name="name"
            type="text"
            required
            placeholder="Casa Pepe"
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
          />
        </div>

        <div>
          <label htmlFor="slug" className="block text-sm font-medium text-gray-700 mb-1">
            Slug
          </label>
          <div className="flex items-center gap-2">
            <input
              id="slug"
              name="slug"
              type="text"
              required
              placeholder="casa-pepe"
              pattern="[a-z0-9][a-z0-9\-]{0,61}[a-z0-9]"
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-gray-400"
            />
          </div>
          <p className="mt-1 text-xs text-gray-400">
            Solo minúsculas, números y guiones. Se usa en la URL: <span className="font-mono">casa-pepe.tudominio.com</span>
          </p>
        </div>

        <div>
          <label htmlFor="plan" className="block text-sm font-medium text-gray-700 mb-1">
            Plan
          </label>
          <select
            id="plan"
            name="plan"
            defaultValue="tier_1"
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
          >
            <option value="tier_1">tier_1 — Web Inteligente</option>
            <option value="tier_2">tier_2 — Web + Reservas</option>
            <option value="tier_3">tier_3 — Sistema Conectado</option>
          </select>
        </div>

        <div>
          <label htmlFor="template" className="block text-sm font-medium text-gray-700 mb-1">
            Plantilla de arranque
          </label>
          <select
            id="template"
            name="template"
            defaultValue=""
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
          >
            <option value="">Vacía (sin páginas)</option>
            {listTemplates().map((t) => (
              <option key={t.key} value={t.key}>
                {t.label}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-gray-400">
            Crea páginas iniciales publicadas y un branding por defecto. El cliente lo personaliza en el builder.
          </p>
        </div>

        <div className="pt-2 flex items-center justify-end gap-3">
          <Link
            href="/admin/tenants"
            className="text-sm text-gray-500 hover:text-gray-900"
          >
            Cancelar
          </Link>
          <button
            type="submit"
            className="bg-gray-900 text-white text-sm px-5 py-2 rounded hover:bg-gray-700 transition-colors"
          >
            Crear tenant
          </button>
        </div>
      </form>
    </div>
  )
}
