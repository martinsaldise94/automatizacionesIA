import { notFound } from 'next/navigation'
import { resolveTenantForPortal } from '@/lib/tenant'
import { getPageForEditor } from '@/lib/db/pages'
import { buildTenantContext } from '@/lib/builder/tenant-context'
import { BuilderEditor } from '@/components/builder/BuilderEditor'

// Editor de una página concreta. El acceso ya lo protege (portal)/layout.tsx.
// La página se busca SCOPED al tenant → un pageId de otro tenant da 404.
export default async function BuilderEditorPage({
  params,
}: {
  params: Promise<{ tenant: string; pageId: string }>
}) {
  const { tenant: tenantIdentifier, pageId } = await params

  const tenant = await resolveTenantForPortal(tenantIdentifier)
  if (!tenant) notFound()

  const page = await getPageForEditor(tenant.id, pageId)
  if (!page) notFound()

  // Solo cruza al cliente el contexto seguro (sin ai_config).
  return (
    <BuilderEditor
      pageId={page.id}
      title={page.title}
      path={page.path}
      draftData={page.draftData}
      tenantContext={buildTenantContext(tenant)}
    />
  )
}
