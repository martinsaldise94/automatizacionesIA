import Link from 'next/link'
import { resolveTenant } from '@/lib/tenant'
import { listPublishedPages } from '@/lib/db/pages'
import { listPublishedPostSlugs } from '@/lib/db/posts'
import { orderNav, withBlogLink } from '@/lib/nav'
import { localBusinessJsonLd } from '@/lib/seo'

// Chrome de la web PÚBLICA del tenant (header con navegación + footer). Envuelve
// las páginas del builder y el blog. El branding (CSS vars) lo pone el layout de
// [tenant]; aquí se usa vía los tokens de marca (bg-brand, text-brand...).
//
// Si el tenant no está activo, resolveTenant devuelve null: renderizamos solo los
// children (la página hará notFound()). No 404 aquí para no tragarnos el 404 real.
export default async function PublicLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ tenant: string }>
}) {
  const { tenant: tenantIdentifier } = await params
  const tenant = await resolveTenant(tenantIdentifier)
  if (!tenant) return <>{children}</>

  const [pages, postSlugs] = await Promise.all([
    listPublishedPages(tenant.id),
    listPublishedPostSlugs(tenant.id),
  ])
  const nav = withBlogLink(orderNav(pages), postSlugs.length > 0)
  const contact = tenant.config?.contact
  const year = new Date().getFullYear()
  const jsonLd = localBusinessJsonLd(tenant)

  return (
    <div className="flex min-h-screen flex-col bg-white font-[var(--brand-font)]">
      {jsonLd && (
        <script
          type="application/ld+json"
          // JSON.stringify de datos controlados por nosotros (no HTML de usuario).
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      <header className="sticky top-0 z-40 border-b border-black/5 bg-white/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
          <Link href="/" className="text-lg font-semibold tracking-tight text-gray-900">
            {tenant.config?.branding?.logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={tenant.config.branding.logo} alt={tenant.name} className="h-8 w-auto" />
            ) : (
              tenant.name
            )}
          </Link>

          <nav className="hidden items-center gap-7 text-sm font-medium text-gray-600 sm:flex">
            {nav.map((item) => (
              <Link key={item.path} href={item.path} className="transition-colors hover:text-gray-900">
                {item.label}
              </Link>
            ))}
          </nav>

          {contact?.whatsapp && (
            <a
              href={`https://wa.me/${contact.whatsapp.replace(/[^\d]/g, '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full bg-brand px-4 py-2 text-sm font-semibold text-brand-fg transition-transform hover:scale-[1.03]"
            >
              Contactar
            </a>
          )}
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-black/5 bg-gray-50">
        <div className="mx-auto max-w-6xl px-5 py-10 text-sm text-gray-500">
          <div className="flex flex-col justify-between gap-6 sm:flex-row">
            <div>
              <p className="font-semibold text-gray-900">{tenant.name}</p>
              {contact?.address && <p className="mt-1 max-w-xs">{contact.address}</p>}
            </div>
            <div className="flex flex-col gap-1">
              {contact?.phone && <a href={`tel:${contact.phone}`} className="hover:text-gray-900">{contact.phone}</a>}
              {contact?.email && (
                <a href={`mailto:${contact.email}`} className="hover:text-gray-900">
                  {contact.email}
                </a>
              )}
            </div>
          </div>
          <p className="mt-8 text-xs text-gray-400">
            © {year} {tenant.name}. Todos los derechos reservados.
          </p>
        </div>
      </footer>
    </div>
  )
}
