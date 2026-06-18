import { Section, Container, Heading, Text } from '@/components/ui'
import { cn } from '@/lib/cn'
import type { TextImageProps } from '@/lib/builder/config'

const colMap = {
  '50/50': ['lg:col-span-6', 'lg:col-span-6'],
  '60/40': ['lg:col-span-7', 'lg:col-span-5'],
  '40/60': ['lg:col-span-5', 'lg:col-span-7'],
} as const

export function TextImage({ title, text, image, imageAlt, variant, proportion }: TextImageProps) {
  const [textCols, imgCols] = colMap[proportion]
  const imageLeft = variant === 'image-left'

  return (
    <Section background="white">
      <Container>
        <div className="grid items-center gap-10 lg:grid-cols-12 lg:gap-16">
          <div className={cn(textCols, imageLeft ? 'lg:order-2' : 'lg:order-1')}>
            <Heading as="h2" className="text-balance">{title}</Heading>
            {text && (
              <Text size="lg" className="mt-5 text-gray-600">{text}</Text>
            )}
          </div>

          {image && (
            <div className={cn('relative', imgCols, imageLeft ? 'lg:order-1' : 'lg:order-2')}>
              <div aria-hidden className="absolute -inset-2 -z-10 translate-x-3 translate-y-3 rounded-2xl bg-brand/10" />
              {/* eslint-disable-next-line @next/next/no-img-element -- tenant URL */}
              <img
                src={image}
                alt={imageAlt || ''}
                className="aspect-4/3 w-full rounded-2xl object-cover"
              />
            </div>
          )}
        </div>
      </Container>
    </Section>
  )
}
