// ─── Capa de acceso a datos: tabla `messages` ────────────────────────────────
//
// ÚNICO sitio donde se escribe `messages`. Service role, scoped a tenant.
//
// Esta tabla es la conversación unificada de un lead: el mensaje del formulario
// web, los turnos del agente IA (Fase 6) y WhatsApp (tier_3) caen todos aquí,
// distinguidos por `channel` y `role`. Por eso el texto del formulario va aquí
// y no a una columna de `leads`.

import { createServiceClient } from '@/lib/supabase/service'
import { HANDOFF_MARKER } from '@/lib/ai/handoff'
import type { Message } from '@/lib/supabase/types'

type DbError = { message: string } | null

export type NewMessage = {
  leadId: string | null
  role: Message['role']
  channel: Message['channel']
  content: string
  // Hilo del agente. Null en mensajes sueltos (el texto del formulario).
  conversationId?: string | null
}

export async function createMessage(
  tenantId: string,
  input: NewMessage,
): Promise<{ error: DbError }> {
  const supabase = createServiceClient()
  const { error } = await supabase.from('messages').insert({
    tenant_id: tenantId,
    lead_id: input.leadId,
    conversation_id: input.conversationId ?? null,
    role: input.role,
    channel: input.channel,
    content: input.content,
  })
  return { error }
}

// Turnos previos de un hilo, en orden. Es lo que el agente lee como memoria.
//
// El filtro por `tenant_id` NO sobra pese a que el conversation_id sea un uuid
// v4: con service role no hay RLS debajo, así que este `.eq` es la única
// barrera. Un id filtrado de un tenant no puede leer nada del de al lado.
//
// `limit` sobre los MÁS RECIENTES (order desc + reverse) y no los primeros: si
// se cortara por arriba, el agente respondería al principio de la charla.
// `sinceIso` acota la ventana: una conversación caduca (ver CONVERSATION_TTL_MS),
// así que un conversationId robado no sirve para sonsacar el historial semanas
// después. Sin él se lee el hilo entero.
export async function getConversation(
  tenantId: string,
  conversationId: string,
  limit: number,
  sinceIso?: string,
): Promise<Message[]> {
  const supabase = createServiceClient()
  let query = supabase
    .from('messages')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('conversation_id', conversationId)

  if (sinceIso) query = query.gte('created_at', sinceIso)

  const { data, error } = await query
    .order('created_at', { ascending: false })
    .limit(limit)

  // Sin historial se puede seguir conversando (peor, pero se puede). Tumbar el
  // chat porque falle una lectura sería peor que responder sin memoria.
  if (error || !data) return []

  return (data as Message[]).reverse()
}

// Cuántas derivaciones lleva ya el hilo. Alimenta el presupuesto de
// `overHandoffLimit`: el daño real de una inyección con éxito es convencer al
// agente de derivar en bucle, y ese contador lo corta aunque la inyección
// funcione. Se cuenta contra la DB, no en memoria: en serverless un contador
// en memoria no sobrevive ni se comparte entre instancias.
export async function countHandoffs(tenantId: string, conversationId: string): Promise<number> {
  const supabase = createServiceClient()
  const { count, error } = await supabase
    .from('messages')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .eq('conversation_id', conversationId)
    .like('content', `${HANDOFF_MARKER}%`)

  // Si la cuenta falla se asume el TOPE, no cero: al revés, una caída de la DB
  // abriría de par en par justo la puerta que este contador protege.
  if (error) return Number.POSITIVE_INFINITY

  return count ?? 0
}

// Al derivar se crea el lead y el hilo entero pasa a colgar de él: el CRM ve
// la conversación completa, incluido lo que se dijo ANTES de que el visitante
// diera su nombre — que suele ser lo que explica por qué contactó.
export async function linkConversationToLead(
  tenantId: string,
  conversationId: string,
  leadId: string,
): Promise<{ error: DbError }> {
  const supabase = createServiceClient()
  const { error } = await supabase
    .from('messages')
    .update({ lead_id: leadId })
    .eq('tenant_id', tenantId)
    .eq('conversation_id', conversationId)

  return { error }
}
