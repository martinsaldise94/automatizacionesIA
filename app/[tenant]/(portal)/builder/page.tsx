import { notFound } from 'next/navigation'
import { resolveTenantForPortal } from '@/lib/tenant'
import { listPagesForTenant } from '@/lib/db/pages'
import { NewPageForm } from './NewPageForm'
import { PageRow } from './PageRow'

// Índice del builder: lista de páginas del tenant + alta de página nueva.
// El acceso ya lo protege (portal)/layout.tsx; aquí solo se listan los datos.
export default async function BuilderPage({
  params,
}: {
  params: Promise<{ tenant: string }>
}) {
  const { tenant: tenantIdentifier } = await params
  const tenant = await resolveTenantForPortal(tenantIdentifier)
  if (!tenant) notFound()

  const pages = await listPagesForTenant(tenant.id)

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-semibold text-gray-900">Tus páginas</h1>
      <p className="mt-1 text-sm text-gray-500">
        Crea páginas y edítalas arrastrando bloques. Los cambios se guardan como borrador.
      </p>

      <ul className="mt-6 divide-y divide-gray-200 overflow-hidden rounded-lg border border-gray-200 bg-white">
        {pages.length === 0 && (
          <li className="px-4 py-6 text-center text-sm text-gray-400">
            Aún no tienes páginas. Crea la primera abajo.
          </li>
        )}
        {pages.map((p) => (
          <PageRow key={p.id} page={p} />
        ))}
      </ul>

      <NewPageForm />
    </div>
  )
}
