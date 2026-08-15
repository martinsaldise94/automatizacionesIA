import { notFound } from 'next/navigation'
import { resolveTenantForPortal } from '@/lib/tenant'
import { getPostForEditor } from '@/lib/db/posts'
import type { PostStatus } from '@/lib/posts'
import { PostEditor } from '../PostEditor'

// Editor de un post. `getPostForEditor` filtra por tenant_id, así que el post de
// OTRO cliente da 404 aquí aunque se acierte el UUID.
export default async function PortalPostPage({
  params,
}: {
  params: Promise<{ tenant: string; postId: string }>
}) {
  const { tenant: tenantIdentifier, postId } = await params
  const tenant = await resolveTenantForPortal(tenantIdentifier)
  if (!tenant) notFound()

  const post = await getPostForEditor(tenant.id, postId)
  if (!post) notFound()

  return (
    <PostEditor
      postId={post.id}
      initial={{
        title: post.title,
        slug: post.slug,
        excerpt: post.excerpt ?? '',
        coverUrl: post.cover_url ?? '',
        content: post.content,
        status: post.status as PostStatus,
      }}
    />
  )
}
