import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { resolveTenant } from '@/lib/tenant'
import { getPublishedPage } from '@/lib/db/pages'
import { buildTenantContext } from '@/lib/builder/tenant-context'
import { pageMetadata } from '@/lib/seo'
import { PublicRender } from '@/components/builder/PublicRender'

// path indefinido = home ('/'); ['servicios'] = '/servicios'
function toPagePath(path?: string[]): string {
  return path && path.length > 0 ? `/${path.join('/')}` : '/'
}

// SEO por página: título/descripción del tenant + título de la página.
export async function generateMetadata({
  params,
}: {
  params: Promise<{ tenant: string; path?: string[] }>
}): Promise<Metadata> {
  const { tenant: tenantIdentifier, path } = await params
  const tenant = await resolveTenant(tenantIdentifier)
  if (!tenant) return { title: 'No encontrado' }

  const pagePath = toPagePath(path)
  const page = await getPublishedPage(tenant.id, pagePath)
  if (!page) return { title: 'No encontrado' }

  return pageMetadata(tenant, page, pagePath === '/')
}

// Web pública del tenant. El proxy reescribe el host del cliente a /[tenant]/... →
// aquí `params.tenant` es el slug/dominio resuelto.
export default async function TenantPage({
  params,
}: {
  params: Promise<{ tenant: string; path?: string[] }>
}) {
  const { tenant: tenantIdentifier, path } = await params

  // Tenant resuelto SIEMPRE en servidor (nunca del cliente).
  const tenant = await resolveTenant(tenantIdentifier)
  if (!tenant) notFound()

  const pagePath = toPagePath(path)

  const page = await getPublishedPage(tenant.id, pagePath)
  if (!page) notFound()

  // Solo cruza al cliente el contexto seguro (sin ai_config) + el published_data.
  return <PublicRender tenantContext={buildTenantContext(tenant)} publishedData={page.publishedData} />
}
