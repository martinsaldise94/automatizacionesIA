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

// Resultado de subir una imagen. Vive aquí (y no junto a la server action) para
// que el componente cliente pueda tiparlo sin importar nada de `app/`.
export type UploadResult = { ok: true; url: string } | { ok: false; error: string }

// Mensaje para el dueño del negocio. Compartido por la action (servidor) y por la
// validación temprana del componente (cliente): un solo texto, no dos que se
// desincronizan.
export function imageErrorMessage(reason: ImageFileError): string {
  return reason === 'tipo'
    ? 'Formato no permitido (usa JPG, PNG o WEBP).'
    : 'La imagen supera el tamaño máximo (5 MB).'
}

// Mapea el MIME permitido a su extensión canónica.
const MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
}

export function extForImageMime(mime: string): string | null {
  return MIME_TO_EXT[mime?.toLowerCase?.() ?? ''] ?? null
}

// ─── Identificación real del formato (magic bytes) ───────────────────────────
//
// `file.type` lo declara el NAVEGADOR: renombrar un .html a .jpg y anunciarlo
// como image/jpeg no cuesta nada, y sin esto pasaba la validación entera.
// Aquí se mira lo que el archivo ES, no lo que dice ser.
//
// Es también donde la prohibición del SVG deja de depender del cliente: un SVG
// es XML y puede llevar <script>, y no tiene la cabecera de ninguno de los tres
// formatos permitidos.

// Bytes que hay que leer para decidir. WEBP es el que más necesita: su marca
// está en las posiciones 8-11.
export const SNIFF_BYTES = 16

function empiezaPor(bytes: Uint8Array, firma: number[], desde = 0): boolean {
  if (bytes.length < desde + firma.length) return false
  return firma.every((b, i) => bytes[desde + i] === b)
}

export function sniffImageMime(bytes: Uint8Array): string | null {
  if (!(bytes instanceof Uint8Array)) return null

  // JPEG: FF D8 FF
  if (empiezaPor(bytes, [0xff, 0xd8, 0xff])) return 'image/jpeg'

  // PNG: 89 "PNG" CR LF SUB LF
  if (empiezaPor(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return 'image/png'

  // WEBP: "RIFF" ... "WEBP". Los dos trozos hacen falta: un WAV también
  // empieza por "RIFF", así que mirar solo el prefijo dejaría pasar cualquier
  // contenedor RIFF.
  if (
    empiezaPor(bytes, [0x52, 0x49, 0x46, 0x46]) &&
    empiezaPor(bytes, [0x57, 0x45, 0x42, 0x50], 8)
  ) {
    return 'image/webp'
  }

  return null
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
