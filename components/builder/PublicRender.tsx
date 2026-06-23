'use client'

import { Render } from '@measured/puck'
import { builderConfig } from '@/lib/builder/config'
import { sanitizePublishedData } from '@/lib/builder/sanitize'
import { TenantProvider } from '@/components/builder/TenantProvider'
import type { TenantContext } from '@/lib/builder/tenant-context'

// Tipos de bloque registrados — para descartar cualquier otro en render.
const ALLOWED_TYPES = Object.keys(builderConfig.components)

// Render de la web pública. Recibe SOLO el TenantContext (ya filtrado en el
// servidor: businessName + contact, nunca ai_config) y el published_data.
// Es client component porque la config de Puck lleva funciones render; aun así
// Next lo renderiza a HTML en el servidor (SEO), solo hidrata los bloques que
// necesitan JS (FAQ, Contact, Map).
export function PublicRender({
  tenantContext,
  publishedData,
}: {
  tenantContext: TenantContext
  publishedData: unknown
}) {
  const data = sanitizePublishedData(publishedData, ALLOWED_TYPES)
  return (
    <TenantProvider value={tenantContext}>
      <Render config={builderConfig} data={data} />
    </TenantProvider>
  )
}
