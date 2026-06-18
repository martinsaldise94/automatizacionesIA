import { Section, Container, SectionHeader } from '@/components/ui'
import type { GalleryProps } from '@/lib/builder/config'

type GalleryItem = GalleryProps['items'][number]

function GalleryItem({ item }: { item: GalleryItem }) {
  if (!item.image) return null
  return (
    <figure>
      {/* eslint-disable-next-line @next/next/no-img-element -- tenant URL */}
      <img
        src={item.image}
        alt={item.alt || ''}
        className="w-full rounded-xl bg-gray-100 object-cover"
      />
      {item.caption && (
        <figcaption className="mt-2 text-center text-sm text-gray-500">
          {item.caption}
        </figcaption>
      )}
    </figure>
  )
}

export function Gallery({ title, variant, items }: GalleryProps) {
  return (
    <Section background="white">
      <Container>
        <SectionHeader title={title} />

        {variant === 'masonry' ? (
          <ul className="columns-2 gap-4 sm:columns-3">
            {items.map((item, i) => (
              <li key={i} className="mb-4 break-inside-avoid">
                <GalleryItem item={item} />
              </li>
            ))}
          </ul>
        ) : (
          // grid y carousel (carousel diferido a Paso 8) usan grid simple
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((item, i) => (
              <li key={i}>
                <GalleryItem item={item} />
              </li>
            ))}
          </ul>
        )}
      </Container>
    </Section>
  )
}
