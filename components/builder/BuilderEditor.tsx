'use client'

import { useRef, useState } from 'react'
import { Puck, type Data } from '@measured/puck'
import '@measured/puck/puck.css'
import { builderConfig } from '@/lib/builder/config'
import { TenantProvider } from '@/components/builder/TenantProvider'
import type { TenantContext } from '@/lib/builder/tenant-context'
import { saveDraftAction, publishAction } from '@/app/[tenant]/(portal)/builder/actions'

// Editor visual de UNA página. Cliente (Puck es interactivo). Envuelto en el
// mismo TenantProvider que el render público → los bloques que leen datos del
// tenant (Contact, Map) se ven igual en editor y en vivo.
//
// Guardar borrador → draft_data. Publicar (Paso 7) → valida server-side (zod) y
// copia a published_data. Subida de imágenes = Paso 8. Sin el botón "Publish" de Puck.
export function BuilderEditor({
  pageId,
  title,
  path,
  draftData,
  tenantContext,
}: {
  pageId: string
  title: string
  path: string
  draftData: Record<string, unknown>
  tenantContext: TenantContext
}) {
  // Último estado del editor, actualizado en cada cambio. Los botones leen de
  // aquí (no hace falta subir el estado de Puck al padre).
  const dataRef = useRef<Data>(draftData as Data)
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'publishing' | 'published'>(
    'idle',
  )
  const [error, setError] = useState<string | null>(null)

  const busy = status === 'saving' || status === 'publishing'

  async function handleSave() {
    setStatus('saving')
    setError(null)
    const res = await saveDraftAction(pageId, dataRef.current as unknown as Record<string, unknown>)
    if (res.ok) setStatus('saved')
    else {
      setStatus('idle')
      setError(res.error ?? 'No se pudo guardar.')
    }
  }

  async function handlePublish() {
    setStatus('publishing')
    setError(null)
    const res = await publishAction(pageId, dataRef.current as unknown as Record<string, unknown>)
    if (res.ok) setStatus('published')
    else {
      setStatus('idle')
      setError(res.error ?? 'No se pudo publicar.')
    }
  }

  return (
    <TenantProvider value={tenantContext}>
      <div className="h-[calc(100vh-3rem)]">
        <Puck
          config={builderConfig}
          data={draftData as Data}
          headerTitle={title}
          headerPath={path}
          onChange={(data) => {
            dataRef.current = data
            if (status !== 'idle' || error) {
              setStatus('idle')
              setError(null)
            }
          }}
          overrides={{
            // Botones propios: guardar borrador y publicar (sin el "Publish" de Puck).
            headerActions: () => (
              <div className="flex items-center gap-3">
                {error && <span className="text-sm text-red-600">{error}</span>}
                {status === 'saved' && <span className="text-sm text-green-600">Guardado</span>}
                {status === 'published' && (
                  <span className="text-sm text-green-600">Publicado</span>
                )}
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={busy}
                  className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50 disabled:opacity-50"
                >
                  {status === 'saving' ? 'Guardando…' : 'Guardar borrador'}
                </button>
                <button
                  type="button"
                  onClick={handlePublish}
                  disabled={busy}
                  className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
                >
                  {status === 'publishing' ? 'Publicando…' : 'Publicar'}
                </button>
              </div>
            ),
          }}
        />
      </div>
    </TenantProvider>
  )
}
