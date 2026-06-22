import { Section, Container, SectionHeader, Heading, Text, BlockImage } from '@/components/ui'
import { cn } from '@/lib/cn'
import type { TeamProps } from '@/lib/builder/config'

type TeamItem = TeamProps['items'][number]

// Foto del miembro, o inicial sobre tinte de marca si no hay URL. `shape` adapta
// la foto a la variante: círculo (grid) o retrato vertical (cards/list).
function Avatar({ item, shape }: { item: TeamItem; shape: 'circle' | 'portrait' | 'square' }) {
  const radius = shape === 'circle' ? 'rounded-full' : 'rounded-xl'
  const ratio =
    shape === 'circle' ? 'size-24' : shape === 'portrait' ? 'aspect-3/4 w-full' : 'size-28'

  if (item.photo) {
    return <BlockImage src={item.photo} alt={item.name} className={cn('object-cover', radius, ratio)} />
  }
  return (
    <div
      aria-hidden
      className={cn(
        'flex items-center justify-center bg-brand/10 text-3xl font-bold text-brand',
        radius,
        ratio,
      )}
    >
      {item.name.charAt(0).toUpperCase()}
    </div>
  )
}

export function Team({ title, subtitle, variant, items }: TeamProps) {
  return (
    <Section background="gray">
      <Container>
        <SectionHeader
          title={title}
          subtitle={subtitle}
          align={variant === 'list' ? 'left' : 'center'}
        />

        {variant === 'grid' && (
          <ul className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {items.map((item, i) => (
              <li key={i} className="text-center">
                <div className="mx-auto mb-4 w-fit">
                  <Avatar item={item} shape="circle" />
                </div>
                <Heading as="h3" size="sm">{item.name}</Heading>
                {item.role && <Text size="sm" color="brand" className="mt-1">{item.role}</Text>}
                {item.bio && <Text size="sm" className="mt-2 text-gray-600">{item.bio}</Text>}
              </li>
            ))}
          </ul>
        )}

        {/* Retrato vertical + info alineada a la izquierda. */}
        {variant === 'cards' && (
          <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {items.map((item, i) => (
              <li key={i}>
                <Avatar item={item} shape="portrait" />
                <Heading as="h3" size="sm" className="mt-4">{item.name}</Heading>
                {item.role && <Text size="sm" color="brand" className="mt-1">{item.role}</Text>}
                {item.bio && <Text size="sm" className="mt-2 text-gray-600">{item.bio}</Text>}
              </li>
            ))}
          </ul>
        )}

        {/* Una fila por persona: foto a la izquierda, bio a la derecha. */}
        {variant === 'list' && (
          <ul className="divide-y divide-gray-200 border-t border-gray-200">
            {items.map((item, i) => (
              <li key={i} className="flex flex-col gap-5 py-6 sm:flex-row sm:items-center">
                <div className="shrink-0">
                  <Avatar item={item} shape="square" />
                </div>
                <div>
                  <Heading as="h3" size="sm">{item.name}</Heading>
                  {item.role && <Text size="sm" color="brand" className="mt-1">{item.role}</Text>}
                  {item.bio && <Text size="sm" className="mt-2 max-w-2xl text-gray-600">{item.bio}</Text>}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Container>
    </Section>
  )
}
