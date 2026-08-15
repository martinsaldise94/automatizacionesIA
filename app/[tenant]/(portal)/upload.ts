'use server'

import { authorizePortal } from '@/lib/portal-auth'
import { createServiceClient } from '@/lib/supabase/service'
import {
  validateImageFile,
  extForImageMime,
  imageErrorMessage,
  buildAssetPath,
  STORAGE_BUCKET,
  type UploadResult,
} from '@/lib/builder/upload'

// Subida de imágenes del portal. Vive en su propio archivo (no dentro de
// builder/actions.ts) porque la usan DOS sitios: la portada de un post y, cuando
// se cierre el Paso 8, el campo de imagen de Puck — que además importa la config
// del builder y crearía un ciclo actions↔config.
//
// Seguridad: el tenant se resuelve en servidor (`authorizePortal`), el MIME se
// valida por su valor real (SVG prohibido) y el nombre del archivo lo generamos
// nosotros con un uuid → no hay inyección de ruta desde el cliente. La escritura
// va con service role, así que el aislamiento lo da la carpeta `{tenant_id}/`.
//
// ⚠️ Requiere el bucket `tenant-assets` creado (migración 0007_storage.sql).
export async function uploadImageAction(formData: FormData): Promise<UploadResult> {
  const tenantId = await authorizePortal()
  if (!tenantId) return { ok: false, error: 'No autorizado.' }

  const file = formData.get('file')
  if (!(file instanceof File)) return { ok: false, error: 'No se recibió ningún archivo.' }

  const check = validateImageFile(file.type, file.size)
  if (!check.ok) return { ok: false, error: imageErrorMessage(check.reason) }

  const ext = extForImageMime(file.type)!
  const path = buildAssetPath(tenantId, crypto.randomUUID(), ext)

  const supabase = createServiceClient()
  const { error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false })

  if (error) {
    // El fallo más probable en un entorno nuevo es que el bucket no exista aún.
    const falta = /bucket/i.test(error.message)
    return {
      ok: false,
      error: falta
        ? 'Falta el almacén de imágenes. Aplica la migración 0007_storage.sql en Supabase.'
        : 'No se pudo subir la imagen.',
    }
  }

  const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path)
  return { ok: true, url: data.publicUrl }
}
