import { Section, Container, Heading, Text, Button } from '@/components/ui'
import { cn } from '@/lib/cn'
import type { CtaProps } from '@/lib/builder/config'

const bgFor = {
  white:   'white',
  primary: 'brand',
  dark:    'dark',
} as const

export function CTA({ title, subtitle, ctaText, ctaType, ctaHref, background }: CtaProps) {
  const onBrand = background === 'primary'
  const onDark  = background === 'dark'

  return (
    <Section background={bgFor[background]}>
      <Container narrow>
        <div className="text-center">
          <Heading
            as="h2"
            className={cn(
              'text-balance',
              onBrand && 'text-brand-fg',
              onDark  && 'text-white',
            )}
          >
            {title}
          </Heading>

          {subtitle && (
            <Text
              size="lg"
              className={cn(
                'mt-4',
                onBrand ? 'text-brand-fg/80' : onDark ? 'text-white/70' : 'text-gray-600',
              )}
            >
              {subtitle}
            </Text>
          )}

          {ctaText && (
            <div className="mt-8">
              <Button
                variant={onBrand || onDark ? 'secondary' : 'brand'}
                size="lg"
                ctaType={ctaType}
                href={ctaHref}
                className="group"
              >
                {ctaText}
                <span
                  aria-hidden
                  className="transition-transform duration-200 ease-out group-hover:translate-x-1"
                >
                  →
                </span>
              </Button>
            </div>
          )}
        </div>
      </Container>
    </Section>
  )
}
