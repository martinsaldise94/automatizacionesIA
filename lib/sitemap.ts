// Generación de sitemap.xml y robots.txt por tenant. Lógica pura (construcción de
// strings) para testearla; las route handlers aportan el origin y los datos.

function xmlEscape(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

// Une origin + path sin dobles barras. path siempre empieza por '/'.
export function absUrl(origin: string, path: string): string {
  const base = origin.replace(/\/+$/, '')
  const p = path.startsWith('/') ? path : `/${path}`
  return base + (p === '/' ? '' : p)
}

export function buildSitemapXml(origin: string, paths: string[]): string {
  // Sin paths, `urlset` va vacío y sin línea en blanco suelta dentro.
  const urls = paths
    .map((p) => `  <url><loc>${xmlEscape(absUrl(origin, p))}</loc></url>\n`)
    .join('')
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}</urlset>\n`
}

// Rutas que entran en el sitemap: las páginas publicadas + el blog.
// El índice /blog solo se anuncia si hay algún post publicado — un sitemap que
// lista URLs que devuelven 404 es peor que no listarlas.
export function buildSitemapPaths(pagePaths: string[], postSlugs: string[]): string[] {
  if (postSlugs.length === 0) return [...pagePaths]
  return [...pagePaths, '/blog', ...postSlugs.map((slug) => `/blog/${slug}`)]
}

export function buildRobotsTxt(origin: string): string {
  return `User-agent: *\nAllow: /\n\nSitemap: ${absUrl(origin, '/sitemap.xml')}\n`
}

// Origin público desde los headers de la request (host original + protocolo).
// En dev (localhost) usa http; en prod, x-forwarded-proto o https por defecto.
export function originFromHeaders(host: string | null, forwardedProto: string | null): string {
  const h = host ?? 'localhost'
  const proto = forwardedProto ?? (h.includes('localhost') ? 'http' : 'https')
  return `${proto}://${h}`
}
