import { describe, expect, it } from 'vitest'
import { normalizePagePath } from '@/lib/builder/pagePath'

describe('normalizePagePath', () => {
  it('trata vacío y "/" como home', () => {
    expect(normalizePagePath('')).toEqual({ ok: true, path: '/' })
    expect(normalizePagePath('   ')).toEqual({ ok: true, path: '/' })
    expect(normalizePagePath('/')).toEqual({ ok: true, path: '/' })
  })

  it('añade la barra inicial y baja a minúsculas', () => {
    expect(normalizePagePath('Servicios')).toEqual({ ok: true, path: '/servicios' })
    expect(normalizePagePath('/Sobre-Nosotros')).toEqual({ ok: true, path: '/sobre-nosotros' })
  })

  it('quita la barra final y colapsa barras dobles', () => {
    expect(normalizePagePath('/servicios/')).toEqual({ ok: true, path: '/servicios' })
    expect(normalizePagePath('//sobre//equipo//')).toEqual({ ok: true, path: '/sobre/equipo' })
  })

  it('acepta rutas anidadas válidas', () => {
    expect(normalizePagePath('/sobre-nosotros/equipo')).toEqual({
      ok: true,
      path: '/sobre-nosotros/equipo',
    })
  })

  it('rechaza caracteres no permitidos', () => {
    expect(normalizePagePath('/Servicios y Más').ok).toBe(false)
    expect(normalizePagePath('/café').ok).toBe(false)
    expect(normalizePagePath('/foo_bar').ok).toBe(false)
    expect(normalizePagePath('/foo bar').ok).toBe(false)
  })

  it('rechaza guiones mal colocados', () => {
    expect(normalizePagePath('/-foo').ok).toBe(false)
    expect(normalizePagePath('/foo-').ok).toBe(false)
    expect(normalizePagePath('/foo--bar').ok).toBe(false)
  })

  it('rechaza el primer segmento si es una ruta reservada del sistema', () => {
    expect(normalizePagePath('/builder').ok).toBe(false)
    expect(normalizePagePath('/blog').ok).toBe(false)
    expect(normalizePagePath('/api/cosa').ok).toBe(false)
    expect(normalizePagePath('/auth').ok).toBe(false)
    expect(normalizePagePath('/reservar').ok).toBe(false)
  })

  it('permite una ruta reservada como segmento NO inicial', () => {
    expect(normalizePagePath('/sobre/blog')).toEqual({ ok: true, path: '/sobre/blog' })
  })

  it('rechaza rutas excesivamente largas', () => {
    expect(normalizePagePath('/' + 'a'.repeat(300)).ok).toBe(false)
  })
})
