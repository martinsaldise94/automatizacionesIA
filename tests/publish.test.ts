import { describe, expect, it } from 'vitest'
import { validatePuckData, MAX_PUBLISHED_BYTES } from '@/lib/builder/publish'

const ALLOWED = ['Hero', 'Services', 'FAQ']

describe('validatePuckData', () => {
  it('acepta datos válidos con bloques registrados', () => {
    const raw = {
      root: { props: { title: 'Home' } },
      content: [
        { type: 'Hero', props: { title: 'Hola' } },
        { type: 'FAQ', props: { items: [] } },
      ],
    }
    const res = validatePuckData(raw, ALLOWED)
    expect(res.ok).toBe(true)
    if (res.ok) {
      expect(res.data.content).toHaveLength(2)
      expect(res.data.root).toEqual({ props: { title: 'Home' } })
    }
  })

  it('rellena defaults cuando faltan root/content', () => {
    const res = validatePuckData({}, ALLOWED)
    expect(res.ok).toBe(true)
    if (res.ok) {
      expect(res.data.content).toEqual([])
      expect(res.data.root).toEqual({})
    }
  })

  it('rechaza un bloque no registrado (en content)', () => {
    const raw = { content: [{ type: 'Hero', props: {} }, { type: 'Malicioso', props: {} }] }
    const res = validatePuckData(raw, ALLOWED)
    expect(res.ok).toBe(false)
    if (!res.ok) expect(res.error).toContain('Malicioso')
  })

  it('rechaza un bloque no registrado dentro de zones', () => {
    const raw = {
      content: [{ type: 'Hero', props: {} }],
      zones: { 'Hero-1:zona': [{ type: 'Fantasma', props: {} }] },
    }
    const res = validatePuckData(raw, ALLOWED)
    expect(res.ok).toBe(false)
    if (!res.ok) expect(res.error).toContain('Fantasma')
  })

  it('acepta zones con bloques registrados', () => {
    const raw = {
      content: [{ type: 'Hero', props: {} }],
      zones: { 'Hero-1:zona': [{ type: 'Services', props: {} }] },
    }
    expect(validatePuckData(raw, ALLOWED).ok).toBe(true)
  })

  it('rechaza estructura inválida (content no es array)', () => {
    expect(validatePuckData({ content: 'no-array' }, ALLOWED).ok).toBe(false)
    expect(validatePuckData({ content: [{ noType: true }] }, ALLOWED).ok).toBe(false)
  })

  it('rechaza payloads que superan el límite de tamaño', () => {
    const big = 'x'.repeat(MAX_PUBLISHED_BYTES + 1)
    const raw = { content: [{ type: 'Hero', props: { text: big } }] }
    const res = validatePuckData(raw, ALLOWED)
    expect(res.ok).toBe(false)
    if (!res.ok) expect(res.error).toMatch(/grande/i)
  })

  it('rechaza contenido no serializable a JSON', () => {
    const circular: Record<string, unknown> = {}
    circular.self = circular
    expect(validatePuckData(circular, ALLOWED).ok).toBe(false)
  })
})
