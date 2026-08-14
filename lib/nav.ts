// Orden del menú de navegación pública: la home ('/') siempre primero; el resto
// por título (locale-aware). Lógica pura para testearla sin DB.

export type NavItem = { path: string; title: string; label: string }

export function orderNav(pages: Array<{ path: string; title: string }>): NavItem[] {
  const items = pages.map((p) => ({
    path: p.path,
    title: p.title,
    // La home se etiqueta "Inicio" si su título es genérico/vacío.
    label: p.path === '/' ? p.title || 'Inicio' : p.title,
  }))

  return items.sort((a, b) => {
    if (a.path === '/') return -1
    if (b.path === '/') return 1
    return a.label.localeCompare(b.label, 'es')
  })
}

// El blog no es una página del builder, así que no sale de `pages`: se añade aparte.
// Mismo criterio que el sitemap (`buildSitemapPaths`): solo se anuncia si hay algún
// post publicado — enlazar una sección vacía es enlazar un 404.
export function withBlogLink(nav: NavItem[], hasPublishedPosts: boolean): NavItem[] {
  if (!hasPublishedPosts) return nav
  if (nav.some((item) => item.path === '/blog')) return nav
  return [...nav, { path: '/blog', title: 'Blog', label: 'Blog' }]
}
