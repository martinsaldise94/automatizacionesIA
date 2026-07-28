import type { Data } from '@measured/puck'
import type { TenantConfig } from '@/lib/supabase/types'
import { builderConfig } from '@/lib/builder/config'
import type { BuilderComponents } from '@/lib/builder/config'

// Una plantilla = set de páginas iniciales + branding por defecto para un sector.
// Al crear un tenant se elige una y arranca con web completa (borrador y publicado
// iguales), que el cliente luego personaliza en el builder.
export type TemplatePage = {
  path: string
  title: string
  data: Data
}

export type Template = {
  key: string
  label: string
  // Config por defecto (branding/seo). Se fusiona sobre el config del tenant.
  config?: Partial<TenantConfig>
  pages: TemplatePage[]
}

// Helper: crea un bloque de Puck fusionando los defaultProps del bloque (fuente
// de verdad en config.tsx) con los overrides. Garantiza props completas y válidas
// aunque el schema del bloque crezca.
export function block<T extends keyof BuilderComponents>(
  type: T,
  props: Partial<BuilderComponents[T]> = {},
): { type: T; props: BuilderComponents[T] } {
  const defaults = builderConfig.components[type].defaultProps as BuilderComponents[T]
  return { type, props: { ...defaults, ...props } }
}

// Helper: crea una página de plantilla a partir de una lista de bloques.
export function page(
  path: string,
  title: string,
  blocks: Array<{ type: string; props: Record<string, unknown> }>,
): TemplatePage {
  return { path, title, data: { root: {}, content: blocks } as Data }
}
