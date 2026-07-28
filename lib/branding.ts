import type { BrandingConfig } from '@/lib/supabase/types'

// Traduce el branding del tenant (config.branding) a CSS variables que consumen
// los bloques (--brand-primary, --brand-primary-fg, etc.). Se inyectan en el
// layout de [tenant]; lo que no se defina hereda los defaults de globals.css.
//
// El color de texto (*-fg) se calcula por contraste (negro o blanco sobre el
// color de marca) para garantizar legibilidad — lógica pura y testeable.

const HEX = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/

// Expande #abc → #aabbcc.
function normalizeHex(hex: string): string | null {
  if (!HEX.test(hex)) return null
  const h = hex.slice(1)
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h
  return '#' + full.toLowerCase()
}

// Luminancia relativa (WCAG) para decidir el color de texto legible encima.
function relativeLuminance(hex: string): number {
  const h = hex.slice(1)
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255)
  const lin = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)
}

// Devuelve un color de texto legible (oscuro o claro) sobre `bg`. Si el color no
// es hex válido, asume fondo claro → texto oscuro.
export function contrastColor(bg: string): string {
  const norm = normalizeHex(bg)
  if (!norm) return '#111111'
  return relativeLuminance(norm) > 0.5 ? '#111111' : '#ffffff'
}

// Construye el objeto de CSS variables para el style inline del layout. Solo
// incluye las que tienen valor válido → el resto hereda el default de globals.css.
export function brandingCssVars(branding: Partial<BrandingConfig> | undefined): Record<string, string> {
  const vars: Record<string, string> = {}
  if (!branding) return vars

  const primary = branding.primaryColor && normalizeHex(branding.primaryColor)
  if (primary) {
    vars['--brand-primary'] = primary
    vars['--brand-primary-fg'] = contrastColor(primary)
  }

  const secondary = branding.secondaryColor && normalizeHex(branding.secondaryColor)
  if (secondary) {
    vars['--brand-secondary'] = secondary
    vars['--brand-secondary-fg'] = contrastColor(secondary)
  }

  if (branding.fontFamily && branding.fontFamily.trim()) {
    vars['--brand-font'] = branding.fontFamily.trim()
  }

  return vars
}
