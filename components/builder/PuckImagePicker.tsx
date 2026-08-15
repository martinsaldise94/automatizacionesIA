'use client'

import { ImagePicker } from '@/components/portal/ImagePicker'
import { uploadImageAction } from '@/app/[tenant]/(portal)/upload'

// Adaptador entre el campo de Puck y el `ImagePicker` que ya usa el blog.
// Existe solo para atar aquí la server action de subida y NO en la config del
// builder: `PublicRender` es cliente e importa la config entera, así que todo
// lo que cuelgue de ella viaja al navegador de cada visitante de la web
// pública. Por eso este archivo se carga en diferido desde `imageField.tsx`.
export default function PuckImagePicker({
  value,
  onChange,
  label,
}: {
  value: string
  onChange: (url: string) => void
  label: string
}) {
  return (
    <ImagePicker value={value} onChange={onChange} onUpload={uploadImageAction} label={label} />
  )
}
