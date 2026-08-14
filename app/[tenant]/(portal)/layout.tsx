import Link from 'next/link'
import { headers } from 'next/headers'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { resolveTenantForPortal } from '@/lib/tenant'
import { canAccessPortal } from '@/lib/guard'
import { SignOutButton } from './auth/SignOutButton'

// Guard del portal del dueño. Mismo patrón que el layout de /admin:
// la página de login (/auth) NO se protege para evitar bucle de redirects.
export default async function PortalLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ tenant: string }>
}) {
  const pathname = (await headers()).get('x-pathname') ?? ''

  // No proteger /auth (login) — si no, redirect infinito.
  if (pathname === '/auth' || pathname.startsWith('/auth/')) {
    return <>{children}</>
  }

  const { tenant: tenantIdentifier } = await params
  const tenant = await resolveTenantForPortal(tenantIdentifier)
  if (!tenant) notFound()

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Sesión + pertenencia a ESTE tenant (o admin). La URL sola no autoriza.
  if (!canAccessPortal(user, tenant.id)) {
    redirect('/auth')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-3">
        <div className="flex items-center gap-6">
          <span className="font-semibold text-gray-900">{tenant.name}</span>
          <nav className="flex items-center gap-4 text-sm">
            <Link href="/builder" className="text-gray-600 hover:text-gray-900">
              Páginas
            </Link>
            <Link href="/branding" className="text-gray-600 hover:text-gray-900">
              Marca
            </Link>
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-500">{user?.email}</span>
          <SignOutButton />
        </div>
      </header>
      <main className="p-6">{children}</main>
    </div>
  )
}
