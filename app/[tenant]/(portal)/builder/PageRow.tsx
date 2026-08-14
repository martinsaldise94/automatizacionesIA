'use client'

import Link from 'next/link'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { PageListItem } from '@/lib/db/pages'
import { updatePageMetaAction, deletePageAction } from './actions'

// Fila de la lista de páginas. "Ajustes" despliega edición de título/ruta y el
// borrado. Tras mutar, router.refresh() re-renderiza la lista en sitio (misma
// ruta → sin la navegación blanda cross-subtree que rompe el rewrite de tenant).
export function PageRow({ page }: { page: PageListItem }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState(page.title)
  const [path, setPath] = useState(page.path)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function onSave() {
    setError(null)
    startTransition(async () => {
      const res = await updatePageMetaAction(page.id, { title, path })
      if (res.ok) {
        setOpen(false)
        router.refresh()
      } else {
        setError(res.error)
      }
    })
  }

  function onDelete() {
    if (!confirm(`¿Borrar la página "${page.title}"? No se puede deshacer.`)) return
    setError(null)
    startTransition(async () => {
      const res = await deletePageAction(page.id)
      if (res.ok) router.refresh()
      else setError(res.error)
    })
  }

  return (
    <li className="px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-medium text-gray-900">{page.title}</p>
          <p className="truncate text-sm text-gray-500">{page.path}</p>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <span
            className={
              page.hasPublished
                ? 'rounded-full bg-green-50 px-2 py-0.5 text-xs text-green-700'
                : 'rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500'
            }
          >
            {page.hasPublished ? 'Publicada' : 'Borrador'}
          </span>
          <Link
            href={`/builder/${page.id}`}
            className="text-sm font-medium text-gray-900 underline hover:no-underline"
          >
            Editar
          </Link>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="text-sm text-gray-500 hover:text-gray-900"
            aria-expanded={open}
          >
            Ajustes
          </button>
        </div>
      </div>

      {open && (
        <div className="mt-3 rounded-md border border-gray-200 bg-gray-50 p-3">
          {error && (
            <p className="mb-2 rounded bg-red-50 px-2 py-1 text-sm text-red-700">{error}</p>
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="text-gray-700">Título</span>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-1.5 text-gray-900"
              />
            </label>
            <label className="block text-sm">
              <span className="text-gray-700">Ruta</span>
              <input
                value={path}
                onChange={(e) => setPath(e.target.value)}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-1.5 text-gray-900"
              />
            </label>
          </div>
          <div className="mt-3 flex items-center justify-between">
            <button
              type="button"
              onClick={onSave}
              disabled={pending}
              className="rounded-md bg-gray-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
            >
              {pending ? 'Guardando…' : 'Guardar'}
            </button>
            <button
              type="button"
              onClick={onDelete}
              disabled={pending}
              className="text-sm font-medium text-red-600 hover:text-red-800 disabled:opacity-50"
            >
              Borrar página
            </button>
          </div>
        </div>
      )}
    </li>
  )
}
