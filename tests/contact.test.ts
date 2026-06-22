import { describe, expect, it } from 'vitest'
import { buildContactItems } from '@/lib/builder/contact'

describe('buildContactItems', () => {
  it('construye los enlaces correctos para cada campo', () => {
    const items = buildContactItems({
      phone: '+34 600 11 22 33',
      whatsapp: '+34 600 11 22 33',
      email: 'hola@demo.com',
      address: 'Calle Mayor 1, Madrid',
      hours: 'L-V 9-18',
    })
    const byType = Object.fromEntries(items.map((i) => [i.type, i]))

    expect(byType.phone.href).toBe('tel:+34600112233')
    expect(byType.whatsapp.href).toBe('https://wa.me/34600112233')
    expect(byType.email.href).toBe('mailto:hola@demo.com')
    expect(byType.address.href).toBe('https://www.google.com/maps?q=Calle%20Mayor%201%2C%20Madrid')
    expect(byType.hours.href).toBeUndefined() // el horario no es un enlace
  })

  it('omite los campos ausentes o vacíos', () => {
    const items = buildContactItems({ phone: '600112233', email: '   ' })
    expect(items.map((i) => i.type)).toEqual(['phone'])
  })

  it('devuelve [] si no hay contacto', () => {
    expect(buildContactItems({})).toEqual([])
  })
})
