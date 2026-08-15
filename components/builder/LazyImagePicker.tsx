'use client'

import dynamic from 'next/dynamic'

// ─── POR QUÉ ESTE ARCHIVO EXISTE ─────────────────────────────────────────────
//
// El `dynamic(..., { ssr: false })` tiene que ejecutarse en un módulo de
// CLIENTE. `imageField.tsx` no puede serlo: lo llama `lib/builder/config.tsx`,
// que también se evalúa en el servidor (plantillas de alta, validación al
// publicar, sitemap). Una función exportada desde un módulo `'use client'` no
// es invocable desde el servidor —es una referencia— y revienta al evaluar el
// módulo. Ya pasó.
//
// Así que el envoltorio de carga diferida vive aquí y `imageField` solo lo
// RENDERIZA, que es lo único que el servidor puede hacer con un componente de
// cliente.
//
// El diferido sigue cumpliendo su función: este archivo es de dos líneas, y el
// selector de verdad (con la server action de subida y toda la UI) queda en un
// chunk aparte que la web pública no pide jamás. `PublicRender` importa la
// config entera, así que sin esto viajaría al navegador de cada visitante.
const PuckImagePicker = dynamic(() => import('./PuckImagePicker'), {
  ssr: false,
  loading: () => <p className="text-sm text-gray-500">Cargando selector…</p>,
})

export function LazyImagePicker({
  value,
  onChange,
  label,
}: {
  value: string
  onChange: (url: string) => void
  label: string
}) {
  return <PuckImagePicker value={value} onChange={onChange} label={label} />
}
