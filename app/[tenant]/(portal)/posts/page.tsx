import { notFound } from 'next/navigation'
import { resolveTenantForPortal } from '@/lib/tenant'
import { listPostsForTenant } from '@/lib/db/posts'
import { NewPostForm } from './NewPostForm'
import { PostRow } from './PostRow'

// Índice del editor de blog: posts del tenant + alta.
// El acceso lo protege (portal)/layout.tsx; aquí solo se listan los datos.
export default async function PortalBlogPage({
  params,
}: {
  params: Promise<{ tenant: string }>
}) {
  const { tenant: tenantIdentifier } = await params
  const tenant = await resolveTenantForPortal(tenantIdentifier)
  if (!tenant) notFound()

  const posts = await listPostsForTenant(tenant.id)

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-semibold text-gray-900">Tu blog</h1>
      <p className="mt-1 text-sm text-gray-500">
        Escribe artículos y publícalos cuando estén listos. Los borradores no se ven en tu web.
      </p>

      <ul className="mt-6 divide-y divide-gray-200 overflow-hidden rounded-lg border border-gray-200 bg-white">
        {posts.length === 0 && (
          <li className="px-4 py-6 text-center text-sm text-gray-400">
            Aún no tienes posts. Crea el primero abajo.
          </li>
        )}
        {posts.map((p) => (
          <PostRow key={p.id} post={p} />
        ))}
      </ul>

      <NewPostForm />
    </div>
  )
}
