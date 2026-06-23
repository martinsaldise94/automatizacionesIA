import { notFound } from 'next/navigation'
import { resolveTenant } from '@/lib/tenant'
import { getPublishedPage } from '@/lib/db/pages'
import { buildTenantContext } from '@/lib/builder/tenant-context'
import { PublicRender } from '@/components/builder/PublicRender'

// Web pública del tenant. El middleware reescribe el host del cliente a
// /[tenant]/... → aquí `params.tenant` es el slug/dominio resuelto.
// Render mínimo del Paso 4: layout completo, branding, SEO y navegación → Fase 5.
export default async function TenantPage({
  params,
}: {
  params: Promise<{ tenant: string; path?: string[] }>
}) {
  const { tenant: tenantIdentifier, path } = await params

  // Tenant resuelto SIEMPRE en servidor (nunca del cliente).
  const tenant = await resolveTenant(tenantIdentifier)
  if (!tenant) notFound()

  // path indefinido = home ('/'); ['servicios'] = '/servicios'
  const pagePath = path && path.length > 0 ? `/${path.join('/')}` : '/'

  const page = await getPublishedPage(tenant.id, pagePath)
  if (!page) notFound()

  // Solo cruza al cliente el contexto seguro (sin ai_config) + el published_data.
  return <PublicRender tenantContext={buildTenantContext(tenant)} publishedData={page.publishedData} />
}
