'use client'

import { useState } from 'react'
import { Section, Container, Heading, Text } from '@/components/ui'
import { cn } from '@/lib/cn'
import type { FaqProps } from '@/lib/builder/config'

export function FAQ({ title, subtitle, items }: FaqProps) {
  const [open, setOpen] = useState<number | null>(null)

  return (
    <Section background="white">
      <Container narrow>
        {(title || subtitle) && (
          <div className="mb-10 text-center">
            {title && <Heading as="h2" className="text-balance">{title}</Heading>}
            {subtitle && <Text size="lg" className="mt-3 text-gray-600">{subtitle}</Text>}
          </div>
        )}

        <dl className="divide-y divide-gray-100">
          {items.map((item, i) => (
            <div key={i}>
              <dt>
                <button
                  type="button"
                  onClick={() => setOpen(open === i ? null : i)}
                  aria-expanded={open === i}
                  className="flex w-full items-center justify-between gap-4 py-5 text-left"
                >
                  <Heading as="h3" size="sm" className="text-balance">
                    {item.question}
                  </Heading>
                  <span
                    aria-hidden
                    className={cn(
                      'shrink-0 text-brand transition-transform duration-200 ease-out',
                      open === i && 'rotate-180',
                    )}
                  >
                    ▾
                  </span>
                </button>
              </dt>
              {open === i && (
                <dd className="pb-5">
                  <Text className="text-gray-600">{item.answer}</Text>
                </dd>
              )}
            </div>
          ))}
        </dl>
      </Container>
    </Section>
  )
}
