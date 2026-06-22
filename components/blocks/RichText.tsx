import type { Components } from 'react-markdown'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Section, Container, Heading } from '@/components/ui'
import { BlockImage } from '@/components/ui'
import type { RichTextProps } from '@/lib/builder/config'

// SEGURIDAD: sin `rehype-raw`. react-markdown no procesa HTML crudo por defecto,
// así que un <script> en el contenido sale ESCAPADO como texto, nunca ejecutado.
// Además su `urlTransform` por defecto neutraliza URLs peligrosas (javascript:).

const external = (href?: string) => /^https?:\/\//i.test(href ?? '')

// Mapeo a nuestro sistema (no `prose`): coherente con el resto de bloques y
// brand-adaptive. Los encabezados bajan un nivel (la h1 de la página es el Hero).
const components: Components = {
  h1: ({ children }) => <Heading as="h2" size="lg" className="mt-8 mb-3 first:mt-0">{children}</Heading>,
  h2: ({ children }) => <Heading as="h3" size="md" className="mt-8 mb-3 first:mt-0">{children}</Heading>,
  h3: ({ children }) => <Heading as="h4" size="sm" className="mt-6 mb-2 first:mt-0">{children}</Heading>,
  p: ({ children }) => <p className="mt-4 leading-relaxed text-gray-700 first:mt-0">{children}</p>,
  a: ({ href, children }) => (
    <a
      href={href}
      className="text-brand underline underline-offset-2 hover:opacity-80"
      {...(external(href) ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
    >
      {children}
    </a>
  ),
  ul: ({ children }) => <ul className="mt-4 list-disc space-y-1 pl-6 text-gray-700">{children}</ul>,
  ol: ({ children }) => <ol className="mt-4 list-decimal space-y-1 pl-6 text-gray-700">{children}</ol>,
  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
  // 1px neutral, no un side-stripe de color (impeccable ban).
  blockquote: ({ children }) => (
    <blockquote className="mt-4 border-l border-gray-200 pl-5 italic text-gray-600">{children}</blockquote>
  ),
  strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
  em: ({ children }) => <em className="italic">{children}</em>,
  code: ({ children }) => (
    <code className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-[0.9em]">{children}</code>
  ),
  pre: ({ children }) => (
    <pre className="mt-4 overflow-x-auto rounded-lg bg-gray-900 p-4 text-sm text-gray-100">{children}</pre>
  ),
  hr: () => <hr className="my-8 border-gray-200" />,
  img: ({ src, alt }) => (
    <BlockImage src={typeof src === 'string' ? src : ''} alt={alt ?? ''} className="my-4 max-w-full rounded-lg" />
  ),
  table: ({ children }) => (
    <div className="mt-4 overflow-x-auto">
      <table className="w-full border-collapse text-left text-sm">{children}</table>
    </div>
  ),
  th: ({ children }) => <th className="border-b border-gray-300 px-3 py-2 font-semibold">{children}</th>,
  td: ({ children }) => <td className="border-b border-gray-200 px-3 py-2 text-gray-700">{children}</td>,
}

export function RichText({ content }: RichTextProps) {
  return (
    <Section background="white">
      <Container narrow>
        <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
          {content}
        </ReactMarkdown>
      </Container>
    </Section>
  )
}
