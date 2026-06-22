import type { ContactConfig } from '@/lib/supabase/types'

// Construye los items de contacto (con sus enlaces) a partir de config.contact.
// Lógica testeable: limpieza del número de WhatsApp, esquemas tel:/mailto:, etc.
// Los datos vienen del tenant vía Context — NUNCA de props editables.

export type ContactItemType = 'phone' | 'whatsapp' | 'email' | 'address' | 'hours'

export type ContactItem = {
  type: ContactItemType
  label: string
  value: string
  href?: string
}

// Deja solo dígitos (para wa.me); +34 600 11 22 → 3460011 22 → 346001122
const digits = (s: string) => s.replace(/\D/g, '')
// tel: admite + y dígitos
const telHref = (s: string) => `tel:${s.replace(/[^\d+]/g, '')}`

export function buildContactItems(contact: ContactConfig): ContactItem[] {
  const items: ContactItem[] = []

  if (contact.phone?.trim()) {
    items.push({ type: 'phone', label: 'Teléfono', value: contact.phone.trim(), href: telHref(contact.phone) })
  }
  if (contact.whatsapp?.trim()) {
    items.push({
      type: 'whatsapp',
      label: 'WhatsApp',
      value: contact.whatsapp.trim(),
      href: `https://wa.me/${digits(contact.whatsapp)}`,
    })
  }
  if (contact.email?.trim()) {
    items.push({ type: 'email', label: 'Email', value: contact.email.trim(), href: `mailto:${contact.email.trim()}` })
  }
  if (contact.address?.trim()) {
    items.push({
      type: 'address',
      label: 'Dirección',
      value: contact.address.trim(),
      href: `https://www.google.com/maps?q=${encodeURIComponent(contact.address.trim())}`,
    })
  }
  if (contact.hours?.trim()) {
    items.push({ type: 'hours', label: 'Horario', value: contact.hours.trim() })
  }

  return items
}
