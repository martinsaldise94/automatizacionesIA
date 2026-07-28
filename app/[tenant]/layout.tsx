import type { CSSProperties } from 'react'
import { resolveTenantForPortal } from '@/lib/tenant'
import { brandingCssVars } from '@/lib/branding'

// Layout común de TODO lo del tenant (web pública + portal). Su única labor aquí
// es inyectar el branding del tenant como CSS variables, que sobreescriben los
// defaults de globals.css para este subárbol → los bloques y el portal se pintan
// con los colores/fuente del cliente. El SEO, 404 y navegación llegan en Fase 5.
//
// Se resuelve con resolveTenantForPortal (cualquier status) para que el portal en
// 'setup' también muestre el branding. Cacheado (React.cache) → sin doble query.
export default async function TenantLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ tenant: string }>
}) {
  const { tenant: tenantIdentifier } = await params
  const tenant = await resolveTenantForPortal(tenantIdentifier)
  const vars = brandingCssVars(tenant?.config?.branding)

  return <div style={vars as CSSProperties}>{children}</div>
}
