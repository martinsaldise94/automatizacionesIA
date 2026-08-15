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
    // Solo se excluyen las rutas que NUNCA llegan a código de aplicación:
    // los assets compilados de Next.
    //
    // Antes se excluían también `favicon.ico` y todo lo acabado en .svg/.png/
    // .jpg/.jpeg/.gif/.webp, y eso era un agujero latente: **lo excluido del
    // matcher no pasa por esta función, así que su `x-tenant` NO se borra**.
    // Hoy no hay ninguna ruta de servidor con esas extensiones, pero el día
    // que exista una (`opengraph-image`, un `route.ts` que devuelva un PNG),
    // recibiría el header tal cual lo mandó el cliente — y `x-tenant` es lo
    // que decide de qué cliente son los datos.
    //
    // La exclusión tampoco hacía falta para el enrutado: la comprobación de
    // "path con extensión" de arriba ya evita reescribir esas peticiones.
    // Coste: el proxy corre también sobre las imágenes de /public. Barato,
    // y el grueso del tráfico estático sigue fuera por `_next/*`.
    '/((?!_next/static|_next/image).*)',
  ],
}
