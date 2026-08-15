import type { NextConfig } from 'next'

// Origen de Supabase, para no abrir `connect-src` a todo internet.
// Si la variable falta en build, se cae a `https:` (menos estricto, no roto).
const supabaseOrigin = (() => {
  try {
    return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').origin
  } catch {
    return 'https:'
  }
})()

const isProd = process.env.NODE_ENV === 'production'

// ─── CSP que SÍ se aplica ────────────────────────────────────────────────────
//
// Solo directivas que no pueden romper nada y que cierran ataques reales:
//
// - frame-ancestors 'self' → clickjacking. Sin esto, un atacante mete /posts o
//   /builder en un iframe, superpone un botón y le hace clic al dueño logueado
//   sobre "Borrar página". El confirm() del navegador no protege de eso.
//   'self' y NO 'none': Puck renderiza su preview en un iframe same-origin.
// - base-uri 'self'       → impide reescribir la base de las URLs relativas.
// - form-action 'self'    → impide que un form inyectado postee fuera.
// - object-src 'none'     → nada de <object>/<embed>.
const cspEnforced = [
  "frame-ancestors 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join('; ')

// ─── CSP completa, en modo SOLO-REPORTE ──────────────────────────────────────
//
// `script-src` estricto requiere nonce por petición, y el nonce hay que
// generarlo en `proxy.ts` — que es la frontera de aislamiento entre tenants y
// no se toca en el mismo cambio que arregla un CVE de bypass de proxy.
//
// Mientras tanto va en Report-Only: el navegador NO bloquea nada, solo avisa en
// consola de lo que se bloquearía. Sirve para medir el destrozo antes de
// aplicarla de verdad.
//
// PARA PROMOVERLA A ENFORCING: abre el builder (con Puck), una página pública y
// el blog; mira la consola; ajusta; y entonces cambia la clave de cabecera a
// 'Content-Security-Policy'. No antes.
const cspReportOnly = [
  "default-src 'self'",
  // 'unsafe-inline'/'unsafe-eval': lo que Next y Puck necesitan HOY. Es
  // justamente lo que el nonce vendrá a eliminar.
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  // Logos y portadas son URLs https arbitrarias que pega el dueño.
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  `connect-src 'self' ${supabaseOrigin}`,
  // Mapas (bloque Map) y vídeo (YouTube/Vimeo, con allowlist en el bloque).
  "frame-src 'self' https://www.google.com https://www.youtube.com https://player.vimeo.com",
  "frame-ancestors 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join('; ')

const securityHeaders = [
  { key: 'Content-Security-Policy', value: cspEnforced },
  { key: 'Content-Security-Policy-Report-Only', value: cspReportOnly },
  // Redundante con frame-ancestors para navegadores viejos.
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  // Impide que el navegador adivine el tipo: una imagen subida no se ejecuta
  // como HTML aunque el contenido lo parezca.
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  // No filtrar la URL completa (lleva el slug del tenant) a terceros.
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=()' },
  { key: 'X-DNS-Prefetch-Control', value: 'off' },
  // HSTS solo en producción: en local se sirve por http y forzar https rompe.
  ...(isProd
    ? [{ key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' }]
    : []),
]

const nextConfig: NextConfig = {
  // `poweredByHeader: false` quita `X-Powered-By: Next.js`. No es una defensa,
  // pero no hay motivo para anunciar el stack y su versión.
  poweredByHeader: false,

  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }]
  },
}

export default nextConfig
