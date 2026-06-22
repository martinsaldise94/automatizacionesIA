import { describe, expect, it } from 'vitest'
import { buildMapEmbedUrl } from '@/lib/builder/map'

describe('buildMapEmbedUrl', () => {
  it('construye la URL de embed con la dirección codificada', () => {
    const url = buildMapEmbedUrl('Calle Mayor 1, Madrid', 15)
    expect(url).toContain('output=embed')
    expect(url).toContain('z=15')
    expect(url).toContain('q=Calle%20Mayor%201%2C%20Madrid')
    expect(url?.startsWith('https://www.google.com/maps?')).toBe(true)
  })

  it('devuelve null si no hay dirección', () => {
    expect(buildMapEmbedUrl('', 15)).toBeNull()
    expect(buildMapEmbedUrl('   ', 15)).toBeNull()
  })

  it('clampa el zoom fuera de rango y maneja valores no finitos', () => {
    expect(buildMapEmbedUrl('x', 99)).toContain('z=20')
    expect(buildMapEmbedUrl('x', -5)).toContain('z=1')
    expect(buildMapEmbedUrl('x', Number.NaN)).toContain('z=15')
  })
})
