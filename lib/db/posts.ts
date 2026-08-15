// ─── Capa de acceso a datos: tabla `posts` (blog) ─────────────────────────────
//
// ÚNICO sitio donde se consulta/escribe `posts`. Mismo patrón que pages.ts:
// service role en servidor, tenant resuelto server-side, filtrado por tenant_id.
// La web pública solo lee posts con status='published'; nunca borradores.

import { createServiceClient } from '@/lib/supabase/service'
import type { Post } from '@/lib/supabase/types'

type DbError = { message: string } | null

// ─── Lecturas públicas (blog) ─────────────────────────────────────────────────

export type PostListItem = {
  slug: string
  title: string
  excerpt: string | null
  // El cuerpo viaja para poder derivar el resumen de los posts sin `excerpt`
  // (`postExcerpt` en lib/blog). Se consume en un Server Component, así que no
  // llega al navegador: el coste es solo de la consulta.
  content: string
  coverUrl: string | null
  publishedAt: string | null
}

// Posts publicados de un tenant, para la lista del blog (más nuevos primero).
export async function listPublishedPosts(tenantId: string): Promise<PostListItem[]> {
  const supabase = createServiceClient()
  const { data } = await supabase
    .from('posts')
    .select('slug, title, excerpt, content, cover_url, published_at')
    .eq('tenant_id', tenantId)
    .eq('status', 'published')
    .order('published_at', { ascending: false, nullsFirst: false })
  return (data ?? []).map((p) => ({
    slug: p.slug,
    title: p.title,
    excerpt: p.excerpt,
    content: p.content,
    coverUrl: p.cover_url,
    publishedAt: p.published_at,
  }))
}

// Solo los slugs publicados (para el sitemap).
export async function listPublishedPostSlugs(tenantId: string): Promise<string[]> {
  const supabase = createServiceClient()
  const { data } = await supabase
    .from('posts')
    .select('slug')
    .eq('tenant_id', tenantId)
    .eq('status', 'published')
  return (data ?? []).map((p) => p.slug)
}

export type PublicPost = {
  title: string
  excerpt: string | null
  coverUrl: string | null
  content: string
  publishedAt: string | null
}

// Un post publicado por slug, o null si no existe / no está publicado.
export async function getPublishedPost(tenantId: string, slug: string): Promise<PublicPost | null> {
  const supabase = createServiceClient()
  const { data } = await supabase
    .from('posts')
    .select('title, excerpt, cover_url, content, published_at')
    .eq('tenant_id', tenantId)
    .eq('slug', slug)
    .eq('status', 'published')
    .maybeSingle()
  if (!data) return null
  return {
    title: data.title,
    excerpt: data.excerpt,
    coverUrl: data.cover_url,
    content: data.content,
    publishedAt: data.published_at,
  }
}

// ─── Editor (portal del dueño) ────────────────────────────────────────────────

export type PostEditorItem = {
  id: string
  slug: string
  title: string
  status: Post['status']
  updatedAt: string
}

export async function listPostsForTenant(tenantId: string): Promise<PostEditorItem[]> {
  const supabase = createServiceClient()
  const { data } = await supabase
    .from('posts')
    .select('id, slug, title, status, updated_at')
    .eq('tenant_id', tenantId)
    .order('updated_at', { ascending: false })
  return (data ?? []).map((p) => ({
    id: p.id,
    slug: p.slug,
    title: p.title,
    status: p.status,
    updatedAt: p.updated_at,
  }))
}

export async function getPostForEditor(tenantId: string, postId: string): Promise<Post | null> {
  const supabase = createServiceClient()
  const { data } = await supabase
    .from('posts')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('id', postId)
    .maybeSingle()
  return (data as Post | null) ?? null
}

export type PostInput = {
  slug: string
  title: string
  excerpt: string | null
  coverUrl: string | null
  content: string
  status: Post['status']
}

export async function createPost(
  tenantId: string,
  input: PostInput,
): Promise<{ id: string | null; error: DbError }> {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('posts')
    .insert({
      tenant_id: tenantId,
      slug: input.slug,
      title: input.title,
      excerpt: input.excerpt,
      cover_url: input.coverUrl,
      content: input.content,
      status: input.status,
      published_at: input.status === 'published' ? new Date().toISOString() : null,
    })
    .select('id')
    .single()
  return { id: data?.id ?? null, error }
}

// `publishedAt` lo calcula la action con `nextPublishedAt` (lib/posts.ts), que es
// donde vive la regla y está testeada. Aquí solo se escribe lo que llega: la capa
// de datos no decide fechas.
export async function updatePost(
  tenantId: string,
  postId: string,
  input: PostInput & { publishedAt: string | null },
): Promise<{ error: DbError }> {
  const supabase = createServiceClient()
  const { error } = await supabase
    .from('posts')
    .update({
      slug: input.slug,
      title: input.title,
      excerpt: input.excerpt,
      cover_url: input.coverUrl,
      content: input.content,
      status: input.status,
      published_at: input.publishedAt,
    })
    .eq('tenant_id', tenantId)
    .eq('id', postId)
  return { error }
}

export async function deletePost(tenantId: string, postId: string): Promise<{ error: DbError }> {
  const supabase = createServiceClient()
  const { error } = await supabase.from('posts').delete().eq('tenant_id', tenantId).eq('id', postId)
  return { error }
}
