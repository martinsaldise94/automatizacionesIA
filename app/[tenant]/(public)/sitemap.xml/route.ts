import type { NextRequest } from 'next/server'
import { resolveTenant } from '@/lib/tenant'
import { listPublishedPages } from '@/lib/db/pages'
import { listPublishedPostSlugs } from '@/lib/db/posts'
import { buildSitemapPaths, buildSitemapXml, originFromHeaders } from '@/lib/sitemap'

// sitemap.xml por tenant. El proxy reescribe /sitemap.xml → /[tenant]/sitemap.xml.
// Incluye páginas publicadas y posts publicados del blog.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tenant: string }> },
) {
  const { tenant: tenantIdentifier } = await params
  const tenant = await resolveTenant(tenantIdentifier)
  if (!tenant) return new Response('Not found', { status: 404 })

  const origin = originFromHeaders(
    request.headers.get('host'),
    request.headers.get('x-forwarded-proto'),
  )

  const [pages, postSlugs] = await Promise.all([
    listPublishedPages(tenant.id),
    listPublishedPostSlugs(tenant.id),
  ])

  const paths = buildSitemapPaths(pages.map((p) => p.path), postSlugs)

  return new Response(buildSitemapXml(origin, paths), {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  })
}
