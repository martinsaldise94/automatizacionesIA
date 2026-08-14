import { describe, expect, it } from 'vitest'
import { orderNav } from '@/lib/nav'

describe('orderNav', () => {
  it('pone la home primero y el resto por título', () => {
    const out = orderNav([
      { path: '/servicios', title: 'Servicios' },
      { path: '/', title: 'Inicio' },
      { path: '/contacto', title: 'Contacto' },
    ])
    expect(out.map((i) => i.path)).toEqual(['/', '/contacto', '/servicios'])
  })

  it('etiqueta la home como "Inicio" si el título viene vacío', () => {
    const out = orderNav([{ path: '/', title: '' }])
    expect(out[0].label).toBe('Inicio')
  })

  it('ordena con locale español (tildes)', () => {
    const out = orderNav([
      { path: '/z', title: 'Zapatos' },
      { path: '/a', title: 'Árboles' },
    ])
    expect(out.map((i) => i.title)).toEqual(['Árboles', 'Zapatos'])
  })

  it('lista vacía → []', () => {
    expect(orderNav([])).toEqual([])
  })
})
