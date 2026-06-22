// Selección de fuente del bloque Testimonials.
//
// `manual`: reseñas escritas por el dueño en el editor (props).
// `google`: reseñas de Google Places, resueltas server-side e inyectadas vía
//   Context (futuro, tras GOOGLE_PLACES_API_KEY). Mientras no haya reseñas,
//   el bloque muestra un placeholder en vez de romper.

export type Testimonial = {
  text: string
  author: string
  role: string
  avatar: string
  rating?: number
}

export type TestimonialsResult =
  | { mode: 'list'; items: Testimonial[] }
  | { mode: 'placeholder'; reason: 'google-no-config' | 'empty' }

export function selectTestimonials(
  source: 'manual' | 'google',
  items: Testimonial[],
  reviews?: Testimonial[] | null,
): TestimonialsResult {
  if (source === 'google') {
    return reviews && reviews.length > 0
      ? { mode: 'list', items: reviews }
      : { mode: 'placeholder', reason: 'google-no-config' }
  }

  const valid = (items ?? []).filter((i) => i.text?.trim() && i.author?.trim())
  return valid.length > 0 ? { mode: 'list', items: valid } : { mode: 'placeholder', reason: 'empty' }
}
