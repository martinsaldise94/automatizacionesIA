'use server'

import { revalidatePath } from 'next/cache'
import { authorizePortal } from '@/lib/portal-auth'
import { validatePostInput, nextPublishedAt } from '@/lib/posts'
import { createPost, updatePost, deletePost, getPostForEditor } from '@/lib/db/posts'

// Server actions del editor de blog. Toda escritura pasa por `authorizePortal`
// (tenant resuelto en servidor) y por `validatePostInput` (barrera dura).
//
// Los mensajes de error son para un dueño de negocio, no para un desarrollador.

export type ActionResult = { ok: true } | { ok: false; error: string }
export type CreateResult = { ok: true; postId: string } | { ok: false; error: string }

// El choque más común es el unique (tenant_id, slug).
function slugTakenMessage(slug: string): string {
  return `Ya tienes un post en "/blog/${slug}". Cambia la dirección.`
}

// Crea un post. Devuelve el id para navegar en DURO a su editor (window.location):
// un redirect() blando caería en 404 por el rewrite de tenant por host.
export async function createPostAction(formData: FormData): Promise<CreateResult> {
  const tenantId = await authorizePortal()
  if (!tenantId) return { ok: false, error: 'No autorizado.' }

  // Un post nuevo siempre nace en borrador: publicar es un acto explícito.
  const validation = validatePostInput({
    title: (formData.get('title') as string) ?? '',
    slug: (formData.get('slug') as string) ?? '',
    status: 'draft',
  })
  if (!validation.ok) return { ok: false, error: validation.error }

  const { id, error } = await createPost(tenantId, validation.data)
  if (error || !id) {
    return {
      ok: false,
      error: error?.message.includes('duplicate')
        ? slugTakenMessage(validation.data.slug)
        : 'No se pudo crear el post.',
    }
  }

  return { ok: true, postId: id }
}

// Guarda el post (contenido + metadatos + estado). Un solo camino para guardar
// borrador, publicar y despublicar: el estado llega en `status`.
export async function savePostAction(
  postId: string,
  raw: unknown,
): Promise<ActionResult> {
  const tenantId = await authorizePortal()
  if (!tenantId) return { ok: false, error: 'No autorizado.' }

  const validation = validatePostInput(raw)
  if (!validation.ok) return { ok: false, error: validation.error }

  // Scoped a tenant: si el post es de otro cliente, aquí sale null y se corta.
  const existing = await getPostForEditor(tenantId, postId)
  if (!existing) return { ok: false, error: 'Ese post no existe.' }

  const publishedAt = nextPublishedAt(
    existing.published_at,
    validation.data.status,
    new Date().toISOString(),
  )

  const { error } = await updatePost(tenantId, postId, { ...validation.data, publishedAt })
  if (error) {
    return {
      ok: false,
      error: error.message.includes('duplicate')
        ? slugTakenMessage(validation.data.slug)
        : 'No se pudo guardar.',
    }
  }

  // '/blog' y '/blog/[slug]' son la web PÚBLICA; '/posts' es esta lista del portal.
  // La nav pública muestra "Blog" solo si hay posts publicados, así que publicar
  // el primero cambia el layout → hay que revalidarlo entero.
  revalidatePath('/blog')
  revalidatePath(`/blog/${validation.data.slug}`)
  revalidatePath('/posts')
  revalidatePath('/', 'layout')
  return { ok: true }
}

export async function deletePostAction(postId: string): Promise<ActionResult> {
  const tenantId = await authorizePortal()
  if (!tenantId) return { ok: false, error: 'No autorizado.' }

  const { error } = await deletePost(tenantId, postId)
  if (error) return { ok: false, error: 'No se pudo borrar.' }

  revalidatePath('/blog')
  revalidatePath('/posts')
  revalidatePath('/', 'layout')
  return { ok: true }
}
