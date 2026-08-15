'use client'

import { Section, Container, Heading, Text, Button } from '@/components/ui'
import { cn } from '@/lib/cn'
import { useTenant } from '@/components/builder/TenantProvider'
import { resolveCtaLink } from '@/lib/builder/cta'
import type { CtaProps } from '@/lib/builder/config'

const bgFor = {
  white:   'white',
  primary: 'brand',
  dark:    'dark',
} as const

export function CTA({ title, subtitle, ctaText, ctaType, ctaHref, background }: CtaProps) {
  const onBrand = background === 'primary'
  const onDark  = background === 'dark'

  // El número de WhatsApp sale de la ficha del tenant, no de una prop: el dueño
  // lo teclea una vez y vale para todos los CTA. `link` es null cuando no hay
  // destino válido (p. ej. tipo WhatsApp sin número configurado) → no se pinta
  // el botón, porque uno que apunta a '#' engaña al visitante.
  const { contact } = useTenant()
  const link = resolveCtaLink(ctaType, ctaHref, contact?.whatsapp)

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

          {ctaText && link && (
            <div className="mt-8">
              <Button
                variant={onBrand || onDark ? 'secondary' : 'brand'}
                size="lg"
                href={link.href}
                newTab={link.external}
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
