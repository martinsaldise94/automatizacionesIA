import { Section, Container, SectionHeader } from '@/components/ui'
import { cn } from '@/lib/cn'
import type { StatsProps } from '@/lib/builder/config'

type StatItem = StatsProps['items'][number]

function Figure({ item, className }: { item: StatItem; className?: string }) {
  return (
    <div className={className}>
      <div className="text-4xl font-bold tracking-tight text-brand sm:text-5xl">
        {item.number}
        {item.suffix}
      </div>
      <div className="mt-2 text-sm text-gray-600">{item.label}</div>
    </div>
  )
}

export function Stats({ title, variant, items }: StatsProps) {
  return (
    <Section background="gray">
      <Container>
        <SectionHeader title={title} align={variant === 'stacked' ? 'left' : 'center'} />

        {variant === 'grid' && (
          <dl className="grid grid-cols-2 gap-8 sm:grid-cols-3 lg:grid-cols-4">
            {items.map((item, i) => (
              <Figure key={i} item={item} className="text-center" />
            ))}
          </dl>
        )}

        {/* Banda horizontal con reglas verticales entre cifras — tratamiento editorial. */}
        {variant === 'row' && (
          <dl className="grid grid-cols-2 gap-y-8 sm:flex sm:items-center sm:justify-between sm:divide-x sm:divide-gray-300">
            {items.map((item, i) => (
              <Figure key={i} item={item} className="text-center sm:flex-1 sm:px-6" />
            ))}
          </dl>
        )}

        {/* Cifras grandes alineadas a la izquierda, cada una con regla de marca. */}
        {variant === 'stacked' && (
          <dl className="grid gap-px overflow-hidden rounded-2xl bg-gray-200 sm:grid-cols-2 lg:grid-cols-4">
            {items.map((item, i) => (
              <div key={i} className="bg-gray-50 p-6">
                <div className="h-1 w-10 rounded-full bg-brand" aria-hidden />
                <div className="mt-4 text-4xl font-bold tracking-tight sm:text-5xl">
                  {item.number}
                  {item.suffix}
                </div>
                <div className={cn('mt-1 text-sm text-gray-600')}>{item.label}</div>
              </div>
            ))}
          </dl>
        )}
      </Container>
    </Section>
  )
}
