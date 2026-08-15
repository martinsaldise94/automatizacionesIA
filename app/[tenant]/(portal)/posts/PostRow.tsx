'use client'

import Link from 'next/link'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { PostEditorItem } from '@/lib/db/posts'
import { deletePostAction } from './actions'

// Fila de la lista de posts. Tras borrar, router.refresh() re-renderiza la lista
// en sitio (misma ruta), igual que PageRow en el builder.
export function PostRow({ post }: { post: PostEditorItem }) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function onDelete() {
    if (!confirm(`¿Borrar el post "${post.title}"? No se puede deshacer.`)) return
    setError(null)
    startTransition(async () => {
      const res = await deletePostAction(post.id)
      if (res.ok) router.refresh()
      else setError(res.error)
    })
  }

  const published = post.status === 'published'

  return (
    <li className="px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-medium text-gray-900">{post.title}</p>
          <p className="truncate text-sm text-gray-500">/blog/{post.slug}</p>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <span
            className={
              published
                ? 'rounded-full bg-green-50 px-2 py-0.5 text-xs text-green-700'
                : 'rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500'
            }
          >
            {published ? 'Publicado' : 'Borrador'}
          </span>
          <Link
            href={`/posts/${post.id}`}
            className="text-sm font-medium text-gray-900 underline hover:no-underline"
          >
            Editar
          </Link>
          <button
            type="button"
            onClick={onDelete}
            disabled={pending}
            className="text-sm text-red-600 hover:text-red-800 disabled:opacity-50"
          >
            Borrar
          </button>
        </div>
      </div>
      {error && (
        <p role="alert" className="mt-2 rounded bg-red-50 px-2 py-1 text-sm text-red-700">
          {error}
        </p>
      )}
    </li>
  )
}
