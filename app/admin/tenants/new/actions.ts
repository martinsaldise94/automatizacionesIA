'use server'

import { redirect } from 'next/navigation'
import { createServiceClient } from '@/lib/supabase/service'
import { validateSlug } from '@/lib/slug'

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

  const supabase = createServiceClient()

  const { data: existing } = await supabase
    .from('tenants')
    .select('id')
    .eq('slug', slug)
    .maybeSingle()

  if (existing) {
    redirect(`/admin/tenants/new?error=${encodeURIComponent('El slug ya está en uso')}`)
  }

  const { data, error } = await supabase
    .from('tenants')
    .insert({ slug, name, plan, status: 'setup' } as never)
    .select('id')
    .single()

  if (error || !data) {
    redirect(`/admin/tenants/new?error=${encodeURIComponent('Error al crear el tenant')}`)
  }

  redirect(`/admin/tenants/${(data as { id: string }).id}`)
}
