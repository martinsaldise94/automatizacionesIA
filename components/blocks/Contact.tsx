'use client'

import { Section, Container, SectionHeader } from '@/components/ui'
import { cn } from '@/lib/cn'
import { useTenant } from '@/components/builder/TenantProvider'
import { buildContactItems, type ContactItemType } from '@/lib/builder/contact'
import type { ContactProps } from '@/lib/builder/config'

// Iconos geométricos inline (sin dependencia). currentColor → hereda text-brand.
const iconProps = {
  width: 20,
  height: 20,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.7,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
}

const icons: Record<ContactItemType, React.ReactNode> = {
  phone: <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.9.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92Z" />,
  whatsapp: <path d="M3 21l1.65-3.8a9 9 0 1 1 3.4 2.9L3 21M9 10a.5.5 0 0 0 1 0V9a.5.5 0 0 0-1 0v1a5 5 0 0 0 5 5h1a.5.5 0 0 0 0-1h-1a.5.5 0 0 0 0 1" />,
  email: <><rect x="2" y="4" width="20" height="16" rx="2" /><path d="m2 7 10 6 10-6" /></>,
  address: <><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" /><circle cx="12" cy="10" r="3" /></>,
  hours: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
}

export function Contact({ title, subtitle, variant }: ContactProps) {
  const { contact } = useTenant()
  const items = buildContactItems(contact)
  const social = Object.entries(contact.social ?? {})

  const centered = variant === 'centered'

  if (items.length === 0 && social.length === 0) {
    return (
      <Section background="white">
        <Container narrow>
          <SectionHeader title={title} subtitle={subtitle} align={centered ? 'center' : 'left'} />
          <p className="rounded-xl border-2 border-dashed border-gray-200 p-6 text-center text-sm text-gray-400">
            Configura los datos de contacto del negocio en el panel de administración.
          </p>
        </Container>
      </Section>
    )
  }

  return (
    <Section background="white">
      <Container narrow={variant !== 'horizontal'}>
        <SectionHeader title={title} subtitle={subtitle} align={centered ? 'center' : 'left'} />

        <ul
          className={cn(
            variant === 'horizontal' && 'grid gap-6 sm:grid-cols-2 lg:grid-cols-3',
            variant === 'vertical' && 'flex flex-col gap-5',
            centered && 'flex flex-col items-center gap-5 text-center',
          )}
        >
          {items.map((item) => (
            <li key={item.type} className={cn('flex gap-3', centered && 'flex-col items-center')}>
              <span
                aria-hidden
                className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand"
              >
                <svg {...iconProps}>{icons[item.type]}</svg>
              </span>
              <div>
                <div className="text-sm font-medium text-gray-500">{item.label}</div>
                {item.href ? (
                  <a
                    href={item.href}
                    className="text-brand underline-offset-2 hover:underline"
                    {...(item.type === 'whatsapp' || item.type === 'address'
                      ? { target: '_blank', rel: 'noopener noreferrer' }
                      : {})}
                  >
                    {item.value}
                  </a>
                ) : (
                  <div className="text-foreground">{item.value}</div>
                )}
              </div>
            </li>
          ))}
        </ul>

        {social.length > 0 && (
          <ul className={cn('mt-8 flex flex-wrap gap-x-6 gap-y-2', centered && 'justify-center')}>
            {social.map(([name, url]) => (
              <li key={name}>
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-brand capitalize underline-offset-2 hover:underline"
                >
                  {name}
                </a>
              </li>
            ))}
          </ul>
        )}
      </Container>
    </Section>
  )
}
