// ─── Capa de acceso a datos: tabla `pages` ────────────────────────────────────
//
// ÚNICO sitio donde se consulta `pages`. Mismo patrón que lib/db/tenants.ts.
//
// Seguridad: lee con service role en servidor (el tenant_id se resuelve siempre
// server-side, nunca del cliente) y selecciona EXCLUSIVAMENTE `published_data` —
// jamás `draft_data`, que es privado del dueño y nunca debe llegar al público.

import { createServiceClient } from '@/lib/supabase/service'

export type PublishedPage = {
  title: string
  publishedData: Record<string, unknown>
}

// Devuelve la página publicada de un tenant para un path, o null si no existe
// o no está publicada todavía.
export async function getPublishedPage(tenantId: string, path: string): Promise<PublishedPage | null> {
  const supabase = createServiceClient()
  const { data } = await supabase
    .from('pages')
    .select('title, published_data') // NUNCA draft_data
    .eq('tenant_id', tenantId)
    .eq('path', path)
    .not('published_data', 'is', null)
    .maybeSingle()

  if (!data?.published_data) return null
  return { title: data.title, publishedData: data.published_data }
}
