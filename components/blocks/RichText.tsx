import { Section, Container } from '@/components/ui'
import { Markdown } from '@/components/ui/Markdown'
import type { RichTextProps } from '@/lib/builder/config'

// El render de markdown (y su política de seguridad) vive en components/ui/Markdown.
// Aquí solo se aporta el envoltorio de bloque.
export function RichText({ content }: RichTextProps) {
  return (
    <Section background="white">
      <Container narrow>
        <Markdown>{content}</Markdown>
      </Container>
    </Section>
  )
}
