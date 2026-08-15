import { describe, it, expect } from 'vitest'
import {
  HANDOFF_TOOL_NAME,
  MAX_TRANSCRIPT_TURNS,
  buildHandoffPayload,
  planHandoff,
} from '@/lib/ai/handoff'
import type { Message } from '@/lib/supabase/types'

function turno(role: Message['role'], content: string, i = 0): Message {
  return {
    id: `m${i}`,
    tenant_id: 't1',
    lead_id: null,
    conversation_id: 'c1',
    role,
    channel: 'web',
    content,
    created_at: new Date(2026, 0, 1, 0, 0, i).toISOString(),
  }
}

describe('planHandoff', () => {
  it('limpia los datos que recogió el agente', () => {
    const p = planHandoff({
      nombre: '  Ana Ruiz ',
      telefono: ' 600 11 22 33 ',
      email: '  ANA@Mail.com ',
      motivo: '  Quiere presupuesto de ortodoncia ',
    })

    expect(p.name).toBe('Ana Ruiz')
    expect(p.phone).toBe('600 11 22 33')
    expect(p.email).toBe('ana@mail.com')
    expect(p.reason).toBe('Quiere presupuesto de ortodoncia')
  })

  it('crea lead si hay ALGO con lo que contactar', () => {
    expect(planHandoff({ nombre: 'Ana', telefono: '600112233' }).createsLead).toBe(true)
    expect(planHandoff({ nombre: 'Ana', email: 'a@b.com' }).createsLead).toBe(true)
    expect(planHandoff({ telefono: '600112233' }).createsLead).toBe(true)
  })

  it('NO crea lead sin forma de contactar, pero la derivación sigue adelante', () => {
    // Decisión: un lead sin teléfono ni email es una ficha muerta que ensucia
    // el CRM. Pero el visitante SÍ pidió ayuda, así que el aviso al negocio se
    // manda igual con la conversación: le dice qué le preguntan y no sabe
    // responder, que es información que vale por sí sola.
    const p = planHandoff({ nombre: 'Ana', motivo: 'Quiere reclamar' })

    expect(p.createsLead).toBe(false)
    expect(p.name).toBe('Ana')
    expect(p.reason).toBe('Quiere reclamar')
  })

  it('descarta un email con formato imposible en vez de guardarlo', () => {
    const p = planHandoff({ nombre: 'Ana', email: 'no-es-un-email', telefono: '600112233' })
    expect(p.email).toBeNull()
    expect(p.createsLead).toBe(true) // el teléfono lo salva
  })

  it('un email inválido a solas no basta para crear lead', () => {
    expect(planHandoff({ nombre: 'Ana', email: 'roto' }).createsLead).toBe(false)
  })

  it('aguanta que el modelo no mande nada o mande basura', () => {
    // Los argumentos los rellena un LLM: pueden faltar, venir vacíos o con
    // tipos raros. Que reviente aquí dejaría al visitante colgado justo
    // cuando pedía hablar con una persona.
    expect(() => planHandoff({})).not.toThrow()
    expect(() => planHandoff(null as never)).not.toThrow()
    expect(planHandoff({ nombre: 42 as never }).name).toBeNull()

    const p = planHandoff({})
    expect(p.createsLead).toBe(false)
    expect(p.reason.length).toBeGreaterThan(0) // siempre hay un motivo por defecto
  })

  it('recorta campos desmedidos', () => {
    const p = planHandoff({ nombre: 'a'.repeat(5000), motivo: 'b'.repeat(5000) })
    expect(p.name!.length).toBeLessThan(500)
    expect(p.reason.length).toBeLessThan(2000)
  })
})

describe('buildHandoffPayload', () => {
  const base = {
    tenantId: 'tenant-1',
    tenantSlug: 'clinica-lumina',
    conversationId: 'conv-1',
    leadId: 'lead-1',
    plan: planHandoff({ nombre: 'Ana', telefono: '600112233', motivo: 'Presupuesto' }),
    transcript: [turno('user', 'hola', 0), turno('assistant', 'buenas', 1)],
    at: '2026-08-15T10:00:00.000Z',
  }

  it('lleva lo que n8n necesita para avisar al negocio', () => {
    const p = buildHandoffPayload(base)

    expect(p.tenantId).toBe('tenant-1')
    expect(p.tenantSlug).toBe('clinica-lumina')
    expect(p.conversationId).toBe('conv-1')
    expect(p.leadId).toBe('lead-1')
    expect(p.lead.name).toBe('Ana')
    expect(p.lead.phone).toBe('600112233')
    expect(p.reason).toBe('Presupuesto')
    expect(p.at).toBe('2026-08-15T10:00:00.000Z')
  })

  it('incluye la conversación, porque el aviso sin contexto no sirve', () => {
    const p = buildHandoffPayload(base)
    expect(p.transcript).toEqual([
      { role: 'user', content: 'hola' },
      { role: 'assistant', content: 'buenas' },
    ])
  })

  it('recorta la conversación a los últimos turnos', () => {
    const largo = Array.from({ length: MAX_TRANSCRIPT_TURNS + 10 }, (_, i) =>
      turno('user', `t${i}`, i),
    )
    const p = buildHandoffPayload({ ...base, transcript: largo })

    expect(p.transcript).toHaveLength(MAX_TRANSCRIPT_TURNS)
    expect(p.transcript.at(-1)?.content).toBe(`t${MAX_TRANSCRIPT_TURNS + 9}`)
  })

  it('NO mete nada del tenant más allá del id y el slug', () => {
    // El payload sale de nuestra infraestructura hacia n8n. Ni ai_config, ni
    // config de contacto, ni claves: el mismo criterio que buildSystemPrompt.
    const json = JSON.stringify(buildHandoffPayload(base))

    expect(json).not.toMatch(/ai_config|handoffRules|apiKey|secret/i)
  })

  it('marca cuando no hay forma de contactar', () => {
    const p = buildHandoffPayload({
      ...base,
      leadId: null,
      plan: planHandoff({ nombre: 'Ana' }),
    })

    expect(p.leadId).toBeNull()
    expect(p.contactable).toBe(false)
  })
})

describe('HANDOFF_TOOL_NAME', () => {
  it('es estable: el modelo lo aprende del prompt y cambiarlo rompe el handoff', () => {
    expect(HANDOFF_TOOL_NAME).toBe('derivar_a_persona')
  })
})
