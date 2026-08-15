// Destino final de un botón de llamada a la acción. Lógica pura → testeable.
//
// El número de WhatsApp sale de `config.contact.whatsapp` del tenant, no de una
// prop del bloque: el dueño lo teclea UNA vez en su ficha y todos los CTA lo
// usan. Si cambia de número, cambia en un sitio.
//
// Devuelve null cuando no hay destino válido. El bloque entonces NO pinta el
// botón: uno que apunta a '#' parece que funciona y no hace nada, que para el
// visitante es peor que no verlo.

export type CtaType = 'whatsapp' | 'booking' | 'link'

export type CtaLink = { href: string; external: boolean }

// Solo rutas del propio sitio o http(s). Corta javascript:/data:/vbscript:,
// que acabarían en el href de un <a> tecleado por el dueño.
const SAFE_HREF = /^(https?:\/\/|\/)/i
const isExternal = (href: string) => /^https?:\/\//i.test(href)

export function resolveCtaLink(
  ctaType: CtaType,
  ctaHref: string,
  whatsappNumber: string | undefined,
): CtaLink | null {
  if (ctaType === 'whatsapp') {
    // wa.me quiere solo dígitos, sin '+' ni separadores.
    const digits = (whatsappNumber ?? '').replace(/\D/g, '')
    if (!digits) return null
    return { href: `https://wa.me/${digits}`, external: true }
  }

  const manual = (ctaHref ?? '').trim()

  if (ctaType === 'booking') {
    const href = manual || '/reservar'
    if (!SAFE_HREF.test(href)) return null
    return { href, external: isExternal(href) }
  }

  if (!manual || !SAFE_HREF.test(manual)) return null
  return { href: manual, external: isExternal(manual) }
}
