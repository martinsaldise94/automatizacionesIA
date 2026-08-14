import type { Template } from './types'
import { clinica, restaurante, consultoria, estetica } from './sectors'

export type { Template, TemplatePage } from './types'

// Registro de plantillas disponibles. Añadir un sector = crear su Template y
// listarlo aquí. La clave 'blank' (sin plantilla) se maneja como ausencia.
export const TEMPLATES: Template[] = [clinica, restaurante, consultoria, estetica]

export function getTemplate(key: string): Template | null {
  return TEMPLATES.find((t) => t.key === key) ?? null
}

// Para el <select> del admin: [{ key, label }].
export function listTemplates(): Array<{ key: string; label: string }> {
  return TEMPLATES.map((t) => ({ key: t.key, label: t.label }))
}
