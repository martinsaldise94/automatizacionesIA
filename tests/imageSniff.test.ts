import { describe, expect, it } from 'vitest'
import { SNIFF_BYTES, sniffImageMime } from '@/lib/builder/upload'

// Cabeceras reales de cada formato, seguidas de relleno.
const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0])
const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0, 0, 0])
const webp = new Uint8Array([
  0x52, 0x49, 0x46, 0x46, // "RIFF"
  0x24, 0x00, 0x00, 0x00, // tamaño (irrelevante)
  0x57, 0x45, 0x42, 0x50, // "WEBP"
  0, 0,
])

describe('sniffImageMime', () => {
  it('reconoce los tres formatos permitidos por su cabecera', () => {
    expect(sniffImageMime(jpeg)).toBe('image/jpeg')
    expect(sniffImageMime(png)).toBe('image/png')
    expect(sniffImageMime(webp)).toBe('image/webp')
  })

  it('rechaza un SVG aunque se presente como imagen', () => {
    // SVG es XML y puede llevar <script>. Está prohibido a propósito, y este
    // es el punto donde la prohibición deja de depender de lo que diga el
    // navegador: un SVG no tiene la cabecera de ninguno de los tres.
    const svg = new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg"><script>')
    expect(sniffImageMime(svg)).toBeNull()
  })

  it('rechaza HTML, scripts y ejecutables', () => {
    const html = new TextEncoder().encode('<!DOCTYPE html><html><script>alert(1)</script>')
    const elf = new Uint8Array([0x7f, 0x45, 0x4c, 0x46, 0, 0, 0, 0, 0, 0, 0, 0])
    const exe = new Uint8Array([0x4d, 0x5a, 0x90, 0x00, 0, 0, 0, 0, 0, 0, 0, 0])

    expect(sniffImageMime(html)).toBeNull()
    expect(sniffImageMime(elf)).toBeNull()
    expect(sniffImageMime(exe)).toBeNull()
  })

  it('un RIFF que NO es WEBP no cuela', () => {
    // Un WAV empieza igual ("RIFF"); lo que lo distingue son los bytes 8-11.
    // Comprobar solo el prefijo dejaría pasar cualquier contenedor RIFF.
    const wav = new Uint8Array([
      0x52, 0x49, 0x46, 0x46,
      0x24, 0x00, 0x00, 0x00,
      0x57, 0x41, 0x56, 0x45, // "WAVE"
      0, 0,
    ])
    expect(sniffImageMime(wav)).toBeNull()
  })

  it('un archivo demasiado corto para tener cabecera se rechaza', () => {
    expect(sniffImageMime(new Uint8Array([]))).toBeNull()
    expect(sniffImageMime(new Uint8Array([0xff, 0xd8]))).toBeNull()
    expect(sniffImageMime(new Uint8Array([0x52, 0x49, 0x46, 0x46]))).toBeNull()
  })

  it('aguanta que no le llegue un Uint8Array', () => {
    expect(sniffImageMime(null as never)).toBeNull()
    expect(sniffImageMime(undefined as never)).toBeNull()
  })

  it('SNIFF_BYTES basta para el formato que más cabecera necesita', () => {
    // WEBP necesita leer hasta el byte 11. Si alguien baja esta constante,
    // los WEBP dejarían de reconocerse y se rechazarían todos.
    expect(SNIFF_BYTES).toBeGreaterThanOrEqual(12)
  })
})
