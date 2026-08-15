// ─── Capa de acceso a datos: tabla `leads` ───────────────────────────────────
//
// ÚNICO sitio donde se escribe `leads`. Service role, igual que el resto de
// lib/db: el aislamiento lo da el `.eq('tenant_id')` de cada query y el hecho
// de que el tenantId se resuelve SIEMPRE en servidor antes de llegar aquí.
//
// Ojo: a diferencia de pages/posts, esto lo escribe gente SIN sesión desde la
// web pública. La validación y el límite de abuso son obligatorios en la action
// que llama aquí (ver app/[tenant]/(public)/actions.ts).

import { createServiceClient } from '@/lib/supabase/service'
import type { Lead } from '@/lib/supabase/types'

type DbError = { message: string } | null

// Sin `message`: la tabla `leads` no tiene texto libre a propósito. Lo que
// escribe la persona va a `messages` (role='user', channel='web'), que es la
// misma tabla que usarán el agente IA y WhatsApp. Así el CRM del tier_3 ve una
// única conversación por lead, venga del canal que venga.
export type NewLead = {
  name: string
  email: string | null
  phone: string | null
  source: Lead['source']
}

// Cuenta los leads del tenant en la última hora. Alimenta el límite de abuso.
// Se cuenta contra la DB a propósito: un contador en memoria no sobrevive a un
// despliegue ni se comparte entre instancias serverless, así que daría una
// falsa sensación de protección.
export async function countRecentLeads(tenantId: string, sinceIso: string): Promise<number> {
  const supabase = createServiceClient()
  const { count } = await supabase
    .from('leads')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .gte('created_at', sinceIso)
  return count ?? 0
}

export async function createLead(
  tenantId: string,
  input: NewLead,
): Promise<{ id: string | null; error: DbError }> {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('leads')
    .insert({
      tenant_id: tenantId,
      name: input.name,
      email: input.email,
      phone: input.phone,
      source: input.source,
      status: 'new',
    })
    .select('id')
    .single()

  return { id: data?.id ?? null, error }
}
