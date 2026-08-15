'use server'

import { headers } from 'next/headers'
import { resolveTenant } from '@/lib/tenant'
import { hasFeature } from '@/lib/features'
import { validateLeadInput, isLikelySpam, overLeadRateLimit } from '@/lib/leads'
import { createLead, countRecentLeads } from '@/lib/db/leads'
import { createMessage } from '@/lib/db/messages'

// Captación de leads desde la web PÚBLICA.
//
// Es el primer endpoint de escritura del proyecto SIN sesión: cualquiera en
// internet puede llamarlo. Orden de defensas, de fuera hacia dentro:
//
//   1. tenant resuelto en SERVIDOR desde el header de confianza `x-tenant`
//      (lo escribe solo el proxy; el del cliente se borra). Nunca del body.
//   2. `resolveTenant` exige status='active' → una web sin publicar no capta.
//   3. gating por feature nombrada, nunca por tier.
//   4. heurística anti-bot (honeypot + tiempo de relleno).
//   5. techo por tenant y hora, contado contra la DB.
//   6. validación zod antes de escribir.
//
// El mensaje de error es DELIBERADAMENTE genérico en los casos de abuso: no se
// le dice a un bot cuál de las barreras lo paró.

export type LeadResult = { ok: true } | { ok: false; error: string }

export async function submitLeadAction(raw: unknown): Promise<LeadResult> {
  const tenantIdentifier = (await headers()).get('x-tenant') ?? ''
  const tenant = await resolveTenant(tenantIdentifier)
  if (!tenant) return { ok: false, error: 'No se pudo enviar el formulario.' }

  if (!hasFeature(tenant, 'leads')) {
    return { ok: false, error: 'No se pudo enviar el formulario.' }
  }

  const body = (raw ?? {}) as Record<string, unknown>

  // Anti-bot. Se responde OK a propósito: si un bot recibe un error, reintenta
  // cambiando cosas hasta pasar. Si recibe éxito, se va contento y no escribimos.
  const spam = isLikelySpam({
    honeypot: typeof body.website === 'string' ? body.website : '',
    elapsedMs: typeof body.elapsedMs === 'number' ? body.elapsedMs : Number.NaN,
  })
  if (spam) return { ok: true }

  // Barrera dura contra el abuso. Contra DB, así que no se esquiva cambiando de
  // IP ni falseando el tiempo de relleno.
  const unaHoraAtras = new Date(Date.now() - 60 * 60 * 1000).toISOString()
  const recientes = await countRecentLeads(tenant.id, unaHoraAtras)
  if (overLeadRateLimit(recientes)) {
    return { ok: false, error: 'Estamos recibiendo muchas solicitudes. Inténtalo en un rato.' }
  }

  const validation = validateLeadInput(body)
  if (!validation.ok) return { ok: false, error: validation.error }

  const { id, error } = await createLead(tenant.id, {
    name: validation.data.name,
    email: validation.data.email,
    phone: validation.data.phone,
    source: 'form',
  })
  if (error || !id) return { ok: false, error: 'No se pudo enviar el formulario.' }

  // El texto libre va a `messages`. Si falla, el lead ya está guardado y es lo
  // que importa: no se aborta el envío por perder el mensaje.
  if (validation.data.message) {
    await createMessage(tenant.id, {
      leadId: id,
      role: 'user',
      channel: 'web',
      content: validation.data.message,
    })
  }

  return { ok: true }
}
