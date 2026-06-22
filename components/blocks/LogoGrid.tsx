import { Section, Container, Heading } from '@/components/ui'
import type { LogoGridProps } from '@/lib/builder/config'

export function LogoGrid({ title, items }: LogoGridProps) {
  return (
    <Section background="white">
      <Container>
        {title && (
          <Heading as="h2" className="mb-10 text-center text-balance">
            {title}
          </Heading>
        )}
        <ul className="flex flex-wrap items-center justify-center gap-8 sm:gap-12">
          {items.map((item, i) => {
            const img = (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={item.logo}
                alt={item.name}
                className="h-10 w-auto object-contain grayscale opacity-60 transition-all duration-200 hover:grayscale-0 hover:opacity-100"
              />
            )
            return (
              <li key={i}>
                {item.href ? (
                  <a
                    href={item.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
                  >
                    {img}
                  </a>
                ) : (
                  img
                )}
              </li>
            )
          })}
        </ul>
      </Container>
    </Section>
  )
}
