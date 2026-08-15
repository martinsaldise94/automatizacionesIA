// Disparo de eventos a n8n. ÚNICO punto de salida hacia las automatizaciones.
//
// Las automatizaciones viven en n8n, no aquí (invariante 5 del proyecto):
// Next.js solo dispara el evento y n8n orquesta el aviso al negocio, el
// recordatorio o lo que sea. Cambiar un flujo no toca este código.
//
// REGLA: esto NUNCA puede tumbar lo que lo llamó. Si n8n está caído, mal
// configurado o tarda, el visitante tiene que seguir hablando con el agente y
// el lead tiene que quedar guardado igual. El aviso es importante; la
// conversación lo es más, y el dato ya está a salvo en la DB antes de llegar
// aquí.

import { createHmac } from 'node:crypto'

// Eventos que dispara la plataforma. Cerrado a propósito: el nombre acaba en
// una URL, así que no puede salir de un dato variable.
export type N8nEvent = 'handoff'

const EVENTO_VALIDO = /^[a-z0-9-]+$/

// Timeout corto: n8n avisando al negocio no puede hacer esperar al visitante.
const TIMEOUT_MS = 4_000

// Construye la URL del webhook. Devuelve null —y el disparo se salta— si no
// hay base configurada o si no es http(s). Sin n8n montado (el caso hoy) esto
// simplemente no hace nada, en vez de intentar una petición a "undefined/...".
export function webhookUrlFor(base: string | undefined, event: string): string | null {
  const raw = (base ?? '').trim()
  if (!raw) return null
  if (!/^https?:\/\//i.test(raw)) return null

  // El evento lo ponemos nosotros, pero fijarlo aquí evita que el día que
  // alguien pase un valor variable esto se convierta en un SSRF o en una
  // petición a otra ruta del propio n8n.
  if (!EVENTO_VALIDO.test(event)) return null

  return `${raw.replace(/\/+$/, '')}/${event}`
}

// Firma HMAC del cuerpo para que n8n pueda comprobar que el evento viene de
// nosotros. Sin secreto devuelve null: es mejor mandar sin cabecera que con
// una firma calculada con secreto vacío, que cualquiera puede reproducir y le
// daría a n8n la falsa impresión de estar autenticando algo.
export function signPayload(body: string, secret: string | undefined): string | null {
  if (!secret) return null
  return createHmac('sha256', secret).update(body, 'utf8').digest('hex')
}

export type DispatchResult = { sent: boolean; reason?: string }

// Dispara el evento. Nunca lanza: devuelve si salió o no, y quien llama decide
// si le importa (normalmente, no: el dato ya está guardado).
export async function dispatchN8n(event: N8nEvent, payload: unknown): Promise<DispatchResult> {
  const url = webhookUrlFor(process.env.N8N_WEBHOOK_BASE_URL, event)
  if (!url) return { sent: false, reason: 'n8n sin configurar' }

  const body = JSON.stringify(payload)
  const firma = signPayload(body, process.env.N8N_WEBHOOK_SECRET)

  const headers: Record<string, string> = { 'content-type': 'application/json' }
  if (firma) headers['x-signature'] = firma

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers,
      body,
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })

    if (!res.ok) {
      console.warn(`[n8n] ${event}: respondió ${res.status}`)
      return { sent: false, reason: `HTTP ${res.status}` }
    }

    return { sent: true }
  } catch (e) {
    // Se avisa pero no se propaga: n8n caído no puede romper una conversación.
    console.warn(`[n8n] ${event}: no se pudo entregar —`, e instanceof Error ? e.message : e)
    return { sent: false, reason: 'error de red' }
  }
}
