import type { CustomField } from '@measured/puck'
import { LazyImagePicker } from './LazyImagePicker'

// Campo de imagen de Puck: subir un archivo DEL EQUIPO o pegar una URL.
// Sustituye a los `type: 'text'` con los que había que pegar la URL a mano —
// un dueño no técnico no tiene la URL de una foto suya en ninguna parte.
//
// ⚠️ ESTE ARCHIVO NO LLEVA 'use client', Y ES A PROPÓSITO.
//
// Lo llama `lib/builder/config.tsx`, que se evalúa TAMBIÉN en el servidor
// (plantillas de alta, validación al publicar, sitemap). Una función exportada
// desde un módulo `'use client'` no se puede invocar desde el servidor: es una
// referencia, no una función, y el módulo revienta al evaluarse. Ya pasó una
// vez — "Attempted to call imageField() from the server".
//
// La parte que sí necesita ser cliente (el `dynamic` con `ssr: false`) vive en
// `LazyImagePicker.tsx`. Aquí solo se RENDERIZA ese componente, que es lo único
// que el servidor puede hacer con un componente de cliente.
export function imageField(label: string): CustomField<string> {
  return {
    type: 'custom',
    label,
    // `render` solo lo invoca Puck en el editor, nunca el render público.
    // Puck da `value` sin definir en un bloque recién arrastrado.
    render: ({ value, onChange }) => (
      <LazyImagePicker value={value ?? ''} onChange={onChange} label={label} />
    ),
  }
}
