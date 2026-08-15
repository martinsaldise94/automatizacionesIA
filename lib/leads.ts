import { z } from 'zod'

// Lógica pura de captación de leads desde la web pública. Sin DB ni runtime de
// Next → testeable.
//
// Este es el PRIMER endpoint de escritura abierto a internet del proyecto: no
// requiere sesión. Todo lo que entra por aquí es hostil hasta que se demuestre
// lo contrario.

// Tope del mensaje libre. Evita que alguien use el formulario como almacén.
export const MAX_MESSAGE_BYTES = 2 * 1024 // 2 KB

// Un humano no rellena un formulario en menos de esto.
export const MIN_FILL_MS = 2_000

// Techo de leads por tenant y hora. Es la barrera DURA contra el abuso: se
// cuenta contra la base de datos, así que no se esquiva cambiando de IP.
export const MAX_LEADS_PER_HOUR = 30

const inputSchema = z.object({
  name: z.string(),
  email: z.string().optional().default(''),
  phone: z.string().optional().default(''),
  message: z.string().optional().default(''),
})

export type ValidLeadInput = {
  name: string
  email: string | null
  phone: string | null
  message: string | null
}

export type LeadValidation = { ok: true; data: ValidLeadInput } | { ok: false; error: string }

const EMAIL = z.string().email()

// Validación server-side del formulario público. La action nunca escribe sin
// pasar por aquí.
export function validateLeadInput(raw: unknown): LeadValidation {
  const parsed = inputSchema.safeParse(raw)
  if (!parsed.success) return { ok: false, error: 'Faltan datos del formulario.' }

  const name = parsed.data.name.trim()
  if (!name) return { ok: false, error: 'Dinos cómo te llamas.' }

  const email = parsed.data.email.trim().toLowerCase()
  const phone = parsed.data.phone.trim()
  const message = parsed.data.message

  // Sin email ni teléfono el lead es papel mojado: nadie puede contestarle.
  if (!email && !phone) {
    return { ok: false, error: 'Déjanos un email o un teléfono para poder responderte.' }
  }
  if (email && !EMAIL.safeParse(email).success) {
    return { ok: false, error: 'Ese email no parece válido.' }
  }

  // Bytes reales: el castellano lleva acentos y en UTF-8 no ocupan un byte.
  if (Buffer.byteLength(message, 'utf8') > MAX_MESSAGE_BYTES) {
    return { ok: false, error: 'El mensaje es demasiado largo.' }
  }

  return {
    ok: true,
    data: {
      name,
      email: email || null,
      phone: phone || null,
      message: message.trim() || null,
    },
  }
}

// Heurística anti-bot. Los dos datos los manda el cliente y se pueden falsear,
// así que esto frena bots tontos, NO a un atacante. La barrera real es
// `overLeadRateLimit`, que cuenta contra la DB.
export function isLikelySpam(signals: { honeypot: string; elapsedMs: number }): boolean {
  // Campo oculto por CSS: invisible para una persona, irresistible para un bot.
  if (signals.honeypot.trim() !== '') return true

  // Sin marca de tiempo utilizable no se puede afirmar que sea humano.
  if (!Number.isFinite(signals.elapsedMs) || signals.elapsedMs < 0) return true

  return signals.elapsedMs < MIN_FILL_MS
}

export function overLeadRateLimit(leadsLastHour: number): boolean {
  return leadsLastHour >= MAX_LEADS_PER_HOUR
}
