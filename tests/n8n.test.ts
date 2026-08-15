import { describe, it, expect } from 'vitest'
import { signPayload, webhookUrlFor } from '@/lib/n8n'

describe('webhookUrlFor', () => {
  it('pega el evento a la base sin duplicar barras', () => {
    expect(webhookUrlFor('https://n8n.test/webhook', 'handoff')).toBe(
      'https://n8n.test/webhook/handoff',
    )
    expect(webhookUrlFor('https://n8n.test/webhook/', 'handoff')).toBe(
      'https://n8n.test/webhook/handoff',
    )
  })

  it('sin base configurada devuelve null en vez de inventarse una URL', () => {
    // Sin n8n montado (que es el caso hoy) el disparo simplemente no ocurre.
    // Construir "undefined/handoff" haría una petición absurda a cada handoff.
    expect(webhookUrlFor(undefined, 'handoff')).toBeNull()
    expect(webhookUrlFor('', 'handoff')).toBeNull()
    expect(webhookUrlFor('   ', 'handoff')).toBeNull()
  })

  it('rechaza una base que no sea http(s)', () => {
    // La base sale de una variable de entorno, pero un error de copia que
    // acabe en `file://` o `javascript:` no debe llegar a fetch.
    expect(webhookUrlFor('file:///etc/passwd', 'handoff')).toBeNull()
    expect(webhookUrlFor('n8n.test/webhook', 'handoff')).toBeNull()
  })

  it('no deja que el nombre del evento se salga de la ruta', () => {
    // El evento lo ponemos nosotros, pero fijarlo evita que un futuro
    // `webhookUrlFor(base, algoDelUsuario)` se convierta en un SSRF.
    expect(webhookUrlFor('https://n8n.test/webhook', '../../admin')).toBeNull()
    expect(webhookUrlFor('https://n8n.test/webhook', 'con espacio')).toBeNull()
    expect(webhookUrlFor('https://n8n.test/webhook', '')).toBeNull()
  })
})

describe('signPayload', () => {
  it('la misma entrada y secreto dan la misma firma', () => {
    const a = signPayload('{"hola":1}', 'secreto')
    const b = signPayload('{"hola":1}', 'secreto')
    expect(a).toBe(b)
    expect(a).toMatch(/^[0-9a-f]{64}$/)
  })

  it('cambiar el cuerpo cambia la firma', () => {
    expect(signPayload('{"hola":1}', 'secreto')).not.toBe(signPayload('{"hola":2}', 'secreto'))
  })

  it('cambiar el secreto cambia la firma', () => {
    expect(signPayload('{"hola":1}', 'secreto')).not.toBe(signPayload('{"hola":1}', 'otro'))
  })

  it('sin secreto no firma: mejor sin cabecera que con una firma falsa', () => {
    // Una firma calculada con secreto vacío es verificable por cualquiera y
    // daría a n8n la falsa impresión de estar autenticando algo.
    expect(signPayload('{"hola":1}', undefined)).toBeNull()
    expect(signPayload('{"hola":1}', '')).toBeNull()
  })
})
