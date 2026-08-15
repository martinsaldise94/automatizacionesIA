// Qué campos del Hero tienen sentido según el diseño elegido. Lógica pura →
// testeable sin montar el editor.
//
// Nace de una fricción real: el campo de imagen se mostraba siempre, pero la
// variante "solo texto" descarta la imagen a propósito. El dueño subía una
// foto, se guardaba... y el bloque la ignoraba sin decir nada. Desde fuera eso
// no parece una opción de diseño: parece que la plataforma está rota.
//
// Regla: **no se ofrece un control que no hace nada.** Si un campo no va a
// tener efecto con el diseño elegido, no se enseña.

export type HeroVariant = 'centered' | 'image-left' | 'image-right' | 'image-background'

const CON_IMAGEN: HeroVariant[] = ['image-left', 'image-right', 'image-background']

export function heroUsesImage(variant: unknown): boolean {
  return CON_IMAGEN.includes(variant as HeroVariant)
}

// El oscurecido solo existe cuando hay una foto DETRÁS del texto. En las
// variantes de imagen al lado no hay nada que oscurecer.
export function heroUsesOverlay(variant: unknown): boolean {
  return variant === 'image-background'
}

// Con la foto ocupando toda la sección, el selector de fondo (blanco/primario/
// gris) no pinta nada: no se ve. Se esconde para no prometer un cambio que no
// va a ocurrir.
export function heroUsesBackground(variant: unknown): boolean {
  return variant !== 'image-background'
}

// Devuelve los campos a mostrar. No muta el objeto que recibe: Puck reutiliza
// esa referencia entre renders y quitarle una clave in situ la haría
// desaparecer también de las demás variantes, y ya no volvería sin recargar.
export function heroFieldsFor<F extends Record<string, unknown>>(
  variant: unknown,
  fields: F,
): Partial<F> {
  const resto: Record<string, unknown> = { ...fields }

  if (!heroUsesImage(variant)) delete resto.image
  if (!heroUsesOverlay(variant)) delete resto.overlay
  if (!heroUsesBackground(variant)) delete resto.background

  return resto as Partial<F>
}
