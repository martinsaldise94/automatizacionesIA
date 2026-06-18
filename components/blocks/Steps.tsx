import { Section, Container, Heading, Text } from '@/components/ui'
import { cn } from '@/lib/cn'
import type { StepsProps } from '@/lib/builder/config'

export function Steps({ title, subtitle, variant, items }: StepsProps) {
  const horizontal = variant === 'horizontal'

  return (
    <Section background="gray">
      <Container>
        {(title || subtitle) && (
          <div className="mb-12 text-center">
            {title && <Heading as="h2" className="text-balance">{title}</Heading>}
            {subtitle && <Text size="lg" className="mt-3 text-gray-600">{subtitle}</Text>}
          </div>
        )}

        <ol
          className={cn(
            horizontal
              ? 'grid gap-8 sm:grid-cols-2 lg:grid-cols-3'
              : 'mx-auto flex max-w-2xl flex-col gap-8',
          )}
        >
          {items.map((item, i) => (
            <li key={i} className="flex items-start gap-5">
              <span
                aria-hidden
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand text-brand-fg text-sm font-bold"
              >
                {i + 1}
              </span>
              <div>
                <Heading as="h3" className="text-balance">{item.title}</Heading>
                {item.description && (
                  <Text size="md" className="mt-2 text-gray-600">{item.description}</Text>
                )}
              </div>
            </li>
          ))}
        </ol>
      </Container>
    </Section>
  )
}
