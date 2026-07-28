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

// Páginas publicadas de un tenant, para la navegación pública y el sitemap.
// Solo path+title de las que tienen published_data (nunca draft).
export async function listPublishedPages(
  tenantId: string,
): Promise<Array<{ path: string; title: string }>> {
  const supabase = createServiceClient()
  const { data } = await supabase
    .from('pages')
    .select('path, title')
    .eq('tenant_id', tenantId)
    .not('published_data', 'is', null)
    .order('path', { ascending: true })
  return (data ?? []).map((p) => ({ path: p.path, title: p.title }))
}

// ─── Editor (portal del dueño) ────────────────────────────────────────────────
//
// Estas funciones SÍ tocan `draft_data` (privado del dueño). El aislamiento entre
// tenants es el filtro `.eq('tenant_id', tenantId)` en CADA query: el tenantId se
// resuelve server-side (header de confianza + guard), nunca llega del cliente.
// La escritura es service role a propósito → cubre dueño Y admin (la RLS de owner
// no autoriza al admin de la plataforma).

// Resultado de escritura neutro respecto al motor de DB (igual que lib/db/tenants.ts).
type DbError = { message: string } | null

export type PageListItem = {
  id: string
  path: string
  title: string
  hasPublished: boolean
  updatedAt: string
}

// Lista de páginas de un tenant para el índice del builder.
export async function listPagesForTenant(tenantId: string): Promise<PageListItem[]> {
  const supabase = createServiceClient()
  const { data } = await supabase
    .from('pages')
    .select('id, path, title, published_data, updated_at')
    .eq('tenant_id', tenantId)
    .order('path', { ascending: true })

  return (data ?? []).map((p) => ({
    id: p.id,
    path: p.path,
    title: p.title,
    hasPublished: p.published_data !== null,
    updatedAt: p.updated_at,
  }))
}

export type EditorPage = {
  id: string
  path: string
  title: string
  draftData: Record<string, unknown>
}

// Una página para editar. Devuelve `draft_data` (lo que el dueño está editando).
// Scoped al tenant: un pageId de otro tenant → null → notFound() arriba.
export async function getPageForEditor(
  tenantId: string,
  pageId: string,
): Promise<EditorPage | null> {
  const supabase = createServiceClient()
  const { data } = await supabase
    .from('pages')
    .select('id, path, title, draft_data')
    .eq('tenant_id', tenantId)
    .eq('id', pageId)
    .maybeSingle()

  if (!data) return null
  return { id: data.id, path: data.path, title: data.title, draftData: data.draft_data }
}

// Crea una página vacía (draft sin bloques, sin publicar). El path ya viene
// normalizado/validado por la action; aquí solo se inserta.
export async function createPage(
  tenantId: string,
  input: { path: string; title: string },
): Promise<{ id: string | null; error: DbError }> {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('pages')
    .insert({
      tenant_id: tenantId,
      path: input.path,
      title: input.title,
      draft_data: { content: [], root: {} },
      published_data: null,
    })
    .select('id')
    .single()
  return { id: data?.id ?? null, error }
}

// Guarda el borrador (JSON de Puck). NO toca `published_data` → publicar es Paso 7.
export async function saveDraft(
  tenantId: string,
  pageId: string,
  draftData: Record<string, unknown>,
): Promise<{ error: DbError }> {
  const supabase = createServiceClient()
  const { error } = await supabase
    .from('pages')
    .update({ draft_data: draftData })
    .eq('tenant_id', tenantId)
    .eq('id', pageId)
  return { error }
}

// Actualiza título y/o path de una página. El path ya viene normalizado/validado
// por la action. Puede fallar por el unique (tenant_id, path).
export async function updatePageMeta(
  tenantId: string,
  pageId: string,
  fields: { title: string; path: string },
): Promise<{ error: DbError }> {
  const supabase = createServiceClient()
  const { error } = await supabase
    .from('pages')
    .update({ title: fields.title, path: fields.path })
    .eq('tenant_id', tenantId)
    .eq('id', pageId)
  return { error }
}

// Inserta el set de páginas de una plantilla al crear un tenant. Cada página
// arranca ya publicada (draft_data = published_data = data de la plantilla), así
// el tenant tiene web viva desde el minuto uno; el cliente la personaliza luego.
export async function insertTemplatePages(
  tenantId: string,
  pages: Array<{ path: string; title: string; data: Record<string, unknown> }>,
): Promise<{ error: DbError }> {
  if (pages.length === 0) return { error: null }
  const supabase = createServiceClient()
  const rows = pages.map((p) => ({
    tenant_id: tenantId,
    path: p.path,
    title: p.title,
    draft_data: p.data,
    published_data: p.data,
  }))
  const { error } = await supabase.from('pages').insert(rows)
  return { error }
}

// Publica: escribe el JSON validado en `published_data` (lo que ve el público) y
// también en `draft_data` (deja el borrador sincronizado con lo publicado). La
// validación zod la hace la action ANTES de llamar aquí.
export async function publishPage(
  tenantId: string,
  pageId: string,
  data: Record<string, unknown>,
): Promise<{ error: DbError }> {
  const supabase = createServiceClient()
  const { error } = await supabase
    .from('pages')
    .update({ published_data: data, draft_data: data })
    .eq('tenant_id', tenantId)
    .eq('id', pageId)
  return { error }
}

// Borra una página del tenant.
export async function deletePage(tenantId: string, pageId: string): Promise<{ error: DbError }> {
  const supabase = createServiceClient()
  const { error } = await supabase
    .from('pages')
    .delete()
    .eq('tenant_id', tenantId)
    .eq('id', pageId)
  return { error }
}
