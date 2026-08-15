// Derivación a persona ("handoff"). Lógica pura → testeable sin DB ni red.
//
// El principio rector del agente (references/ai-agent.md): NO finge resolver
// todo. Responde FAQs con seguridad y deriva cuando toca. Esta es la pieza que
// hace que derivar funcione de verdad y no sea una frase amable.
//
// El agente pide la derivación llamando a una herramienta; los argumentos los
// rellena un LLM, así que aquí TODO se trata como dato de fuera: pueden faltar,
// venir vacíos o con el tipo cambiado. Que esto reviente dejaría al visitante
// colgado justo en el momento en que pedía hablar con alguien.

import { z } from 'zod'
import type { Message } from '@/lib/supabase/types'

// El nombre lo aprende el modelo del prompt. Cambiarlo rompe el handoff de
// todas las conversaciones en curso, así que hay test que lo fija.
export const HANDOFF_TOOL_NAME = 'derivar_a_persona'

// Marca con la que queda trazada una derivación en `messages`. Además de
// explicar el corte en el CRM, es lo que permite CONTAR cuántas van en un hilo
// y aplicar el presupuesto de `guard.ts`.
export const HANDOFF_MARKER = '[derivación]'

// Turnos que se mandan a n8n para que el aviso tenga contexto. Un aviso que
// solo dice "un lead quiere hablar" obliga al negocio a llamar a ciegas.
export const MAX_TRANSCRIPT_TURNS = 30

const MAX_NAME = 200
const MAX_REASON = 1000
const MAX_PHONE = 40

const EMAIL = z.string().email()

const MOTIVO_POR_DEFECTO = 'El visitante ha pedido hablar con una persona.'

// Esquema de la herramienta que ve el modelo. Todo opcional a propósito: si
// exigiéramos teléfono, el agente insistiría en pedirlo a alguien que solo
// quiere que le devuelvan la llamada, y la conversación se atasca.
export const handoffToolSchema = z.object({
  motivo: z.string().describe('Por qué hay que derivar, en una frase.'),
  nombre: z.string().optional().describe('Nombre del visitante, si lo ha dado.'),
  telefono: z.string().optional().describe('Teléfono, si lo ha dado.'),
  email: z.string().optional().describe('Email, si lo ha dado.'),
})

export type HandoffInput = {
  motivo?: unknown
  nombre?: unknown
  telefono?: unknown
  email?: unknown
}

export type HandoffPlan = {
  name: string | null
  phone: string | null
  email: string | null
  reason: string
  // Hay al menos una forma de contactar → merece la pena crear el lead.
  createsLead: boolean
}

function texto(valor: unknown, max: number): string | null {
  if (typeof valor !== 'string') return null
  const t = valor.trim()
  if (!t) return null
  return t.length > max ? t.slice(0, max).trimEnd() : t
}

export function planHandoff(input: HandoffInput): HandoffPlan {
  const raw = input ?? {}

  const name = texto(raw.nombre, MAX_NAME)
  const phone = texto(raw.telefono, MAX_PHONE)
  const emailRaw = texto(raw.email, MAX_NAME)?.toLowerCase() ?? null

  // Un email que el modelo transcribió mal no se guarda: una ficha con un
  // email falso es peor que una sin email, porque el negocio cree que puede
  // contestar y el correo se pierde.
  const email = emailRaw && EMAIL.safeParse(emailRaw).success ? emailRaw : null

  return {
    name,
    phone,
    email,
    reason: texto(raw.motivo, MAX_REASON) ?? MOTIVO_POR_DEFECTO,
    // Sin teléfono ni email el lead es una ficha muerta que ensucia el CRM.
    // Pero la derivación NO se cancela: ver `buildHandoffPayload`.
    createsLead: Boolean(phone || email),
  }
}

export type TranscriptTurn = { role: string; content: string }

export type HandoffPayload = {
  tenantId: string
  tenantSlug: string
  conversationId: string
  leadId: string | null
  contactable: boolean
  reason: string
  lead: { name: string | null; phone: string | null; email: string | null }
  transcript: TranscriptTurn[]
  at: string
}

// Payload que se manda a n8n. Whitelist explícito, igual que `buildSystemPrompt`
// y `buildTenantContext`: esto sale de nuestra infraestructura, así que ni
// `ai_config`, ni datos de contacto del tenant, ni nada que no haga falta.
//
// `at` se pasa como argumento en vez de leer el reloj dentro: mantiene la
// función pura y testeable.
export function buildHandoffPayload(args: {
  tenantId: string
  tenantSlug: string
  conversationId: string
  leadId: string | null
  plan: HandoffPlan
  transcript: Message[]
  at: string
}): HandoffPayload {
  const turnos = Array.isArray(args.transcript) ? args.transcript : []

  return {
    tenantId: args.tenantId,
    tenantSlug: args.tenantSlug,
    conversationId: args.conversationId,
    leadId: args.leadId,
    // Aunque no haya lead, el aviso se manda: le dice al negocio qué le están
    // preguntando y no sabe responder, y eso vale por sí solo.
    contactable: args.plan.createsLead,
    reason: args.plan.reason,
    lead: { name: args.plan.name, phone: args.plan.phone, email: args.plan.email },
    transcript: turnos.slice(-MAX_TRANSCRIPT_TURNS).map((m) => ({
      role: m.role,
      content: m.content,
    })),
    at: args.at,
  }
}
