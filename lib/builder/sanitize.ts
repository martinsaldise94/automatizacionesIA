import type { Data } from '@measured/puck'

// Red de seguridad en RENDER: el `published_data` que viene de la DB solo puede
// contener bloques registrados, con forma de Puck válida. Un bloque desconocido
// (config vieja, JSON manipulado) se descarta en vez de romper la página.
// La validación FUERTE (zod, al publicar) es el Paso 7; esto es defensa en render.

type RawBlock = { type: string; props?: Record<string, unknown> }

export function sanitizePublishedData(raw: unknown, allowedTypes: string[]): Data {
  const allowed = new Set(allowedTypes)
  const obj = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {}

  const root =
    obj.root && typeof obj.root === 'object' ? (obj.root as Record<string, unknown>) : {}

  const contentRaw = Array.isArray(obj.content) ? obj.content : []
  const content = contentRaw.filter(
    (item): item is RawBlock =>
      !!item &&
      typeof item === 'object' &&
      typeof (item as RawBlock).type === 'string' &&
      allowed.has((item as RawBlock).type),
  )

  return { root, content } as Data
}
