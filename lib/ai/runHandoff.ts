// Ejecuta la derivación: crea el lead, engancha el hilo y avisa a n8n.
//
// Separado de `handoff.ts` a propósito: allí vive la lógica pura (qué se
// decide) y aquí los efectos (DB y red). Así lo decidido se testea sin montar
// nada, y este archivo se queda en un orden de operaciones corto y legible.

import { createLead } from '@/lib/db/leads'
import {
  countHandoffs,
  createMessage,
  getConversation,
  linkConversationToLead,
} from '@/lib/db/messages'
import { dispatchN8n } from '@/lib/n8n'
import {
  HANDOFF_MARKER,
  MAX_TRANSCRIPT_TURNS,
  buildHandoffPayload,
  planHandoff,
  type HandoffInput,
} from './handoff'
import { overHandoffLimit } from './guard'
import type { Tenant } from '@/lib/supabase/types'

export type HandoffOutcome = {
  leadId: string | null
  notified: boolean
  // Lo que el agente le dice al visitante. Sale de aquí y no del modelo para
  // que no prometa cosas distintas cada vez (ni plazos que nadie ha acordado).
  reply: string
}

const CON_CONTACTO = 'Listo. Le paso tus datos al equipo y te contactan lo antes posible.'
const SIN_CONTACTO =
  'Para que te puedan atender necesito un teléfono o un email. ¿Cuál prefieres dejarme?'
const YA_DERIVADO = 'Ya he avisado al equipo con tus datos. Te contactarán en breve.'

export async function runHandoff(
  tenant: Tenant,
  conversationId: string,
  input: HandoffInput,
): Promise<HandoffOutcome> {
  // Presupuesto de derivaciones ANTES de tocar nada. Es el freno que importa:
  // el daño real de una inyección con éxito es convencer al agente de llamar a
  // esta herramienta en bucle, llenando el CRM de fichas falsas y disparando
  // un webhook por cada una. Con presupuesto, la inyección funciona y aun así
  // no hace daño. Al visitante se le responde con normalidad: no se le explica
  // que hay un límite, porque eso es justo lo que un atacante quiere medir.
  if (overHandoffLimit(await countHandoffs(tenant.id, conversationId))) {
    return { leadId: null, notified: false, reply: YA_DERIVADO }
  }

  const plan = planHandoff(input)

  // Sin forma de contactar no se crea ficha: un lead sin teléfono ni email es
  // papel mojado y ensucia el CRM. Se le pide el dato y no se avisa todavía —
  // el visitante sigue en la conversación, así que no se pierde nada.
  if (!plan.createsLead) {
    return { leadId: null, notified: false, reply: SIN_CONTACTO }
  }

  const { id: leadId } = await createLead(tenant.id, {
    // `name` es nullable en la tabla: el agente puede derivar a alguien que
    // dio el teléfono pero no el nombre.
    name: plan.name ?? '',
    email: plan.email,
    phone: plan.phone,
    source: 'chat',
  })

  // El hilo entero pasa a colgar del lead, incluidos los turnos anteriores a
  // que diera su nombre — que suelen ser los que explican por qué contactó.
  if (leadId) {
    await linkConversationToLead(tenant.id, conversationId, leadId)
  }

  // Queda trazado en la conversación que aquí hubo derivación. Sin esto, el
  // CRM ve una charla que se corta sin explicación.
  await createMessage(tenant.id, {
    leadId,
    conversationId,
    role: 'assistant',
    channel: 'web',
    content: `${HANDOFF_MARKER} ${plan.reason}`,
  })

  // El aviso va DESPUÉS de guardar. Si n8n falla, el lead ya está a salvo y
  // el negocio lo verá en su CRM igualmente.
  const transcript = await getConversation(tenant.id, conversationId, MAX_TRANSCRIPT_TURNS)

  const { sent } = await dispatchN8n(
    'handoff',
    buildHandoffPayload({
      tenantId: tenant.id,
      tenantSlug: tenant.slug,
      conversationId,
      leadId,
      plan,
      transcript,
      at: new Date().toISOString(),
    }),
  )

  return { leadId, notified: sent, reply: CON_CONTACTO }
}
