import { describe, expect, it } from 'vitest'
import { orderNav, withBlogLink } from '@/lib/nav'

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

describe('withBlogLink', () => {
  const nav = orderNav([
    { path: '/', title: 'Inicio' },
    { path: '/servicios', title: 'Servicios' },
  ])

  it('añade Blog al final cuando hay posts publicados', () => {
    const out = withBlogLink(nav, true)
    expect(out.map((i) => i.path)).toEqual(['/', '/servicios', '/blog'])
    expect(out[2].label).toBe('Blog')
  })

  it('no anuncia el blog si no hay ningún post publicado', () => {
    // Mismo criterio que el sitemap: no enlazamos una ruta que devuelve 404.
    expect(withBlogLink(nav, false)).toEqual(nav)
  })

  it('no duplica el enlace si ya existe una página en /blog', () => {
    const conBlog = orderNav([
      { path: '/', title: 'Inicio' },
      { path: '/blog', title: 'Blog' },
    ])
    expect(withBlogLink(conBlog, true)).toHaveLength(2)
  })

  it('no muta el array de entrada', () => {
    const original = [...nav]
    withBlogLink(nav, true)
    expect(nav).toEqual(original)
  })
})
