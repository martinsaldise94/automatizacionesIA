import { Section, Container, Heading, Text, Button, FramedImage } from '@/components/ui'
import { cn } from '@/lib/cn'
import type { HeroProps } from '@/lib/builder/config'

// HeroProps.background ('white'|'primary'|'gray') → fondo de Section ('white'|'gray'|'brand'|'dark')
const bgFor = {
  white: 'white',
  primary: 'brand',
  gray: 'gray',
} as const

export function Hero({
  title,
  subtitle,
  variant,
  image,
  ctaText,
  ctaHref,
  ctaType,
  background,
}: HeroProps) {
  const onBrand = background === 'primary'
  // 'centered' o variante de imagen sin URL → layout centrado (degradación elegante)
  const showImage = variant !== 'centered' && Boolean(image)
  const centered = !showImage
  const imageRight = variant === 'image-right'

  const content = (
    <>
      <Heading
        as="h1"
        size="xl"
        className={cn('text-balance lg:text-6xl', onBrand && 'text-brand-fg')}
      >
        {title}
      </Heading>

      {subtitle && (
        <Text
          size="lg"
          className={cn(
            'mt-5 max-w-[58ch]',
            centered && 'mx-auto',
            onBrand ? 'text-brand-fg/90' : 'text-gray-600',
          )}
        >
          {subtitle}
        </Text>
      )}

      {ctaText && (
        <div className={cn('mt-8 flex flex-wrap items-center gap-4', centered && 'justify-center')}>
          <Button
            variant={onBrand ? 'secondary' : 'brand'}
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
    </>
  )

  if (centered) {
    return (
      <Section background={bgFor[background]}>
        <Container>
          <div className="mx-auto max-w-3xl text-center">{content}</div>
        </Container>
      </Section>
    )
  }

  return (
    <Section background={bgFor[background]}>
      <Container>
        <div className="grid items-center gap-10 lg:grid-cols-12 lg:gap-16">
          <div className={cn('lg:col-span-6', imageRight ? 'lg:order-1' : 'lg:order-2')}>
            {content}
          </div>

          <div className={cn('lg:col-span-6', imageRight ? 'lg:order-2' : 'lg:order-1')}>
            <FramedImage src={image} alt="" />
          </div>
        </div>
      </Container>
    </Section>
  )
}
