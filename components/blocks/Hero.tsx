'use client'

import { Section, Container, Heading, Text, Button, FramedImage, BlockImage } from '@/components/ui'
import { cn } from '@/lib/cn'
import { useTenant } from '@/components/builder/TenantProvider'
import { resolveCtaLink } from '@/lib/builder/cta'
import type { HeroProps } from '@/lib/builder/config'

export type HeroOverlay = 'suave' | 'medio' | 'fuerte'

// Velo oscuro sobre la foto. NO es decoración: es lo único que garantiza que el
// texto blanco se lea encima de una imagen cualquiera. Sin él, una foto clara
// deja el titular invisible — y el dueño no tiene forma de saber que el fallo
// es suyo por elegir esa foto.
//
// 'medio' es el valor por defecto porque funciona con la mayoría de fotos.
// 'suave' sobre una imagen muy clara puede quedarse corto para AA; por eso la
// opción se llama "Poco" y no "Ninguno": quitarlo del todo no se ofrece.
const overlayMap: Record<HeroOverlay, string> = {
  suave:  'bg-gray-900/45',
  medio:  'bg-gray-900/60',
  fuerte: 'bg-gray-900/75',
}

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
  overlay,
  ctaText,
  ctaHref,
  ctaType,
  background,
}: HeroProps) {
  // Foto DETRÁS del texto. Sin foto degrada al layout centrado normal en vez de
  // pintar una sección oscura vacía.
  const asBackground = variant === 'image-background' && Boolean(image)

  const onBrand = background === 'primary' && !asBackground
  // Imagen AL LADO. 'centered' o variante de imagen sin URL → layout centrado.
  const showImage = (variant === 'image-left' || variant === 'image-right') && Boolean(image)
  const centered = !showImage
  const imageRight = variant === 'image-right'

  // Sobre la foto todo el texto va en blanco: el gris de cuerpo del sistema
  // (`text-gray-600`) es ilegible sobre un velo oscuro.
  const onPhoto = asBackground

  // Mismo criterio que el bloque CTA: el número de WhatsApp sale de la ficha del
  // tenant, y `link` es null cuando no hay destino válido → no se pinta el botón.
  const { contact } = useTenant()
  const link = resolveCtaLink(ctaType, ctaHref, contact?.whatsapp)

  const content = (
    <>
      <Heading
        as="h1"
        size="xl"
        className={cn(
          'text-balance lg:text-6xl',
          onBrand && 'text-brand-fg',
          onPhoto && 'text-white',
        )}
      >
        {title}
      </Heading>

      {subtitle && (
        <Text
          size="lg"
          className={cn(
            'mt-5 max-w-[58ch]',
            centered && 'mx-auto',
            onPhoto ? 'text-white/90' : onBrand ? 'text-brand-fg/90' : 'text-gray-600',
          )}
        >
          {subtitle}
        </Text>
      )}

      {ctaText && link && (
        <div className={cn('mt-8 flex flex-wrap items-center gap-4', centered && 'justify-center')}>
          <Button
            variant={onBrand || onPhoto ? 'secondary' : 'brand'}
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
    </>
  )

  if (asBackground) {
    return (
      // `background="dark"` no es redundante: si la foto no carga (URL rota,
      // bucket caído), queda un fondo oscuro y el texto blanco se sigue
      // leyendo. Sin él, blanco sobre blanco.
      // `isolate` acota el z-index: sin él, el -z-10 se colaría por detrás de
      // la página entera y la foto desaparecería.
      <Section background="dark" className="relative isolate overflow-hidden">
        <BlockImage
          src={image}
          alt=""
          className="absolute inset-0 -z-10 h-full w-full object-cover"
        />
        <div aria-hidden className={cn('absolute inset-0 -z-10', overlayMap[overlay] ?? overlayMap.medio)} />

        <Container>
          <div className="mx-auto flex min-h-[50vh] max-w-3xl flex-col justify-center py-8 text-center">
            {content}
          </div>
        </Container>
      </Section>
    )
  }

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
