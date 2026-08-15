'use client'

import { useRef, useState, useTransition } from 'react'
import {
  ALLOWED_IMAGE_MIME,
  imageErrorMessage,
  validateImageFile,
  type UploadResult,
} from '@/lib/builder/upload'

// Campo de imagen del portal: subir un archivo DEL EQUIPO o pegar una URL.
// Reutilizable — lo usa la portada del blog y lo usará el campo de imagen de
// Puck cuando se cierre el Paso 8.
//
// La validación se hace en los DOS lados a propósito: aquí para dar el error al
// instante sin gastar una subida, y en la server action porque el cliente no es
// de fiar. La del servidor es la que manda.

type Props = {
  value: string
  onChange: (url: string) => void
  onUpload: (formData: FormData) => Promise<UploadResult>
  label?: string
}

export function ImagePicker({ value, onChange, onUpload, label = 'Imagen' }: Props) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    // Permite volver a elegir el MISMO archivo tras un error (si no, el input no
    // vuelve a disparar change).
    e.target.value = ''
    if (!file) return

    setError(null)

    const check = validateImageFile(file.type, file.size)
    if (!check.ok) {
      setError(imageErrorMessage(check.reason))
      return
    }

    const formData = new FormData()
    formData.append('file', file)

    startTransition(async () => {
      const res = await onUpload(formData)
      if (res.ok) onChange(res.url)
      else setError(res.error)
    })
  }

  return (
    <div className="text-sm">
      <span className="text-gray-700">{label}</span>

      <div className="mt-1 flex items-start gap-3">
        {value ? (
          // Miniatura para confirmar que la imagen carga de verdad. <img> a pelo:
          // la URL es externa o del bucket, no pasa por el optimizador de Next.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={value}
            alt=""
            className="h-16 w-16 shrink-0 rounded-md border border-gray-200 object-cover"
          />
        ) : (
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-md border border-dashed border-gray-300 text-xs text-gray-400">
            sin
          </div>
        )}

        <div className="min-w-0 flex-1">
          <input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Pega una URL o sube un archivo"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 focus:border-gray-900 focus:outline-none"
          />

          <div className="mt-2 flex items-center gap-3">
            <input
              ref={fileRef}
              type="file"
              accept={ALLOWED_IMAGE_MIME.join(',')}
              onChange={onPick}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={pending}
              className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              {pending ? 'Subiendo…' : 'Subir del equipo'}
            </button>

            {value && !pending && (
              <button
                type="button"
                onClick={() => {
                  setError(null)
                  onChange('')
                }}
                className="text-sm text-gray-500 hover:text-gray-900"
              >
                Quitar
              </button>
            )}
          </div>

          <p className="mt-1 text-xs text-gray-500">JPG, PNG o WEBP. Máximo 5 MB.</p>
        </div>
      </div>

      {error && (
        <p role="alert" className="mt-2 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}
    </div>
  )
}
