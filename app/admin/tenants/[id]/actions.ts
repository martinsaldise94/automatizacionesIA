'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { requireAdmin } from '@/lib/admin-auth'
import {
  updateTenantBasic,
  updateTenantConfig,
  updateTenantAiConfig,
  getTenantOwnerId,
  setTenantOwner,
} from '@/lib/db/tenants'

const VALID_PLANS   = ['tier_1', 'tier_2', 'tier_3'] as const
const VALID_STATUSES = ['setup', 'active', 'paused'] as const

const configSchema = z.object({
  branding: z.object({
    logo:           z.string().optional(),
    primaryColor:   z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Color primario inválido (usa #rrggbb)'),
    secondaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Color secundario inválido (usa #rrggbb)'),
    fontFamily:     z.string().optional(),
  }),
  contact: z.object({
    phone:    z.string().optional(),
    whatsapp: z.string().optional(),
    email:    z.string().optional(),
    address:  z.string().optional(),
    hours:    z.string().optional(),
  }),
  seo: z.object({
    title:       z.string().min(1, 'Título SEO obligatorio'),
    description: z.string().min(1, 'Descripción SEO obligatoria'),
    keywords:    z.array(z.string()).optional(),
  }),
})

const aiConfigSchema = z.object({
  businessName:  z.string().min(1, 'Nombre del negocio obligatorio'),
  tone:          z.string().min(1, 'Tono obligatorio'),
  model:         z.string().optional(),
  services:      z.array(z.string()),
  faqs:          z.array(z.object({ q: z.string(), a: z.string() })),
  handoffRules:  z.array(z.string()),
})

function err(id: string, msg: string): never {
  redirect(`/admin/tenants/${id}?error=${encodeURIComponent(msg)}`)
}

// ─── Información básica ───────────────────────────────────────────────────────

export async function updateBasic(id: string, formData: FormData) {
  await requireAdmin()

  const name   = (formData.get('name')   as string ?? '').trim()
  const domain = (formData.get('domain') as string ?? '').trim() || null
  const plan   = formData.get('plan')   as string
  const status = formData.get('status') as string

  if (!name) err(id, 'El nombre es obligatorio')
  if (!VALID_PLANS.includes(plan as typeof VALID_PLANS[number]))     err(id, 'Plan inválido')
  if (!VALID_STATUSES.includes(status as typeof VALID_STATUSES[number])) err(id, 'Estado inválido')

  const { error } = await updateTenantBasic(id, {
    name,
    domain,
    plan:   plan   as typeof VALID_PLANS[number],
    status: status as typeof VALID_STATUSES[number],
  })
  if (error) err(id, error.message)

  revalidatePath(`/admin/tenants/${id}`)
  redirect(`/admin/tenants/${id}?ok=1`)
}

// ─── Branding + Contacto + SEO ────────────────────────────────────────────────

export async function updateConfig(id: string, formData: FormData) {
  await requireAdmin()

  const raw = {
    branding: {
      logo:           (formData.get('branding.logo')          as string ?? '').trim() || undefined,
      primaryColor:   (formData.get('branding.primaryColor')  as string) || '#000000',
      secondaryColor: (formData.get('branding.secondaryColor') as string) || '#ffffff',
      fontFamily:     (formData.get('branding.fontFamily')    as string ?? '').trim() || undefined,
    },
    contact: {
      phone:    (formData.get('contact.phone')    as string ?? '').trim() || undefined,
      whatsapp: (formData.get('contact.whatsapp') as string ?? '').trim() || undefined,
      email:    (formData.get('contact.email')    as string ?? '').trim() || undefined,
      address:  (formData.get('contact.address')  as string ?? '').trim() || undefined,
      hours:    (formData.get('contact.hours')    as string ?? '').trim() || undefined,
    },
    seo: {
      title:       (formData.get('seo.title')       as string ?? '').trim(),
      description: (formData.get('seo.description') as string ?? '').trim(),
      keywords:    (formData.get('seo.keywords') as string ?? '')
        .split(',').map(k => k.trim()).filter(Boolean),
    },
  }

  const result = configSchema.safeParse(raw)
  if (!result.success) err(id, result.error.issues[0]?.message ?? 'Config inválida')

  const { error } = await updateTenantConfig(id, result.data)
  if (error) err(id, error.message)

  revalidatePath(`/admin/tenants/${id}`)
  redirect(`/admin/tenants/${id}?ok=1`)
}

// ─── Usuario dueño ───────────────────────────────────────────────────────────

export async function inviteOwner(id: string, formData: FormData) {
  await requireAdmin()

  const email = (formData.get('email') as string ?? '').trim().toLowerCase()
  if (!email) err(id, 'El email es obligatorio')

  // No invitar un segundo dueño: dejaría al anterior con acceso huérfano.
  if (await getTenantOwnerId(id)) {
    err(id, 'Este tenant ya tiene dueño. Cambia su email en vez de invitar a otro.')
  }

  // Auth (auth.admin) no es parte de lib/db: service client directo.
  const service = createServiceClient()

  const { data: invited, error: inviteError } = await service.auth.admin.inviteUserByEmail(email)
  if (inviteError) err(id, inviteError.message)

  // app_metadata es la fuente de verdad para RLS (solo escribible con service role).
  const { error: metaError } = await service.auth.admin.updateUserById(invited!.user.id, {
    app_metadata: { tenant_id: id, role: 'owner' },
  })
  if (metaError) err(id, metaError.message)

  // owner_user_id en el tenant = índice inverso para encontrar al dueño sin escanear.
  const { error: linkError } = await setTenantOwner(id, invited!.user.id)
  if (linkError) err(id, linkError.message)

  revalidatePath(`/admin/tenants/${id}`)
  redirect(`/admin/tenants/${id}?ok=1`)
}

export async function changeOwnerEmail(id: string, formData: FormData) {
  await requireAdmin()

  const email = (formData.get('email') as string ?? '').trim().toLowerCase()
  if (!email) err(id, 'El nuevo email es obligatorio')

  // El dueño se lee de la DB, NO de un campo del form: nadie puede manipular a
  // qué usuario se le cambia el email (defensa en profundidad).
  const ownerUserId = await getTenantOwnerId(id)
  if (!ownerUserId) err(id, 'Este tenant no tiene dueño asignado')

  // Auth (auth.admin) no es parte de lib/db: service client directo.
  const service = createServiceClient()
  const { error } = await service.auth.admin.updateUserById(ownerUserId, { email })
  if (error) err(id, error.message)

  revalidatePath(`/admin/tenants/${id}`)
  redirect(`/admin/tenants/${id}?ok=1`)
}

// ─── Agente IA ────────────────────────────────────────────────────────────────

export async function updateAiConfig(id: string, formData: FormData) {
  await requireAdmin()

  const faqsRaw = (formData.get('faqs') as string ?? '').trim()
  let faqs: { q: string; a: string }[] = []

  if (faqsRaw) {
    try {
      const parsed = JSON.parse(faqsRaw)
      if (!Array.isArray(parsed)) throw new Error()
      faqs = parsed
    } catch {
      err(id, 'FAQs: JSON inválido. Formato esperado: [{"q":"pregunta","a":"respuesta"}]')
    }
  }

  const raw = {
    businessName: (formData.get('businessName') as string ?? '').trim(),
    tone:         (formData.get('tone')         as string ?? '').trim(),
    model:        (formData.get('model')        as string ?? '').trim() || undefined,
    services:     (formData.get('services')     as string ?? '')
      .split('\n').map(s => s.trim()).filter(Boolean),
    faqs,
    handoffRules: (formData.get('handoffRules') as string ?? '')
      .split('\n').map(r => r.trim()).filter(Boolean),
  }

  const result = aiConfigSchema.safeParse(raw)
  if (!result.success) err(id, result.error.issues[0]?.message ?? 'AI config inválida')

  const { error } = await updateTenantAiConfig(id, result.data)
  if (error) err(id, error.message)

  revalidatePath(`/admin/tenants/${id}`)
  redirect(`/admin/tenants/${id}?ok=1`)
}
