'use server'

import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { resolveTenantForPortal } from '@/lib/tenant'
import { canAccessPortal } from '@/lib/guard'
import { normalizePagePath } from '@/lib/builder/pagePath'
import { validatePuckData } from '@/lib/builder/publish'
import { builderConfig } from '@/lib/builder/config'
import { createPage, saveDraft, updatePageMeta, deletePage, publishPage } from '@/lib/db/pages'

// Bloques registrados (fuente de verdad: la config de Puck).
const REGISTERED_BLOCK_TYPES = Object.keys(builderConfig.components)

// Resuelve el tenant del portal y verifica que el usuario puede editarlo.
// El tenant viene del header de confianza del middleware (x-tenant), nunca del
// cliente. Devuelve el id del tenant autorizado o null.
async function authorizeBuilder(): Promise<string | null> {
  const tenantIdentifier = (await headers()).get('x-tenant') ?? ''
  const tenant = await resolveTenantForPortal(tenantIdentifier)
  if (!tenant) return null

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return canAccessPortal(user, tenant.id) ? tenant.id : null
}

// Crea una página nueva. Devuelve el id para que el cliente navegue en DURO a su
// editor (window.location): un redirect() blando a /builder/{id} caería en 404
// por el rewrite de tenant por host (ver nota en auth/actions.ts y plan.md).
export type CreatePageResult = { ok: true; pageId: string } | { ok: false; error: string }

export async function createPageAction(formData: FormData): Promise<CreatePageResult> {
  const tenantId = await authorizeBuilder()
  if (!tenantId) return { ok: false, error: 'No autorizado.' }

  const title = ((formData.get('title') as string) ?? '').trim()
  if (!title) return { ok: false, error: 'Falta el título.' }

  const pathResult = normalizePagePath((formData.get('path') as string) ?? '')
  if (!pathResult.ok) return { ok: false, error: pathResult.error }

  const { id, error } = await createPage(tenantId, { path: pathResult.path, title })
  if (error || !id) {
    // El choque más común es el unique (path, tenant_id): ruta ya usada.
    const msg = error?.message.includes('duplicate')
      ? `Ya existe una página en "${pathResult.path}".`
      : 'No se pudo crear la página.'
    return { ok: false, error: msg }
  }

  return { ok: true, pageId: id }
}

// Guarda el borrador (JSON de Puck) de una página. La invoca el editor cliente.
// NO publica → solo escribe draft_data (publicar es Paso 7).
export async function saveDraftAction(
  pageId: string,
  draftData: Record<string, unknown>,
): Promise<{ ok: boolean; error?: string }> {
  const tenantId = await authorizeBuilder()
  if (!tenantId) return { ok: false, error: 'No autorizado.' }

  const { error } = await saveDraft(tenantId, pageId, draftData)
  if (error) return { ok: false, error: 'No se pudo guardar.' }
  return { ok: true }
}

// Publica una página: valida el JSON de Puck (zod: solo bloques registrados,
// estructura y tamaño) y lo copia a published_data (lo que ve el público).
// La validación server-side es la barrera dura: draft_data nunca se publica sin pasar por aquí.
export async function publishAction(
  pageId: string,
  draftData: Record<string, unknown>,
): Promise<{ ok: boolean; error?: string }> {
  const tenantId = await authorizeBuilder()
  if (!tenantId) return { ok: false, error: 'No autorizado.' }

  const validation = validatePuckData(draftData, REGISTERED_BLOCK_TYPES)
  if (!validation.ok) return { ok: false, error: validation.error }

  const { error } = await publishPage(
    tenantId,
    pageId,
    validation.data as unknown as Record<string, unknown>,
  )
  if (error) return { ok: false, error: 'No se pudo publicar.' }
  return { ok: true }
}

// Renombra/mueve una página (título + path). Revalida la lista.
export type ActionResult = { ok: true } | { ok: false; error: string }

export async function updatePageMetaAction(
  pageId: string,
  input: { title: string; path: string },
): Promise<ActionResult> {
  const tenantId = await authorizeBuilder()
  if (!tenantId) return { ok: false, error: 'No autorizado.' }

  const title = input.title.trim()
  if (!title) return { ok: false, error: 'Falta el título.' }

  const pathResult = normalizePagePath(input.path)
  if (!pathResult.ok) return { ok: false, error: pathResult.error }

  const { error } = await updatePageMeta(tenantId, pageId, { title, path: pathResult.path })
  if (error) {
    const msg = error.message.includes('duplicate')
      ? `Ya existe una página en "${pathResult.path}".`
      : 'No se pudo guardar.'
    return { ok: false, error: msg }
  }

  revalidatePath('/builder')
  return { ok: true }
}

// Borra una página. Revalida la lista.
export async function deletePageAction(pageId: string): Promise<ActionResult> {
  const tenantId = await authorizeBuilder()
  if (!tenantId) return { ok: false, error: 'No autorizado.' }

  const { error } = await deletePage(tenantId, pageId)
  if (error) return { ok: false, error: 'No se pudo borrar.' }

  revalidatePath('/builder')
  return { ok: true }
}
