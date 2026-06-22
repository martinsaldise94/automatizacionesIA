import { Section, Container, SectionHeader, Heading, Text } from '@/components/ui'
import type { ServicesProps } from '@/lib/builder/config'

// Tile de icono de marca — recurso compartido entre variantes (firma del bloque).
function IconTile({ icon }: { icon: string }) {
  if (!icon) return null
  return (
    <span
      aria-hidden
      className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-xl text-brand"
    >
      {icon}
    </span>
  )
}

export function Services({ title, subtitle, variant, items }: ServicesProps) {
  return (
    <Section background="white">
      <Container>
        {/* list es editorial → cabecera a la izquierda; el resto centrada */}
        <SectionHeader title={title} subtitle={subtitle} align={variant === 'list' ? 'left' : 'center'} />

        {variant === 'cards' && (
          <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((item, i) => (
              <li key={i} className="rounded-xl border border-gray-200 p-6">
                <IconTile icon={item.icon} />
                <Heading as="h3" size="sm" className="mt-4">{item.name}</Heading>
                {item.description && (
                  <Text size="sm" className="mt-2 text-gray-600">{item.description}</Text>
                )}
              </li>
            ))}
          </ul>
        )}

        {variant === 'grid' && (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((item, i) => (
              <li key={i} className="flex items-start gap-4 rounded-xl bg-gray-50 p-5">
                <IconTile icon={item.icon} />
                <div>
                  <Heading as="h3" size="sm">{item.name}</Heading>
                  {item.description && (
                    <Text size="sm" className="mt-1 text-gray-600">{item.description}</Text>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}

        {variant === 'list' && (
          <ul className="divide-y divide-gray-200 border-t border-gray-200">
            {items.map((item, i) => (
              <li key={i} className="flex items-start gap-5 py-6">
                <IconTile icon={item.icon} />
                <div>
                  <Heading as="h3" size="sm">{item.name}</Heading>
                  {item.description && (
                    <Text className="mt-1 max-w-2xl text-gray-600">{item.description}</Text>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Container>
    </Section>
  )
}
