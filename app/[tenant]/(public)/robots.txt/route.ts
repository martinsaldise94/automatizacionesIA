import type { NextRequest } from 'next/server'
import { resolveTenant } from '@/lib/tenant'
import { buildRobotsTxt, originFromHeaders } from '@/lib/sitemap'

// robots.txt por tenant (apunta a su sitemap). El proxy reescribe /robots.txt →
// /[tenant]/robots.txt.
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

  return new Response(buildRobotsTxt(origin), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  })
}
