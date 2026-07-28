import { describe, expect, it } from 'vitest'
import { brandingCssVars, contrastColor } from '@/lib/branding'

describe('contrastColor', () => {
  it('devuelve texto claro sobre fondo oscuro y oscuro sobre claro', () => {
    expect(contrastColor('#000000')).toBe('#ffffff')
    expect(contrastColor('#111827')).toBe('#ffffff')
    expect(contrastColor('#ffffff')).toBe('#111111')
    expect(contrastColor('#fde047')).toBe('#111111') // amarillo claro
  })

  it('expande hex de 3 dígitos', () => {
    expect(contrastColor('#000')).toBe('#ffffff')
    expect(contrastColor('#fff')).toBe('#111111')
  })

  it('cae a texto oscuro si el hex es inválido', () => {
    expect(contrastColor('rojo')).toBe('#111111')
    expect(contrastColor('#12')).toBe('#111111')
    expect(contrastColor('')).toBe('#111111')
  })
})

describe('brandingCssVars', () => {
  it('genera vars de primario/secundario con su contraste', () => {
    const v = brandingCssVars({ primaryColor: '#0f766e', secondaryColor: '#ffffff' })
    expect(v['--brand-primary']).toBe('#0f766e')
    expect(v['--brand-primary-fg']).toBe('#ffffff')
    expect(v['--brand-secondary']).toBe('#ffffff')
    expect(v['--brand-secondary-fg']).toBe('#111111')
  })

  it('incluye la fuente si se define', () => {
    expect(brandingCssVars({ primaryColor: '#000000', fontFamily: 'Georgia, serif' })['--brand-font']).toBe(
      'Georgia, serif',
    )
  })

  it('omite las vars sin valor válido (heredan el default)', () => {
    const v = brandingCssVars({ primaryColor: 'no-hex', secondaryColor: '#000000' })
    expect(v['--brand-primary']).toBeUndefined()
    expect(v['--brand-secondary']).toBe('#000000')
    expect(brandingCssVars(undefined)).toEqual({})
    expect(brandingCssVars({})).toEqual({})
  })
})
