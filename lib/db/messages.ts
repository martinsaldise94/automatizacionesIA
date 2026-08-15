// ─── Capa de acceso a datos: tabla `messages` ────────────────────────────────
//
// ÚNICO sitio donde se escribe `messages`. Service role, scoped a tenant.
//
// Esta tabla es la conversación unificada de un lead: el mensaje del formulario
// web, los turnos del agente IA (Fase 6) y WhatsApp (tier_3) caen todos aquí,
// distinguidos por `channel` y `role`. Por eso el texto del formulario va aquí
// y no a una columna de `leads`.

import { createServiceClient } from '@/lib/supabase/service'
import type { Message } from '@/lib/supabase/types'

type DbError = { message: string } | null

export type NewMessage = {
  leadId: string | null
  role: Message['role']
  channel: Message['channel']
  content: string
}

export async function createMessage(
  tenantId: string,
  input: NewMessage,
): Promise<{ error: DbError }> {
  const supabase = createServiceClient()
  const { error } = await supabase.from('messages').insert({
    tenant_id: tenantId,
    lead_id: input.leadId,
    role: input.role,
    channel: input.channel,
    content: input.content,
  })
  return { error }
}
