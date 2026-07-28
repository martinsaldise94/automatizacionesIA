import { notFound } from 'next/navigation'
import { resolveTenantForPortal } from '@/lib/tenant'
import { BrandingForm } from './BrandingForm'

// Editor de branding del dueño: colores, fuente y logo. Los cambios se guardan en
// config.branding y el layout de [tenant] los aplica como CSS variables.
export default async function BrandingPage({
  params,
}: {
  params: Promise<{ tenant: string }>
}) {
  const { tenant: tenantIdentifier } = await params
  const tenant = await resolveTenantForPortal(tenantIdentifier)
  if (!tenant) notFound()

  const b = tenant.config?.branding

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="text-2xl font-semibold text-gray-900">Marca</h1>
      <p className="mt-1 text-sm text-gray-500">
        Colores, tipografía y logo de tu web. Se aplican a todas tus páginas.
      </p>
      <BrandingForm
        initial={{
          primaryColor: b?.primaryColor ?? '#000000',
          secondaryColor: b?.secondaryColor ?? '#f5f5f5',
          fontFamily: b?.fontFamily ?? '',
          logo: b?.logo ?? '',
        }}
      />
    </div>
  )
}
