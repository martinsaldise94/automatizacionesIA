import { describe, expect, it } from 'vitest'
import { resolveCtaLink } from '@/lib/builder/cta'

describe('resolveCtaLink', () => {
  // BUG que arregla esto: el bloque CTA pasaba ctaType='whatsapp' al Button
  // pero nunca le pasaba el número, así que Button caía a `href || '#'`. El
  // botón "Hablar por WhatsApp" —que es el CTA por defecto del bloque— no
  // llevaba a WhatsApp. El número vive en config.contact.whatsapp del tenant,
  // NO en una prop editable: el dueño no debe teclearlo dos veces.

  it('construye el enlace de WhatsApp con el número del tenant', () => {
    const link = resolveCtaLink('whatsapp', '', '+34 600 11 22 33')
    expect(link).toEqual({ href: 'https://wa.me/34600112233', external: true })
  })

  it('limpia espacios, signos y el prefijo + del número', () => {
    expect(resolveCtaLink('whatsapp', '', '(+34) 600-11-22-33')?.href).toBe(
      'https://wa.me/34600112233',
    )
  })

  it('NO renderiza el botón de WhatsApp si el tenant no tiene número', () => {
    // Un botón a '#' es peor que ningún botón: parece que funciona y no hace
    // nada. Devolver null deja que el bloque lo oculte.
    expect(resolveCtaLink('whatsapp', '', '')).toBeNull()
    expect(resolveCtaLink('whatsapp', '', undefined)).toBeNull()
  })

  it('ignora el enlace manual cuando el tipo es WhatsApp', () => {
    // Si el tipo es WhatsApp, manda el número del tenant. Si no, un ctaHref
    // olvidado de otro tipo se colaría como destino.
    expect(resolveCtaLink('whatsapp', 'https://otra-cosa.com', '600112233')?.href).toBe(
      'https://wa.me/600112233',
    )
  })

  it('reserva usa /reservar por defecto', () => {
    expect(resolveCtaLink('booking', '', '600112233')).toEqual({
      href: '/reservar',
      external: false,
    })
  })

  it('reserva respeta un enlace propio si lo hay', () => {
    expect(resolveCtaLink('booking', '/pedir-cita', '')?.href).toBe('/pedir-cita')
  })

  it('enlace normal usa el href tal cual', () => {
    expect(resolveCtaLink('link', '/servicios', '')).toEqual({
      href: '/servicios',
      external: false,
    })
  })

  it('marca como externo un enlace http(s)', () => {
    expect(resolveCtaLink('link', 'https://ejemplo.com', '')).toEqual({
      href: 'https://ejemplo.com',
      external: true,
    })
  })

  it('NO renderiza un enlace vacío', () => {
    expect(resolveCtaLink('link', '', '')).toBeNull()
  })

  it('rechaza esquemas peligrosos en el enlace manual', () => {
    // El ctaHref lo teclea el dueño; acaba en un href.
    for (const href of ['javascript:alert(1)', 'data:text/html,x', 'vbscript:x']) {
      expect(resolveCtaLink('link', href, '')).toBeNull()
    }
  })
})
