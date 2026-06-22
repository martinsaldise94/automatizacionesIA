// URL de embed de Google Maps construida por NOSOTROS (nunca un embed del
// usuario). Variante clásica `output=embed`: no requiere API key. Deuda técnica
// consciente — se migra a la Maps Embed API oficial cuando exista la key.

const ZOOM_MIN = 1
const ZOOM_MAX = 20

function clampZoom(zoom: number): number {
  if (!Number.isFinite(zoom)) return 15
  return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, Math.round(zoom)))
}

/**
 * Devuelve la URL de embed para una dirección, o null si no hay dirección.
 * La dirección se codifica con encodeURIComponent (no se interpola cruda).
 */
export function buildMapEmbedUrl(address: string, zoom: number): string | null {
  const q = (address ?? '').trim()
  if (!q) return null
  return `https://www.google.com/maps?q=${encodeURIComponent(q)}&z=${clampZoom(zoom)}&output=embed`
}
