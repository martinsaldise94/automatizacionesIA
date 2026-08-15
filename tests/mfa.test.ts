import { describe, it, expect } from 'vitest'
import { mfaGate, hasVerifiedTotp, normalizeTotpCode } from '@/lib/mfa'

describe('mfaGate', () => {
  it('sesión ya elevada → pasa', () => {
    expect(mfaGate({ currentLevel: 'aal2', nextLevel: 'aal2' })).toBe('ok')
  })

  it('factor enrolado pero sesión sin verificar → pide el código', () => {
    expect(mfaGate({ currentLevel: 'aal1', nextLevel: 'aal2' })).toBe('challenge')
  })

  it('sin ningún factor → manda a enrolar', () => {
    expect(mfaGate({ currentLevel: 'aal1', nextLevel: 'aal1' })).toBe('enroll')
  })

  it('factor eliminado (aal2 → aal1) → vuelve a enrolar', () => {
    // El admin borró su autenticador. La sesión sigue siendo aal2, pero ya no
    // hay segundo factor: dejarle seguir sería quedarse sin MFA sin enterarse.
    expect(mfaGate({ currentLevel: 'aal2', nextLevel: 'aal1' })).toBe('enroll')
  })

  it('niveles desconocidos → enrolar, que es la salida recuperable', () => {
    // Ante un error al leer los niveles NO se elige 'ok' (abriría la puerta)
    // ni un rechazo seco (dejaría al admin fuera de su propia plataforma sin
    // forma de volver). 'enroll' no concede acceso por sí solo: hay que
    // verificar un código para que la sesión suba a aal2.
    expect(mfaGate({ currentLevel: null, nextLevel: null })).toBe('enroll')
    expect(mfaGate({ currentLevel: 'raro', nextLevel: 'raro' })).toBe('enroll')
    expect(mfaGate(null)).toBe('enroll')
  })

  it('nunca devuelve "ok" si la sesión no es aal2', () => {
    const combos = ['aal1', 'aal2', 'raro', null]
    for (const current of combos) {
      for (const next of combos) {
        const gate = mfaGate({ currentLevel: current, nextLevel: next })
        if (gate === 'ok') expect(current).toBe('aal2')
      }
    }
  })
})

describe('hasVerifiedTotp', () => {
  it('solo cuenta los factores verificados', () => {
    expect(hasVerifiedTotp([{ id: '1', status: 'verified' }])).toBe(true)
    expect(hasVerifiedTotp([{ id: '1', status: 'unverified' }])).toBe(false)
  })

  it('lista vacía o ausente → no hay factor', () => {
    expect(hasVerifiedTotp([])).toBe(false)
    expect(hasVerifiedTotp(null)).toBe(false)
    expect(hasVerifiedTotp(undefined)).toBe(false)
  })

  it('basta con que uno esté verificado', () => {
    expect(
      hasVerifiedTotp([
        { id: '1', status: 'unverified' },
        { id: '2', status: 'verified' },
      ]),
    ).toBe(true)
  })
})

describe('normalizeTotpCode', () => {
  it('quita espacios que meten las apps al mostrar el código', () => {
    expect(normalizeTotpCode(' 123 456 ')).toBe('123456')
  })

  it('rechaza lo que no sean 6 dígitos', () => {
    expect(normalizeTotpCode('12345')).toBeNull()
    expect(normalizeTotpCode('1234567')).toBeNull()
    expect(normalizeTotpCode('12345a')).toBeNull()
    expect(normalizeTotpCode('')).toBeNull()
  })

  it('acepta un código con ceros a la izquierda', () => {
    // Tentación clásica: parsear a número. 000123 se convertiría en 123.
    expect(normalizeTotpCode('000123')).toBe('000123')
  })
})
