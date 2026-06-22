import { Section, Container, SectionHeader, Heading, Text, BlockImage } from '@/components/ui'
import { selectTestimonials, type Testimonial } from '@/lib/builder/testimonials'
import type { TestimonialsProps } from '@/lib/builder/config'

function Avatar({ item }: { item: Testimonial }) {
  if (item.avatar) {
    return <BlockImage src={item.avatar} alt={item.author} className="size-11 rounded-full object-cover" />
  }
  return (
    <span
      aria-hidden
      className="flex size-11 items-center justify-center rounded-full bg-brand/10 font-bold text-brand"
    >
      {item.author.charAt(0).toUpperCase()}
    </span>
  )
}

function Stars({ rating }: { rating: number }) {
  return (
    <div aria-label={`${rating} de 5`} className="text-sm text-brand">
      {'★'.repeat(Math.round(rating))}
      <span className="text-gray-300">{'★'.repeat(Math.max(0, 5 - Math.round(rating)))}</span>
    </div>
  )
}

export function Testimonials({ title, source, items }: TestimonialsProps) {
  // Las reseñas de Google llegarán por Context (futuro, tras la API key).
  const result = selectTestimonials(source, items)

  return (
    <Section background="gray">
      <Container>
        <SectionHeader title={title} />

        {result.mode === 'placeholder' ? (
          <p className="rounded-xl border-2 border-dashed border-gray-200 p-6 text-center text-sm text-gray-400">
            {result.reason === 'google-no-config'
              ? 'Conecta tu ficha de Google (Place ID) para mostrar las reseñas reales.'
              : 'Añade testimonios desde el editor.'}
          </p>
        ) : (
          <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {result.items.map((item, i) => (
              <li key={i} className="flex flex-col rounded-xl border border-gray-200 bg-white p-6">
                {/* Comilla de marca como firma — no es una card genérica de icono+texto */}
                <span aria-hidden className="font-serif text-5xl leading-none text-brand/30">“</span>
                <Text className="mt-2 flex-1 text-gray-700">{item.text}</Text>
                {typeof item.rating === 'number' && <div className="mt-3"><Stars rating={item.rating} /></div>}
                <div className="mt-5 flex items-center gap-3">
                  <Avatar item={item} />
                  <div>
                    <Heading as="h3" size="sm">{item.author}</Heading>
                    {item.role && <Text size="sm" color="muted">{item.role}</Text>}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Container>
    </Section>
  )
}
