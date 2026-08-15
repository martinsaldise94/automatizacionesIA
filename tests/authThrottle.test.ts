import { describe, it, expect } from 'vitest'
import {
  ACCOUNT_FREE_ATTEMPTS,
  IP_FREE_ATTEMPTS,
  MAX_BACKOFF_MS,
  backoffMs,
  throttleCheck,
  strictest,
  throttleMessage,
} from '@/lib/auth-throttle'

describe('backoffMs', () => {
  it('no penaliza los primeros fallos: teclear mal la contraseña es normal', () => {
    expect(backoffMs(0, ACCOUNT_FREE_ATTEMPTS)).toBe(0)
    expect(backoffMs(ACCOUNT_FREE_ATTEMPTS - 1, ACCOUNT_FREE_ATTEMPTS)).toBe(0)
  })

  it('"N intentos gratis" significa que el intento N+1 ya espera', () => {
    // El contador se consulta ANTES de registrar el intento en curso. Con 2
    // gratis: fallas 1 (quedan 1 en tabla, sigue libre), fallas 2 (quedan 2),
    // y el TERCER intento ya está frenado. Sin esto salían tres gratis y la
    // constante mentía sobre su propio nombre.
    expect(backoffMs(ACCOUNT_FREE_ATTEMPTS, ACCOUNT_FREE_ATTEMPTS)).toBeGreaterThan(0)
    expect(backoffMs(IP_FREE_ATTEMPTS, IP_FREE_ATTEMPTS)).toBeGreaterThan(0)
    expect(backoffMs(IP_FREE_ATTEMPTS - 1, IP_FREE_ATTEMPTS)).toBe(0)
  })

  it('empieza en 10s y sube de 10 en 10', () => {
    expect(backoffMs(ACCOUNT_FREE_ATTEMPTS, ACCOUNT_FREE_ATTEMPTS)).toBe(10_000)
    expect(backoffMs(ACCOUNT_FREE_ATTEMPTS + 1, ACCOUNT_FREE_ATTEMPTS)).toBe(20_000)
    expect(backoffMs(ACCOUNT_FREE_ATTEMPTS + 2, ACCOUNT_FREE_ATTEMPTS)).toBe(30_000)
    expect(backoffMs(ACCOUNT_FREE_ATTEMPTS + 3, ACCOUNT_FREE_ATTEMPTS)).toBe(40_000)
  })

  it('el coste acumulado crece al cuadrado, que es lo que frena al atacante', () => {
    // Cada paso solo sube 10s, pero hay que pagarlos TODOS. La suma de los 50
    // primeros ya pasa de tres horas: lineal por intento, cuadrático en total.
    let total = 0
    for (let i = 1; i <= 50; i++) total += backoffMs(ACCOUNT_FREE_ATTEMPTS - 1 + i, ACCOUNT_FREE_ATTEMPTS)
    expect(total).toBeGreaterThan(3 * 60 * 60 * 1000)
  })

  it('tiene tope: nunca es un bloqueo permanente', () => {
    // Aunque el atacante siga insistiendo mil veces, la espera se estanca.
    // Es la diferencia entre throttling y bloqueo de cuenta: esto se cura solo.
    expect(backoffMs(1000, ACCOUNT_FREE_ATTEMPTS)).toBe(MAX_BACKOFF_MS)
    expect(backoffMs(1_000_000, ACCOUNT_FREE_ATTEMPTS)).toBe(MAX_BACKOFF_MS)
  })

  it('el margen por IP es más ancho que el de cuenta', () => {
    // Una oficina con NAT comparte IP: varias personas fallando no pueden
    // dejarse fuera unas a otras tan fácil como una sola cuenta atacada.
    expect(IP_FREE_ATTEMPTS).toBeGreaterThan(ACCOUNT_FREE_ATTEMPTS)
    expect(backoffMs(ACCOUNT_FREE_ATTEMPTS, IP_FREE_ATTEMPTS)).toBe(0)
  })
})

describe('throttleCheck', () => {
  it('deja pasar mientras no se supere el margen', () => {
    expect(throttleCheck({ failures: 1, msSinceLastFailure: 0, freeAttempts: 2 })).toEqual({
      allowed: true,
    })
  })

  it('bloquea justo tras pasarse, y dice cuánto falta', () => {
    const v = throttleCheck({ failures: 3, msSinceLastFailure: 0, freeAttempts: 2 })
    expect(v.allowed).toBe(false)
    if (!v.allowed) expect(v.waitMs).toBe(backoffMs(3, 2))
  })

  it('descuenta el tiempo ya esperado', () => {
    const total = backoffMs(3, 2)
    const v = throttleCheck({ failures: 3, msSinceLastFailure: total - 1000, freeAttempts: 2 })
    expect(v.allowed).toBe(false)
    if (!v.allowed) expect(v.waitMs).toBe(1000)
  })

  it('se cura solo: pasado el tiempo vuelve a dejar pasar', () => {
    const total = backoffMs(3, 2)
    expect(throttleCheck({ failures: 3, msSinceLastFailure: total, freeAttempts: 2 })).toEqual({
      allowed: true,
    })
    expect(
      throttleCheck({ failures: 3, msSinceLastFailure: total + 60_000, freeAttempts: 2 }),
    ).toEqual({ allowed: true })
  })

  it('un tiempo transcurrido imposible se trata como cero, no como infinito', () => {
    // Reloj torcido o dato corrupto: el lado seguro es exigir la espera entera,
    // no regalar el acceso.
    for (const raro of [Number.NaN, -5000, Number.NEGATIVE_INFINITY]) {
      const v = throttleCheck({ failures: 3, msSinceLastFailure: raro, freeAttempts: 2 })
      expect(v.allowed).toBe(false)
      if (!v.allowed) expect(v.waitMs).toBe(backoffMs(3, 2))
    }
  })

  it('un número de fallos corrupto no abre la puerta', () => {
    const v = throttleCheck({ failures: Number.NaN, msSinceLastFailure: 0, freeAttempts: 2 })
    expect(v.allowed).toBe(false)
  })
})

describe('strictest', () => {
  it('si alguno bloquea, bloquea', () => {
    const v = strictest({ allowed: true }, { allowed: false, waitMs: 5000 })
    expect(v).toEqual({ allowed: false, waitMs: 5000 })
  })

  it('gana la espera más larga', () => {
    const v = strictest({ allowed: false, waitMs: 5000 }, { allowed: false, waitMs: 60_000 })
    expect(v).toEqual({ allowed: false, waitMs: 60_000 })
  })

  it('solo deja pasar si ninguno bloquea', () => {
    expect(strictest({ allowed: true }, { allowed: true })).toEqual({ allowed: true })
  })
})

describe('throttleMessage', () => {
  it('redondea hacia ARRIBA: prometer menos espera de la real frustra', () => {
    expect(throttleMessage(1)).toContain('1 segundo')
    expect(throttleMessage(1001)).toContain('2 segundos')
    expect(throttleMessage(5000)).toContain('5 segundos')
  })

  it('pasa a minutos cuando la espera es larga', () => {
    expect(throttleMessage(900_000)).toContain('15 minutos')
    expect(throttleMessage(60_000)).toContain('1 minuto')
  })

  it('no revela si la cuenta existe', () => {
    // El mismo texto para un email real y uno inventado. Si el mensaje
    // cambiara, el login sería un oráculo para enumerar usuarios.
    const msg = throttleMessage(5000)
    expect(msg).not.toMatch(/cuenta|usuario|email|existe/i)
  })
})
