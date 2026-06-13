import { beforeEach, describe, expect, it, vi } from 'vitest'

// El provider de Anthropic se mockea: `anthropic(model)` devuelve un centinela
// con el nombre de modelo recibido, para poder afirmar qué se resolvió sin
// llamar a la API real ni necesitar API key.
vi.mock('@ai-sdk/anthropic', () => ({
  anthropic: vi.fn((model: string) => ({ __provider: 'anthropic', __model: model })),
}))

import { anthropic } from '@ai-sdk/anthropic'
import { resolveModel } from '@/lib/ai/provider'

const DEFAULT_MODEL = 'claude-haiku-4-5-20251001'

// helper: extrae el nombre de modelo del centinela
const modelOf = (m: unknown) => (m as { __model: string }).__model

describe('resolveModel', () => {
  beforeEach(() => { vi.mocked(anthropic).mockClear() })

  it('sin modelo usa el por defecto (anthropic)', () => {
    expect(modelOf(resolveModel())).toBe(DEFAULT_MODEL)
    expect(modelOf(resolveModel(undefined))).toBe(DEFAULT_MODEL)
    expect(modelOf(resolveModel(null))).toBe(DEFAULT_MODEL)
    expect(modelOf(resolveModel('   '))).toBe(DEFAULT_MODEL)
  })

  it('sin prefijo asume anthropic (retrocompat con ai_config actuales)', () => {
    expect(modelOf(resolveModel('claude-sonnet-4-5'))).toBe('claude-sonnet-4-5')
  })

  it('respeta el prefijo de proveedor anthropic', () => {
    expect(modelOf(resolveModel('anthropic:claude-opus-4-5'))).toBe('claude-opus-4-5')
  })

  it('proveedor desconocido cae al por defecto sin lanzar', () => {
    // p.ej. ollama aún no registrado: no debe tumbar el chat del tenant
    expect(modelOf(resolveModel('ollama:llama3.1'))).toBe(DEFAULT_MODEL)
  })

  it('solo separa por el primer ":" (nombres con ":" se conservan)', () => {
    expect(modelOf(resolveModel('anthropic:claude:raro'))).toBe('claude:raro')
  })
})
