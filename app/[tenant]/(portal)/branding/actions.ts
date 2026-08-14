'use server'

import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { resolveTenantForPortal } from '@/lib/tenant'
import { canAccessPortal } from '@/lib/guard'
import { getTenantById, updateTenantConfig } from '@/lib/db/tenants'

const HEX = /^#[0-9a-fA-F]{6}$/
const brandingInput = z.object({
  primaryColor: z.string().regex(HEX, 'Color primario inválido (usa #rrggbb).'),
  secondaryColor: z.string().regex(HEX, 'Color secundario inválido (usa #rrggbb).'),
  fontFamily: z.string().max(120).optional(),
  logo: z.string().url('URL de logo inválida.').max(500).optional().or(z.literal('')),
})

export type BrandingResult = { ok: true } | { ok: false; error: string }

export async function updateBrandingAction(input: unknown): Promise<BrandingResult> {
  // Autorización: dueño de ESTE tenant (o admin). Tenant del header de confianza.
  const tenantIdentifier = (await headers()).get('x-tenant') ?? ''
  const tenant = await resolveTenantForPortal(tenantIdentifier)
  if (!tenant) return { ok: false, error: 'No autorizado.' }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!canAccessPortal(user, tenant.id)) return { ok: false, error: 'No autorizado.' }

  const parsed = brandingInput.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Datos inválidos.' }
  }

  // Merge sobre el config actual (no perder contact/seo). getTenantById devuelve
  // el config completo; solo reemplazamos branding.
  const current = await getTenantById(tenant.id)
  if (!current) return { ok: false, error: 'No se encontró el tenant.' }

  const nextConfig = {
    ...current.config,
    branding: {
      ...current.config?.branding,
      primaryColor: parsed.data.primaryColor,
      secondaryColor: parsed.data.secondaryColor,
      fontFamily: parsed.data.fontFamily || undefined,
      logo: parsed.data.logo || undefined,
    },
  }

  const { error } = await updateTenantConfig(tenant.id, nextConfig)
  if (error) return { ok: false, error: 'No se pudo guardar.' }

  revalidatePath('/', 'layout') // re-aplica el branding del layout de [tenant]
  return { ok: true }
}
