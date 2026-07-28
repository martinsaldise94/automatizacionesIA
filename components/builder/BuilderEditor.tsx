'use client'

import { useRef, useState } from 'react'
import { Puck, type Data } from '@measured/puck'
import '@measured/puck/puck.css'
import { builderConfig } from '@/lib/builder/config'
import { TenantProvider } from '@/components/builder/TenantProvider'
import type { TenantContext } from '@/lib/builder/tenant-context'
import { saveDraftAction } from '@/app/[tenant]/(portal)/builder/actions'

// Editor visual de UNA página. Cliente (Puck es interactivo). Envuelto en el
// mismo TenantProvider que el render público → los bloques que leen datos del
// tenant (Contact, Map) se ven igual en editor y en vivo.
//
// 6a: solo guarda borrador (draft_data). Publicar + validación zod = Paso 7;
// subida de imágenes = Paso 8. No se renderiza el botón "Publish" de Puck.
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
  // Último estado del editor, actualizado en cada cambio. El botón de guardar lee
  // de aquí (no hace falta subir el estado de Puck al padre).
  const dataRef = useRef<Data>(draftData as Data)
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')

  async function handleSave() {
    setStatus('saving')
    const res = await saveDraftAction(pageId, dataRef.current as unknown as Record<string, unknown>)
    setStatus(res.ok ? 'saved' : 'error')
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
            if (status !== 'idle') setStatus('idle')
          }}
          overrides={{
            // Reemplazamos los botones por defecto: en 6a solo "Guardar borrador".
            headerActions: () => (
              <div className="flex items-center gap-3">
                {status === 'saved' && <span className="text-sm text-green-600">Guardado</span>}
                {status === 'error' && <span className="text-sm text-red-600">Error al guardar</span>}
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={status === 'saving'}
                  className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
                >
                  {status === 'saving' ? 'Guardando…' : 'Guardar borrador'}
                </button>
              </div>
            ),
          }}
        />
      </div>
    </TenantProvider>
  )
}
