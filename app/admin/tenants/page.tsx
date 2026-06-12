import Link from 'next/link'
import { createServiceClient } from '@/lib/supabase/service'
import type { Tenant } from '@/lib/supabase/types'

const PLAN_BADGE: Record<Tenant['plan'], string> = {
  tier_1: 'bg-gray-100 text-gray-700',
  tier_2: 'bg-blue-100 text-blue-700',
  tier_3: 'bg-purple-100 text-purple-700',
}

const STATUS_BADGE: Record<Tenant['status'], string> = {
  active: 'bg-green-100 text-green-700',
  setup:  'bg-yellow-100 text-yellow-700',
  paused: 'bg-red-100 text-red-700',
}

export default async function TenantsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; plan?: string; status?: string }>
}) {
  const { q, plan, status } = await searchParams

  const supabase = createServiceClient()
  let query = supabase
    .from('tenants')
    .select('*')
    .order('created_at', { ascending: false })

  if (q) {
    // Solo alfanumérico + espacios + guiones — previene inyección PostgREST en .or()
    const safeQ = q.replace(/[^a-zA-Z0-9\s\-áéíóúüñÁÉÍÓÚÜÑ]/g, '').trim()
    if (safeQ) query = query.or(`name.ilike.%${safeQ}%,slug.ilike.%${safeQ}%`)
  }
  if (plan && plan !== 'all') query = query.eq('plan', plan as Tenant['plan'])
  if (status && status !== 'all') query = query.eq('status', status as Tenant['status'])

  const { data, error } = await query

  if (error) {
    return <p className="text-red-600 text-sm">Error cargando tenants: {error.message}</p>
  }

  const tenants = (data ?? []) as Tenant[]
  const hasFilters = !!q || (!!plan && plan !== 'all') || (!!status && status !== 'all')

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Tenants</h1>
        <Link
          href="/admin/tenants/new"
          className="bg-gray-900 text-white text-sm px-4 py-2 rounded hover:bg-gray-700 transition-colors"
        >
          + Nuevo tenant
        </Link>
      </div>

      <form method="GET" className="mb-4 flex gap-3 flex-wrap items-center">
        <input
          name="q"
          defaultValue={q ?? ''}
          type="search"
          placeholder="Buscar por nombre o slug…"
          className="flex-1 min-w-48 border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
        />
        <select
          name="plan"
          defaultValue={plan ?? 'all'}
          className="border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
        >
          <option value="all">Todos los planes</option>
          <option value="tier_1">tier_1</option>
          <option value="tier_2">tier_2</option>
          <option value="tier_3">tier_3</option>
        </select>
        <select
          name="status"
          defaultValue={status ?? 'all'}
          className="border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
        >
          <option value="all">Todos los estados</option>
          <option value="setup">setup</option>
          <option value="active">active</option>
          <option value="paused">paused</option>
        </select>
        <button
          type="submit"
          className="border border-gray-300 bg-white text-gray-700 text-sm px-4 py-2 rounded hover:bg-gray-50 transition-colors"
        >
          Filtrar
        </button>
        {hasFilters && (
          <Link href="/admin/tenants" className="text-sm text-gray-500 hover:text-gray-900">
            Limpiar
          </Link>
        )}
      </form>

      {tenants.length === 0 ? (
        <p className="text-gray-500 text-sm">
          {hasFilters ? 'Sin resultados para ese filtro.' : 'No hay tenants todavía.'}
        </p>
      ) : (
        <>
          <p className="text-xs text-gray-400 mb-2">
            {tenants.length} resultado{tenants.length !== 1 ? 's' : ''}
            {hasFilters ? ' para el filtro actual' : ''}
          </p>
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Nombre</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Slug</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Plan</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Estado</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {tenants.map((tenant) => (
                  <tr key={tenant.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{tenant.name}</td>
                    <td className="px-4 py-3 text-gray-500 font-mono">{tenant.slug}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${PLAN_BADGE[tenant.plan]}`}>
                        {tenant.plan}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${STATUS_BADGE[tenant.status]}`}>
                        {tenant.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/admin/tenants/${tenant.id}`}
                        className="text-gray-500 hover:text-gray-900 font-medium"
                      >
                        Editar →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
