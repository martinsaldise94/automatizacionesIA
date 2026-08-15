import { describe, expect, it } from 'vitest'
import {
  validateImageFile,
  extForImageMime,
  buildAssetPath,
  imageErrorMessage,
  MAX_IMAGE_BYTES,
} from '@/lib/builder/upload'

describe('validateImageFile', () => {
  it('acepta jpg/png/webp con tamaño válido', () => {
    expect(validateImageFile('image/jpeg', 1000).ok).toBe(true)
    expect(validateImageFile('image/png', 1000).ok).toBe(true)
    expect(validateImageFile('image/webp', 1000).ok).toBe(true)
    expect(validateImageFile('IMAGE/PNG', 1000).ok).toBe(true) // case-insensitive
  })

  it('rechaza SVG y otros tipos (seguridad)', () => {
    const svg = validateImageFile('image/svg+xml', 1000)
    expect(svg.ok).toBe(false)
    if (!svg.ok) expect(svg.reason).toBe('tipo')
    expect(validateImageFile('image/gif', 1000).ok).toBe(false)
    expect(validateImageFile('application/pdf', 1000).ok).toBe(false)
    expect(validateImageFile('', 1000).ok).toBe(false)
  })

  it('rechaza tamaños inválidos o excesivos', () => {
    expect(validateImageFile('image/png', 0).ok).toBe(false)
    expect(validateImageFile('image/png', -1).ok).toBe(false)
    expect(validateImageFile('image/png', Number.NaN).ok).toBe(false)
    const big = validateImageFile('image/png', MAX_IMAGE_BYTES + 1)
    expect(big.ok).toBe(false)
    if (!big.ok) expect(big.reason).toBe('tamano')
    expect(validateImageFile('image/png', MAX_IMAGE_BYTES).ok).toBe(true) // borde
  })
})

describe('extForImageMime', () => {
  it('mapea MIME permitido a extensión', () => {
    expect(extForImageMime('image/jpeg')).toBe('jpg')
    expect(extForImageMime('image/png')).toBe('png')
    expect(extForImageMime('image/webp')).toBe('webp')
  })
  it('devuelve null para MIME no permitido', () => {
    expect(extForImageMime('image/svg+xml')).toBeNull()
    expect(extForImageMime('')).toBeNull()
  })
})

describe('buildAssetPath', () => {
  it('construye {tenant}/{id}.{ext}', () => {
    expect(buildAssetPath('t1', 'abc', 'png')).toBe('t1/abc.png')
  })
})

describe('imageErrorMessage', () => {
  // El mismo texto lo usan la server action y la validación temprana del
  // componente cliente. Si se duplicaran, acabarían diciendo cosas distintas.
  it('explica el formato no permitido sin jerga', () => {
    expect(imageErrorMessage('tipo')).toContain('JPG, PNG o WEBP')
  })

  it('explica el límite de tamaño', () => {
    expect(imageErrorMessage('tamano')).toContain('5 MB')
  })

  it('cubre todas las razones de rechazo de validateImageFile', () => {
    const svg = validateImageFile('image/svg+xml', 100)
    const enorme = validateImageFile('image/png', MAX_IMAGE_BYTES + 1)
    expect(svg.ok).toBe(false)
    expect(enorme.ok).toBe(false)
    if (!svg.ok) expect(imageErrorMessage(svg.reason)).toBeTruthy()
    if (!enorme.ok) expect(imageErrorMessage(enorme.reason)).toBeTruthy()
  })
})
