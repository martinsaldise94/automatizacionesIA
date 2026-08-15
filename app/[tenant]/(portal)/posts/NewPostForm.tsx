'use client'

import { useState, useTransition } from 'react'
import { createPostAction } from './actions'

// Alta de post. En éxito navega en DURO al editor (window.location): un
// redirect() blando caería en 404 por el rewrite de tenant por host.
// La dirección se puede dejar vacía — se deriva del título en el servidor.
export function NewPostForm() {
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    setError(null)
    startTransition(async () => {
      const res = await createPostAction(formData)
      if (res.ok) {
        window.location.assign(`/posts/${res.postId}`)
      } else {
        setError(res.error)
      }
    })
  }

  return (
    <form onSubmit={onSubmit} className="mt-8 rounded-lg border border-gray-200 bg-white p-5">
      <h2 className="font-medium text-gray-900">Nuevo post</h2>
      <p className="mt-1 text-sm text-gray-500">
        Se crea como borrador. No se verá en tu web hasta que le des a Publicar.
      </p>

      {error && (
        <p role="alert" className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="text-gray-700">Título</span>
          <input
            name="title"
            required
            placeholder="Cinco ejercicios para la espalda"
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900"
          />
        </label>
        <label className="block text-sm">
          <span className="text-gray-700">Dirección (opcional)</span>
          <input
            name="slug"
            placeholder="Se saca del título"
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900"
          />
        </label>
      </div>
      <button
        type="submit"
        disabled={pending}
        className="mt-4 rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
      >
        {pending ? 'Creando…' : 'Crear post'}
      </button>
    </form>
  )
}
