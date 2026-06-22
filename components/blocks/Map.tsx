'use client'

import { Section, Container, SectionHeader } from '@/components/ui'
import { useTenant } from '@/components/builder/TenantProvider'
import { buildMapEmbedUrl } from '@/lib/builder/map'
import type { MapProps } from '@/lib/builder/config'

export function Map({ title, useConfigAddress, address, zoom }: MapProps) {
  const { contact } = useTenant()
  // Dirección del tenant (Context) o la manual del bloque.
  const resolved = useConfigAddress ? (contact.address ?? '') : address
  const embedUrl = buildMapEmbedUrl(resolved, zoom)

  return (
    <Section background="white">
      <Container>
        <SectionHeader title={title} />
        {embedUrl ? (
          <div className="aspect-video w-full overflow-hidden rounded-xl bg-gray-100">
            <iframe
              src={embedUrl}
              title={title || 'Mapa'}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              className="h-full w-full border-0"
            />
          </div>
        ) : (
          <div className="flex aspect-video w-full items-center justify-center rounded-xl border-2 border-dashed border-gray-200 text-sm text-gray-400">
            Configura la dirección del negocio para mostrar el mapa.
          </div>
        )}
      </Container>
    </Section>
  )
}
