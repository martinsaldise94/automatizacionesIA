import { describe, expect, it } from 'vitest'
import {
  MAX_LEADS_PER_HOUR,
  MAX_MESSAGE_BYTES,
  MIN_FILL_MS,
  isLikelySpam,
  overLeadRateLimit,
  validateLeadInput,
} from '@/lib/leads'

const base = {
  name: 'Ana García',
  email: 'ana@ejemplo.com',
  phone: '',
  message: 'Quería pedir cita para la semana que viene.',
}

describe('validateLeadInput', () => {
  it('acepta una entrada válida y recorta espacios', () => {
    const res = validateLeadInput({ ...base, name: '  Ana García  ' })
    expect(res.ok).toBe(true)
    if (res.ok) expect(res.data.name).toBe('Ana García')
  })

  it('exige nombre', () => {
    expect(validateLeadInput({ ...base, name: '   ' }).ok).toBe(false)
  })

  it('exige al menos una forma de contacto', () => {
    // Sin email y sin teléfono el lead es inútil: nadie puede responderle.
    expect(validateLeadInput({ ...base, email: '', phone: '' }).ok).toBe(false)
  })

  it('acepta solo teléfono, sin email', () => {
    const res = validateLeadInput({ ...base, email: '', phone: '600 11 22 33' })
    expect(res.ok).toBe(true)
  })

  it('acepta solo email, sin teléfono', () => {
    expect(validateLeadInput({ ...base, phone: '' }).ok).toBe(true)
  })

  it('rechaza un email con formato inválido', () => {
    expect(validateLeadInput({ ...base, email: 'esto-no-es-un-email' }).ok).toBe(false)
  })

  it('convierte los campos opcionales vacíos en null', () => {
    const res = validateLeadInput({ ...base, phone: '', message: '' })
    expect(res.ok).toBe(true)
    if (res.ok) {
      expect(res.data.phone).toBeNull()
      expect(res.data.message).toBeNull()
    }
  })

  it('normaliza el email a minúsculas', () => {
    const res = validateLeadInput({ ...base, email: 'ANA@Ejemplo.COM' })
    expect(res.ok).toBe(true)
    if (res.ok) expect(res.data.email).toBe('ana@ejemplo.com')
  })

  it('rechaza un mensaje por encima del límite', () => {
    const res = validateLeadInput({ ...base, message: 'a'.repeat(MAX_MESSAGE_BYTES + 1) })
    expect(res.ok).toBe(false)
  })

  it('mide bytes reales en el mensaje, no caracteres', () => {
    // 'é' ocupa 2 bytes en UTF-8.
    const res = validateLeadInput({ ...base, message: 'é'.repeat(MAX_MESSAGE_BYTES / 2 + 1) })
    expect(res.ok).toBe(false)
  })

  it('rechaza lo que no es un objeto', () => {
    expect(validateLeadInput(null).ok).toBe(false)
    expect(validateLeadInput('texto').ok).toBe(false)
  })
})

describe('isLikelySpam', () => {
  // Defensa contra bots tontos, NO contra un atacante: los dos datos los manda
  // el cliente y se pueden falsear. La barrera dura es el límite por tenant.

  it('marca spam si el honeypot viene relleno', () => {
    // Campo oculto por CSS: una persona no lo ve, un bot lo rellena.
    expect(isLikelySpam({ honeypot: 'http://spam.example', elapsedMs: 30_000 })).toBe(true)
  })

  it('marca spam si el formulario se envió demasiado rápido', () => {
    expect(isLikelySpam({ honeypot: '', elapsedMs: MIN_FILL_MS - 1 })).toBe(true)
  })

  it('deja pasar un envío humano normal', () => {
    expect(isLikelySpam({ honeypot: '', elapsedMs: 15_000 })).toBe(false)
  })

  it('trata un tiempo ausente o absurdo como spam', () => {
    // Sin marca de tiempo no se puede afirmar que sea humano: se asume lo peor.
    expect(isLikelySpam({ honeypot: '', elapsedMs: Number.NaN })).toBe(true)
    expect(isLikelySpam({ honeypot: '', elapsedMs: -5 })).toBe(true)
  })
})

describe('overLeadRateLimit', () => {
  // Este SÍ es la barrera dura: se cuenta contra la DB, así que aguanta aunque
  // el atacante cambie de IP o falsee el tiempo de relleno.

  it('deja pasar por debajo del límite', () => {
    expect(overLeadRateLimit(MAX_LEADS_PER_HOUR - 1)).toBe(false)
  })

  it('corta al alcanzar el límite', () => {
    expect(overLeadRateLimit(MAX_LEADS_PER_HOUR)).toBe(true)
  })

  it('corta por encima del límite', () => {
    expect(overLeadRateLimit(MAX_LEADS_PER_HOUR + 50)).toBe(true)
  })
})
