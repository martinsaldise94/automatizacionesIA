// Lógica de subida de imágenes del builder (Paso 8).
//
// Seguridad (references/builder.md): solo jpg/png/webp — **SVG NO** (puede llevar
// scripts). El MIME se valida por su valor real server-side, nunca por la
// extensión del nombre. El nombre del archivo lo GENERAMOS nosotros (uuid), así
// que no hay inyección de path desde el cliente. Las imágenes van a
// `tenant-assets/{tenant_id}/...`; el aislamiento lo da el tenant resuelto en
// servidor (nunca del cliente).

export const ALLOWED_IMAGE_MIME = ['image/jpeg', 'image/png', 'image/webp'] as const
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024 // 5 MB

export const STORAGE_BUCKET = 'tenant-assets'

export type ImageFileError = 'tipo' | 'tamano'

// Mapea el MIME permitido a su extensión canónica.
const MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
}

export function extForImageMime(mime: string): string | null {
  return MIME_TO_EXT[mime?.toLowerCase?.() ?? ''] ?? null
}

// Valida un archivo de imagen. MIME por valor real (no por extensión).
export function validateImageFile(
  mime: string,
  size: number,
): { ok: true } | { ok: false; reason: ImageFileError } {
  if (!(ALLOWED_IMAGE_MIME as readonly string[]).includes(mime?.toLowerCase?.() ?? '')) {
    return { ok: false, reason: 'tipo' }
  }
  if (!Number.isFinite(size) || size <= 0 || size > MAX_IMAGE_BYTES) {
    return { ok: false, reason: 'tamano' }
  }
  return { ok: true }
}

// Construye la ruta del objeto en Storage: `{tenant_id}/{id}.{ext}`. El tenantId
// se resuelve en servidor; el id (uuid) lo genera el caller. Función pura para
// poder testear el formato sin depender de crypto.
export function buildAssetPath(tenantId: string, id: string, ext: string): string {
  return `${tenantId}/${id}.${ext}`
}
