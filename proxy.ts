import { type NextRequest, NextResponse } from 'next/server'

// Hostname base de la plataforma derivado de NEXT_PUBLIC_APP_URL.
// Dev → "localhost"  |  Prod → "miagencia.com"
const APP_HOSTNAME = new URL(
  process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
).hostname

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const hostname = (request.headers.get('host') ?? '').split(':')[0]

  // Headers de confianza: el cliente nunca puede inyectarlos.
  // x-tenant se borra siempre; x-pathname se sobrescribe siempre con el path real.
  const baseHeaders = new Headers(request.headers)
  baseHeaders.delete('x-tenant')
  baseHeaders.set('x-pathname', pathname)

  // sitemap.xml y robots.txt SÍ son por tenant (se reescriben aunque lleven
  // extensión); el resto de archivos con extensión pasan sin tocar.
  const isTenantSeoFile = pathname === '/sitemap.xml' || pathname === '/robots.txt'

  // Rutas que no pertenecen a ningún tenant — pasar sin reescribir
  if (
    pathname.startsWith('/admin') ||
    pathname.startsWith('/_next') ||
    (/\.\w+$/.test(pathname) && !isTenantSeoFile) // archivos estáticos con extensión
  ) {
    return NextResponse.next({ request: { headers: baseHeaders } })
  }

  // Dominio raíz (la plataforma misma) — sin tenant
  if (
    hostname === APP_HOSTNAME ||
    hostname === `www.${APP_HOSTNAME}`
  ) {
    return NextResponse.next({ request: { headers: baseHeaders } })
  }

  let tenantIdentifier: string

  if (hostname.endsWith(`.${APP_HOSTNAME}`) || hostname.endsWith('.localhost')) {
    // Subdominio → slug es la primera parte del host
    tenantIdentifier = hostname.split('.')[0]
  } else {
    // Dominio propio → pasar el host completo; resolveTenant() lo busca por domain
    tenantIdentifier = hostname
  }

  // Reescribir la URL para que Next.js enrute a app/[tenant]/...
  // El layout leerá params.tenant y llamará resolveTenant(params.tenant)
  const rewritten = request.nextUrl.clone()
  rewritten.pathname = `/${tenantIdentifier}${pathname === '/' ? '' : pathname}`

  // Inyectar x-tenant en headers upstream (útil en layouts sin params, ej. route handlers)
  baseHeaders.set('x-tenant', tenantIdentifier)

  return NextResponse.rewrite(rewritten, { request: { headers: baseHeaders } })
}

export const config = {
  matcher: [
    // Excluir archivos estáticos de Next.js e imágenes; incluir todo lo demás
    '/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
