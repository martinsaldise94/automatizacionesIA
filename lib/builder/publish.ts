import { z } from 'zod'
import type { Data } from '@measured/puck'

// Validación server-side ANTES de publicar (Paso 7). Es la barrera dura: la web
// pública solo renderiza `published_data`, así que aquí garantizamos que el JSON
// que sale de Puck es estructuralmente sano y SOLO contiene bloques registrados.
// (En render hay una segunda red, `sanitizePublishedData`, que descarta lo raro;
// esto es la validación FUERTE que decide si se publica o no.)

// Límite de tamaño del JSON publicado (defensa contra payloads enormes).
export const MAX_PUBLISHED_BYTES = 512 * 1024 // 512 KB

export type PublishValidation = { ok: true; data: Data } | { ok: false; error: string }

// Un bloque de Puck: type + props (objeto serializable). Otros campos se descartan.
const blockSchema = z.object({
  type: z.string(),
  props: z.record(z.string(), z.unknown()).optional(),
})

const dataSchema = z.object({
  root: z.record(z.string(), z.unknown()).optional().default({}),
  content: z.array(blockSchema).optional().default([]),
  // zones (DropZones anidadas) aún no se usan (Paso 11); se aceptan por forma.
  zones: z.record(z.string(), z.array(blockSchema)).optional(),
})

// Valida el JSON de Puck contra la lista de bloques registrados. Devuelve el dato
// saneado (con defaults) o un error legible. NO publica nada; solo decide.
export function validatePuckData(raw: unknown, allowedTypes: string[]): PublishValidation {
  // 1) Tamaño (y que sea serializable a JSON).
  let jsonStr: string
  try {
    jsonStr = JSON.stringify(raw)
  } catch {
    return { ok: false, error: 'El contenido no es un JSON válido.' }
  }
  if (!jsonStr || jsonStr === 'undefined') {
    return { ok: false, error: 'No hay contenido que publicar.' }
  }
  // Bytes reales (no longitud de string) por si hay multibyte.
  if (Buffer.byteLength(jsonStr, 'utf8') > MAX_PUBLISHED_BYTES) {
    return { ok: false, error: 'La página es demasiado grande para publicar.' }
  }

  // 2) Estructura.
  const parsed = dataSchema.safeParse(raw)
  if (!parsed.success) {
    return { ok: false, error: 'La estructura de la página no es válida.' }
  }

  // 3) Solo bloques registrados (en content y en zones).
  const allowed = new Set(allowedTypes)
  const blocks = [
    ...parsed.data.content,
    ...Object.values(parsed.data.zones ?? {}).flat(),
  ]
  const unknownBlock = blocks.find((b) => !allowed.has(b.type))
  if (unknownBlock) {
    return { ok: false, error: `Bloque no reconocido: "${unknownBlock.type}".` }
  }

  return { ok: true, data: parsed.data as Data }
}
