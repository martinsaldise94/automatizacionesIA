'use client'

import Link from 'next/link'
import { useState, useTransition } from 'react'
import { Markdown } from '@/components/ui/Markdown'
import { ImagePicker } from '@/components/portal/ImagePicker'
import type { PostStatus } from '@/lib/posts'
import { savePostAction } from './actions'
import { uploadImageAction } from '../upload'

// Editor de un post: markdown a la izquierda, vista previa con el MISMO render
// que la web pública (components/ui/Markdown). Sin librería de editor: un
// textarea es suficiente y no puede romper el responsive ni meter HTML raro.

type Props = {
  postId: string
  initial: {
    title: string
    slug: string
    excerpt: string
    coverUrl: string
    content: string
    status: PostStatus
  }
}

const inputClass =
  'mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 focus:border-gray-900 focus:outline-none'

export function PostEditor({ postId, initial }: Props) {
  const [title, setTitle] = useState(initial.title)
  const [slug, setSlug] = useState(initial.slug)
  const [excerpt, setExcerpt] = useState(initial.excerpt)
  const [coverUrl, setCoverUrl] = useState(initial.coverUrl)
  const [content, setContent] = useState(initial.content)
  const [status, setStatus] = useState<PostStatus>(initial.status)

  const [tab, setTab] = useState<'escribir' | 'preview'>('escribir')
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function save(nextStatus: PostStatus) {
    setError(null)
    setSaved(null)
    startTransition(async () => {
      const res = await savePostAction(postId, {
        title,
        slug,
        excerpt,
        coverUrl,
        content,
        status: nextStatus,
      })
      if (res.ok) {
        setStatus(nextStatus)
        setSaved(
          nextStatus === 'published' ? 'Publicado. Ya se ve en tu web.' : 'Guardado como borrador.',
        )
      } else {
        setError(res.error)
      }
    })
  }

  return (
    <div className="mx-auto max-w-4xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/posts" className="text-sm text-gray-500 hover:text-gray-900">
            ← Posts
          </Link>
          <span
            className={
              status === 'published'
                ? 'rounded-full bg-green-50 px-2 py-0.5 text-xs text-green-700'
                : 'rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500'
            }
          >
            {status === 'published' ? 'Publicado' : 'Borrador'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => save('draft')}
            disabled={pending}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            {status === 'published' ? 'Pasar a borrador' : 'Guardar borrador'}
          </button>
          <button
            type="button"
            onClick={() => save('published')}
            disabled={pending}
            className="rounded-md bg-gray-900 px-4 py-1.5 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
          >
            {pending ? 'Guardando…' : status === 'published' ? 'Actualizar' : 'Publicar'}
          </button>
        </div>
      </div>

      {error && (
        <p role="alert" className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}
      {saved && (
        <p role="status" className="mt-4 rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">
          {saved}
        </p>
      )}

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="text-gray-700">Título</span>
          <input value={title} onChange={(e) => setTitle(e.target.value)} className={inputClass} />
        </label>
        <label className="block text-sm">
          <span className="text-gray-700">Dirección</span>
          <input
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            className={inputClass}
            aria-describedby="slug-hint"
          />
          <span id="slug-hint" className="mt-1 block text-xs text-gray-500">
            Se verá como /blog/{slug || '…'}
          </span>
        </label>
      </div>

      <div className="mt-4">
        <label className="block text-sm">
          <span className="text-gray-700">Resumen</span>
          <input
            value={excerpt}
            onChange={(e) => setExcerpt(e.target.value)}
            placeholder="Si lo dejas vacío se saca del principio del texto"
            className={inputClass}
          />
        </label>
      </div>

      <div className="mt-4">
        <ImagePicker
          label="Imagen de portada"
          value={coverUrl}
          onChange={setCoverUrl}
          onUpload={uploadImageAction}
        />
      </div>

      <div className="mt-8">
        <div className="flex items-center gap-1 border-b border-gray-200" role="tablist">
          {(['escribir', 'preview'] as const).map((t) => (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={tab === t}
              onClick={() => setTab(t)}
              className={
                tab === t
                  ? '-mb-px border-b-2 border-gray-900 px-3 py-2 text-sm font-medium text-gray-900'
                  : 'px-3 py-2 text-sm text-gray-500 hover:text-gray-900'
              }
            >
              {t === 'escribir' ? 'Escribir' : 'Vista previa'}
            </button>
          ))}
        </div>

        {tab === 'escribir' ? (
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={22}
            spellCheck
            placeholder={'## Un subtítulo\n\nEscribe aquí. **Negrita**, *cursiva*, listas con guiones.'}
            className="mt-4 w-full rounded-md border border-gray-300 p-4 font-mono text-sm leading-relaxed text-gray-900 focus:border-gray-900 focus:outline-none"
          />
        ) : (
          <div className="mt-4 min-h-96 rounded-md border border-gray-200 bg-white p-6">
            {content.trim() ? (
              <Markdown>{content}</Markdown>
            ) : (
              <p className="text-sm text-gray-400">Nada que previsualizar todavía.</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
