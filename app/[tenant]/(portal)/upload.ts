'use server'

import { authorizePortal } from '@/lib/portal-auth'
import { createServiceClient } from '@/lib/supabase/service'
import {
  validateImageFile,
  extForImageMime,
  imageErrorMessage,
  buildAssetPath,
  sniffImageMime,
  SNIFF_BYTES,
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

  // El tamaño sí se puede creer (lo mide el runtime, no el cliente). El tipo
  // declarado se usa solo para dar el error de formato en su versión amable.
  const check = validateImageFile(file.type, file.size)
  if (!check.ok) return { ok: false, error: imageErrorMessage(check.reason) }

  // LO QUE MANDA SON LOS BYTES, no `file.type`. Ese lo declara el navegador:
  // renombrar un .html a .jpg y anunciarlo como image/jpeg no cuesta nada.
  // A partir de aquí se ignora lo que el cliente dijo y se usa el formato real
  // —también para el `contentType` con el que se sirve y para la extensión—,
  // así que un desajuste no puede colarse por ningún lado.
  const cabecera = new Uint8Array(await file.slice(0, SNIFF_BYTES).arrayBuffer())
  const mimeReal = sniffImageMime(cabecera)

  if (!mimeReal) return { ok: false, error: imageErrorMessage('tipo') }

  const ext = extForImageMime(mimeReal)!
  const path = buildAssetPath(tenantId, crypto.randomUUID(), ext)

  const supabase = createServiceClient()
  const { error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(path, file, { contentType: mimeReal, upsert: false })

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
