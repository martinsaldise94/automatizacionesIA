import { Section, Container, SectionHeader } from '@/components/ui'
import { parseVideoUrl, looksLikeUploadedVideo } from '@/lib/builder/video'
import type { VideoProps } from '@/lib/builder/config'

function Frame({ children, caption }: { children: React.ReactNode; caption?: string }) {
  return (
    <figure className="mx-auto max-w-3xl">
      <div className="aspect-video w-full overflow-hidden rounded-xl bg-gray-900">
        {children}
      </div>
      {caption && (
        <figcaption className="mt-3 text-center text-sm text-gray-500">{caption}</figcaption>
      )}
    </figure>
  )
}

// Placeholder cuando la URL es inválida o el host no está permitido.
// Nunca pintamos un iframe de origen desconocido.
function Placeholder() {
  return (
    <figure className="mx-auto max-w-3xl">
      <div className="flex aspect-video w-full items-center justify-center rounded-xl border-2 border-dashed border-gray-200 text-sm text-gray-400">
        Añade una URL de YouTube o Vimeo
      </div>
    </figure>
  )
}

export function Video({ title, source, url, caption }: VideoProps) {
  let media: React.ReactNode = null

  if (source === 'upload') {
    if (looksLikeUploadedVideo(url)) {
      media = (
        <video controls preload="metadata" className="h-full w-full">
          <source src={url} />
        </video>
      )
    }
  } else {
    const parsed = parseVideoUrl(url)
    if (parsed) {
      media = (
        <iframe
          src={parsed.embedUrl}
          title={title || 'Vídeo'}
          loading="lazy"
          allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="h-full w-full border-0"
        />
      )
    }
  }

  return (
    <Section background="white">
      <Container>
        <SectionHeader title={title} />
        {media ? <Frame caption={caption}>{media}</Frame> : <Placeholder />}
      </Container>
    </Section>
  )
}
