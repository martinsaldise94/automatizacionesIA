'use server'

import { redirect } from 'next/navigation'
import { validateSlug } from '@/lib/slug'
import { tenantSlugExists, createTenant as createTenantRow } from '@/lib/db/tenants'

const VALID_PLANS = ['tier_1', 'tier_2', 'tier_3'] as const

export async function createTenant(formData: FormData) {
  const slug = ((formData.get('slug') as string) ?? '').trim().toLowerCase()
  const name = ((formData.get('name') as string) ?? '').trim()
  const plan = ((formData.get('plan') as string) ?? 'tier_1').trim()

  if (!name) {
    redirect(`/admin/tenants/new?error=${encodeURIComponent('El nombre es obligatorio')}`)
  }

  const slugError = validateSlug(slug)
  if (slugError) {
    redirect(`/admin/tenants/new?error=${encodeURIComponent(slugError)}`)
  }

  if (!(VALID_PLANS as readonly string[]).includes(plan)) {
    redirect(`/admin/tenants/new?error=${encodeURIComponent('Plan inválido')}`)
  }

  if (await tenantSlugExists(slug)) {
    redirect(`/admin/tenants/new?error=${encodeURIComponent('El slug ya está en uso')}`)
  }

  const { id, error } = await createTenantRow({ slug, name, plan: plan as typeof VALID_PLANS[number] })

  if (error || !id) {
    redirect(`/admin/tenants/new?error=${encodeURIComponent('Error al crear el tenant')}`)
  }

  redirect(`/admin/tenants/${id}`)
}
