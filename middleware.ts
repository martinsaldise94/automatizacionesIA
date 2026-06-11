import { type NextRequest, NextResponse } from 'next/server'

// Hostname base de la plataforma derivado de NEXT_PUBLIC_APP_URL.
// Dev → "localhost"  |  Prod → "miagencia.com"
const APP_HOSTNAME = new URL(
  process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
).hostname

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const hostname = (request.headers.get('host') ?? '').split(':')[0]

  // Rutas que no pertenecen a ningún tenant — pasar sin modificar
  if (
    pathname.startsWith('/admin') ||
    pathname.startsWith('/_next') ||
    /\.\w+$/.test(pathname) // archivos estáticos con extensión
  ) {
    return NextResponse.next()
  }

  // Dominio raíz (la plataforma misma) — sin tenant
  if (
    hostname === APP_HOSTNAME ||
    hostname === `www.${APP_HOSTNAME}`
  ) {
    return NextResponse.next()
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
  const headers = new Headers(request.headers)
  headers.set('x-tenant', tenantIdentifier)

  return NextResponse.rewrite(rewritten, { request: { headers } })
}

export const config = {
  matcher: [
    // Excluir archivos estáticos de Next.js e imágenes; incluir todo lo demás
    '/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
