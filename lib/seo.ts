import type { Metadata } from 'next'
import type { Tenant } from '@/lib/supabase/types'

// SEO derivado de los datos del tenant. Lógica pura (sin Next runtime) para poder
// testearla. La usan generateMetadata (por página) y el JSON-LD del layout.

// Título por página: la home usa el título base del sitio; el resto antepone su
// propio título. Fallback al nombre del negocio si no hay seo.title.
export function pageTitle(tenant: Tenant, page: { title: string }, isHome: boolean): string {
  const base = tenant.config?.seo?.title?.trim() || tenant.name
  if (isHome) return base
  const pt = page.title?.trim()
  return pt ? `${pt} | ${base}` : base
}

export function pageMetadata(
  tenant: Tenant,
  page: { title: string },
  isHome: boolean,
): Metadata {
  const description = tenant.config?.seo?.description?.trim() || undefined
  const title = pageTitle(tenant, page, isHome)
  return {
    title,
    description,
    openGraph: { title, description, type: 'website' },
  }
}

// Schema.org LocalBusiness (JSON-LD) desde el contacto del tenant. Solo incluye
// los campos presentes; devuelve null si no hay ni nombre.
export function localBusinessJsonLd(tenant: Tenant): Record<string, unknown> | null {
  if (!tenant.name) return null
  const c = tenant.config?.contact
  const jsonLd: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: tenant.name,
  }
  if (c?.phone) jsonLd.telephone = c.phone
  if (c?.email) jsonLd.email = c.email
  if (c?.address) jsonLd.address = { '@type': 'PostalAddress', streetAddress: c.address }
  if (tenant.domain) jsonLd.url = `https://${tenant.domain}`
  const desc = tenant.config?.seo?.description?.trim()
  if (desc) jsonLd.description = desc
  return jsonLd
}
