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

export default async function TenantsPage() {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('tenants')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    return <p className="text-red-600 text-sm">Error cargando tenants: {error.message}</p>
  }

  const tenants = (data ?? []) as Tenant[]

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

      {tenants.length === 0 ? (
        <p className="text-gray-500 text-sm">No hay tenants todavía.</p>
      ) : (
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
                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${PLAN_BADGE[tenant.plan as Tenant['plan']]}`}>
                      {tenant.plan}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${STATUS_BADGE[tenant.status as Tenant['status']]}`}>
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
      )}
    </div>
  )
}
