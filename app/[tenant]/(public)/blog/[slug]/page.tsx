import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { resolveTenant } from '@/lib/tenant'
import { getPublishedPost } from '@/lib/db/posts'
import { formatPostDate, postMetadata } from '@/lib/blog'
import { BlockImage, Container, Heading, Markdown, Section } from '@/components/ui'

// Post individual. `getPublishedPost` filtra por tenant_id + status='published':
// un borrador, o el post de OTRO tenant, dan 404 aquí.

export async function generateMetadata({
  params,
}: {
  params: Promise<{ tenant: string; slug: string }>
}): Promise<Metadata> {
  const { tenant: tenantIdentifier, slug } = await params
  const tenant = await resolveTenant(tenantIdentifier)
  if (!tenant) return { title: 'No encontrado' }

  const post = await getPublishedPost(tenant.id, slug)
  if (!post) return { title: 'No encontrado' }

  return postMetadata(tenant, post)
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ tenant: string; slug: string }>
}) {
  const { tenant: tenantIdentifier, slug } = await params

  const tenant = await resolveTenant(tenantIdentifier)
  if (!tenant) notFound()

  const post = await getPublishedPost(tenant.id, slug)
  if (!post) notFound()

  const fecha = formatPostDate(post.publishedAt)

  return (
    <Section background="white">
      <Container narrow>
        <article>
          <header>
            {fecha && (
              <time dateTime={post.publishedAt ?? undefined} className="text-sm text-gray-500">
                {fecha}
              </time>
            )}
            <Heading as="h1" size="xl" className="mt-2">
              {post.title}
            </Heading>
            {post.excerpt?.trim() && (
              <p className="mt-4 text-lg leading-relaxed text-gray-600">{post.excerpt}</p>
            )}
          </header>

          {post.coverUrl && (
            <BlockImage
              src={post.coverUrl}
              alt=""
              className="mt-8 aspect-video w-full rounded-xl object-cover"
            />
          )}

          <div className="mt-10">
            <Markdown>{post.content}</Markdown>
          </div>
        </article>

        <Link
          href="/blog"
          className="mt-16 inline-block text-sm font-semibold text-brand underline underline-offset-4 hover:opacity-80"
        >
          ← Volver al blog
        </Link>
      </Container>
    </Section>
  )
}
