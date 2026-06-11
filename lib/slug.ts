// Slugs que nunca puede usar un tenant: chocan con rutas de la app,
// subdominios técnicos o palabras que confunden el routing.
export const RESERVED_SLUGS = new Set([
  'admin',
  'api',
  'app',
  'www',
  'mail',
  'smtp',
  'ftp',
  'blog',
  'docs',
  'static',
  'assets',
  'cdn',
  'login',
  'signup',
  'dashboard',
  'portal',
  'new',
  'edit',
  'localhost',
  'staging',
  'dev',
  'test',
])

// Minúsculas, números y guiones. Sin empezar ni acabar en guion. Máx 63 chars (límite DNS).
const SLUG_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/

// Devuelve un mensaje de error o null si el slug es válido.
export function validateSlug(slug: string): string | null {
  if (!SLUG_PATTERN.test(slug)) {
    return 'Slug inválido: solo minúsculas, números y guiones; sin empezar ni acabar en guion.'
  }
  if (RESERVED_SLUGS.has(slug)) {
    return `Slug reservado: "${slug}" no se puede usar.`
  }
  return null
}
