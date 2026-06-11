import { describe, expect, it } from 'vitest'
import { RESERVED_SLUGS, validateSlug } from '@/lib/slug'

describe('validateSlug', () => {
  it('acepta slugs válidos', () => {
    expect(validateSlug('casapepe')).toBeNull()
    expect(validateSlug('casa-pepe-2')).toBeNull()
    expect(validateSlug('a1')).toBeNull()
  })

  it('rechaza mayúsculas, espacios y símbolos', () => {
    expect(validateSlug('CasaPepe')).not.toBeNull()
    expect(validateSlug('casa pepe')).not.toBeNull()
    expect(validateSlug('casa.pepe')).not.toBeNull()
    expect(validateSlug('casa_pepe')).not.toBeNull()
  })

  it('rechaza guiones al principio o al final', () => {
    expect(validateSlug('-casapepe')).not.toBeNull()
    expect(validateSlug('casapepe-')).not.toBeNull()
  })

  it('rechaza slug vacío', () => {
    expect(validateSlug('')).not.toBeNull()
  })

  it('rechaza más de 63 caracteres', () => {
    expect(validateSlug('a'.repeat(64))).not.toBeNull()
    expect(validateSlug('a'.repeat(63))).toBeNull()
  })

  it('rechaza todos los slugs reservados', () => {
    for (const reserved of RESERVED_SLUGS) {
      expect(validateSlug(reserved), `"${reserved}" debería estar reservado`).not.toBeNull()
    }
  })
})
