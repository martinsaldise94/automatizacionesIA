// Hilo de conversación del agente: identidad, validación y recorte.
//
// Lógica pura salvo `newConversationId`, que necesita el generador de números
// aleatorios criptográfico. Va aquí y no en `lib/db` porque son decisiones, no
// acceso a datos.
//
// ⚠️ EL HISTORIAL NUNCA LO MANDA EL CLIENTE. El navegador envía solo su
// `conversationId` y el mensaje nuevo; el servidor carga los turnos previos de
// la DB. Si aceptáramos el historial del cliente, cualquiera podría inventarse
// turnos de 'assistant' —"claro, te hacemos un 90% de descuento"— y el agente
// los tomaría por suyos y seguiría el hilo. Es inyección de prompt por la
// puerta de atrás.

import type { Message } from '@/lib/supabase/types'
import { stripInvisible } from './guard'

// Turnos que se le mandan al modelo. Cada uno se paga en tokens EN CADA
// mensaje, así que esto es coste recurrente por conversación, no un tope de
// memoria. 20 turnos cubre de sobra una charla de FAQs con derivación.
export const MAX_HISTORY_TURNS = 20

// Tope del mensaje del visitante. Es también un tope de coste y de abuso:
// sin él, pegar un libro en el chat sale gratis para quien lo pega.
export const MAX_USER_MESSAGE_CHARS = 2000

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

// El id lo genera el SERVIDOR. `randomUUID` usa el generador criptográfico:
// uno predecible (p. ej. basado en la fecha) dejaría adivinar el hilo de otro
// visitante, porque el servidor carga el historial a partir de este id.
export function newConversationId(): string {
  return crypto.randomUUID()
}

// Llega del cliente en cada mensaje, así que es dato de fuera y se valida
// antes de que toque una query.
export function isConversationId(value: unknown): boolean {
  return typeof value === 'string' && UUID_V4.test(value)
}

export type ChatMessageCheck = { ok: true; content: string } | { ok: false; error: string }

export function validateChatMessage(raw: string): ChatMessageCheck {
  // Se limpian los invisibles ANTES de nada: son el truco para esconder
  // instrucciones en un mensaje que a una persona le parece inocente, y
  // además dejarían el CRM lleno de texto ilegible. Ver `lib/ai/guard.ts`.
  const content = stripInvisible(typeof raw === 'string' ? raw : '').trim()

  if (!content) return { ok: false, error: 'Escribe un mensaje.' }

  // Se RECHAZA, no se trunca. Truncar en silencio haría que el visitante viera
  // al agente responder a media pregunta sin saber por qué.
  if (content.length > MAX_USER_MESSAGE_CHARS) {
    return { ok: false, error: 'El mensaje es demasiado largo.' }
  }

  return { ok: true, content }
}

// Se queda con los turnos MÁS RECIENTES. Al revés el agente respondería al
// principio de la charla en vez de a lo último que le han dicho.
export function trimHistory(messages: Message[]): Message[] {
  if (!Array.isArray(messages)) return []
  return messages.slice(-MAX_HISTORY_TURNS)
}

export type ModelMessage = { role: 'user' | 'assistant'; content: string }

// Traduce los roles del CRM a los que entiende la API del modelo.
//
// 'human' (una persona del negocio que entró a atender) se manda como
// 'assistant': ya habló en nombre del negocio, y en la API no existe un tercer
// rol. Perder ese matiz en el modelo es correcto; en `messages` se conserva,
// que es donde importa para el CRM.
export function toModelMessages(messages: Message[]): ModelMessage[] {
  if (!Array.isArray(messages)) return []

  return messages
    .map((m) => ({
      role: (m.role === 'user' ? 'user' : 'assistant') as ModelMessage['role'],
      content: (m.content ?? '').trim(),
    }))
    .filter((m) => m.content)
}
