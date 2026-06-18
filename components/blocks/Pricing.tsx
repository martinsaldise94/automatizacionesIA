import { Section, Container, SectionHeader, Heading, Text, Button } from '@/components/ui'
import { cn } from '@/lib/cn'
import type { PricingProps } from '@/lib/builder/config'

export function Pricing({ title, subtitle, items }: PricingProps) {
  return (
    <Section background="gray">
      <Container>
        <SectionHeader title={title} subtitle={subtitle} />

        <ul className="grid items-start gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item, i) => {
            const features = item.featuresText
              .split('\n')
              .map((f) => f.trim())
              .filter(Boolean)

            const hi = item.highlighted

            return (
              <li
                key={i}
                className={cn(
                  'flex flex-col rounded-2xl p-8',
                  // Un solo recurso por superficie: el plan destacado se eleva y se rellena
                  // de marca; los normales llevan un borde simple. Sin ring+sombra apilados.
                  hi
                    ? 'bg-brand text-brand-fg lg:-mt-4 lg:pb-12'
                    : 'border border-gray-200 bg-white',
                )}
              >
                <div className="flex items-center justify-between gap-3">
                  <Heading as="h3" size="sm" className={hi ? 'text-brand-fg' : ''}>
                    {item.name}
                  </Heading>
                  {hi && (
                    <span className="rounded-full bg-brand-fg/15 px-3 py-1 text-xs font-medium text-brand-fg">
                      Recomendado
                    </span>
                  )}
                </div>

                <div className="mt-4 flex items-baseline gap-1">
                  <span className={cn('text-4xl font-bold tracking-tight', hi ? 'text-brand-fg' : '')}>
                    {item.price}
                  </span>
                  <span className={cn('text-sm', hi ? 'text-brand-fg/70' : 'text-gray-500')}>
                    /{item.period}
                  </span>
                </div>

                {features.length > 0 && (
                  <ul className="mt-6 flex flex-1 flex-col gap-3">
                    {features.map((f, fi) => (
                      <li key={fi} className="flex items-start gap-2">
                        <span
                          aria-hidden
                          className={cn('mt-0.5 text-sm font-bold', hi ? 'text-brand-fg' : 'text-brand')}
                        >
                          ✓
                        </span>
                        <Text size="sm" className={hi ? 'text-brand-fg/90' : 'text-gray-700'}>
                          {f}
                        </Text>
                      </li>
                    ))}
                  </ul>
                )}

                {item.ctaText && (
                  <div className="mt-8">
                    <Button
                      variant={hi ? 'secondary' : 'brand-outline'}
                      size="md"
                      className="w-full justify-center"
                    >
                      {item.ctaText}
                    </Button>
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      </Container>
    </Section>
  )
}
