import { describe, it, expect } from 'vitest'
import {
  MAX_HISTORY_TURNS,
  MAX_USER_MESSAGE_CHARS,
  isConversationId,
  newConversationId,
  toModelMessages,
  trimHistory,
  validateChatMessage,
} from '@/lib/ai/conversation'
import type { Message } from '@/lib/supabase/types'

function turno(role: Message['role'], content: string, i = 0): Message {
  return {
    id: `m${i}`,
    tenant_id: 't1',
    lead_id: null,
    conversation_id: '11111111-1111-4111-8111-111111111111',
    role,
    channel: 'web',
    content,
    created_at: new Date(2026, 0, 1, 0, 0, i).toISOString(),
  }
}

describe('isConversationId', () => {
  it('acepta un uuid v4 y nada más', () => {
    expect(isConversationId(newConversationId())).toBe(true)
    expect(isConversationId('11111111-1111-4111-8111-111111111111')).toBe(true)
  })

  it('rechaza basura, vacíos y cosas que no son uuid', () => {
    // Llega del cliente en cada mensaje: si no se valida, acaba en una query.
    for (const malo of ['', '   ', 'abc', '1234', "' or 1=1 --", '11111111-1111-1111-1111-111111111111']) {
      expect(isConversationId(malo), malo).toBe(false)
    }
    expect(isConversationId(null)).toBe(false)
    expect(isConversationId(undefined)).toBe(false)
    expect(isConversationId(42)).toBe(false)
  })

  it('newConversationId no se repite', () => {
    const ids = new Set(Array.from({ length: 200 }, () => newConversationId()))
    expect(ids.size).toBe(200)
  })
})

describe('validateChatMessage', () => {
  it('acepta un mensaje normal y lo recorta de espacios', () => {
    const r = validateChatMessage('  ¿Abrís los sábados?  ')
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.content).toBe('¿Abrís los sábados?')
  })

  it('rechaza vacío o solo espacios', () => {
    expect(validateChatMessage('').ok).toBe(false)
    expect(validateChatMessage('    ').ok).toBe(false)
    expect(validateChatMessage(null as never).ok).toBe(false)
  })

  it('rechaza mensajes desmedidos en vez de truncarlos', () => {
    // Truncar callado haría que el visitante viera al agente responder a media
    // pregunta. Y cada carácter se paga en tokens: el tope es también de coste.
    const r = validateChatMessage('a'.repeat(MAX_USER_MESSAGE_CHARS + 1))
    expect(r.ok).toBe(false)
  })

  it('acepta justo el máximo', () => {
    expect(validateChatMessage('a'.repeat(MAX_USER_MESSAGE_CHARS)).ok).toBe(true)
  })
})

describe('trimHistory', () => {
  it('se queda con los turnos MÁS RECIENTES, no con los primeros', () => {
    // Al revés sería absurdo: el agente respondería al principio de la charla
    // y no a lo último que le han dicho.
    const largo = Array.from({ length: MAX_HISTORY_TURNS + 10 }, (_, i) =>
      turno('user', `mensaje ${i}`, i),
    )
    const r = trimHistory(largo)

    expect(r).toHaveLength(MAX_HISTORY_TURNS)
    expect(r.at(-1)?.content).toBe(`mensaje ${MAX_HISTORY_TURNS + 9}`)
    expect(r[0]?.content).not.toBe('mensaje 0')
  })

  it('deja en paz un historial corto', () => {
    const corto = [turno('user', 'hola', 0), turno('assistant', 'buenas', 1)]
    expect(trimHistory(corto)).toHaveLength(2)
  })

  it('aguanta vacío o no-array', () => {
    expect(trimHistory([])).toEqual([])
    expect(trimHistory(null as never)).toEqual([])
  })
})

describe('toModelMessages', () => {
  it('mapea role del CRM al del modelo', () => {
    const r = toModelMessages([turno('user', 'hola', 0), turno('assistant', 'buenas', 1)])
    expect(r).toEqual([
      { role: 'user', content: 'hola' },
      { role: 'assistant', content: 'buenas' },
    ])
  })

  it("'human' cuenta como 'assistant' para el modelo", () => {
    // Un humano que entró a atender ya habló en nombre del negocio. Para el
    // modelo es una intervención suya; no existe un rol 'human' en la API.
    const r = toModelMessages([turno('human', 'Soy Ana, del equipo', 0)])
    expect(r).toEqual([{ role: 'assistant', content: 'Soy Ana, del equipo' }])
  })

  it('descarta turnos sin contenido', () => {
    const r = toModelMessages([turno('user', '   ', 0), turno('user', 'válido', 1)])
    expect(r).toEqual([{ role: 'user', content: 'válido' }])
  })
})
