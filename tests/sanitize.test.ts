import { describe, expect, it } from 'vitest'
import { sanitizePublishedData } from '@/lib/builder/sanitize'

const ALLOWED = ['Hero', 'Services', 'Contact']

describe('sanitizePublishedData', () => {
  it('conserva los bloques registrados', () => {
    const data = sanitizePublishedData(
      {
        root: { props: {} },
        content: [
          { type: 'Hero', props: { id: 'h1', title: 'Hola' } },
          { type: 'Services', props: { id: 's1' } },
        ],
      },
      ALLOWED,
    )
    expect(data.content).toHaveLength(2)
    expect(data.content.map((b) => b.type)).toEqual(['Hero', 'Services'])
  })

  it('descarta bloques NO registrados (config vieja o JSON manipulado)', () => {
    const data = sanitizePublishedData(
      {
        root: {},
        content: [
          { type: 'Hero', props: { id: 'h1' } },
          { type: 'EvilBlock', props: { id: 'x' } },
          { type: 'Unknown', props: {} },
        ],
      },
      ALLOWED,
    )
    expect(data.content.map((b) => b.type)).toEqual(['Hero'])
  })

  it('maneja data malformada sin romper', () => {
    expect(sanitizePublishedData(null, ALLOWED)).toEqual({ root: {}, content: [] })
    expect(sanitizePublishedData('texto', ALLOWED)).toEqual({ root: {}, content: [] })
    expect(sanitizePublishedData({ content: 'no-array' }, ALLOWED)).toEqual({ root: {}, content: [] })
    expect(sanitizePublishedData({}, ALLOWED)).toEqual({ root: {}, content: [] })
  })

  it('descarta items de content que no son bloques válidos', () => {
    const data = sanitizePublishedData(
      { content: [null, 'x', 42, { noType: true }, { type: 'Hero', props: {} }] },
      ALLOWED,
    )
    expect(data.content).toHaveLength(1)
  })
})
