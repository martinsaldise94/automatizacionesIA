import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { resolveTenant } from '@/lib/tenant'
import { listPublishedPosts } from '@/lib/db/posts'
import { formatPostDate, postExcerpt } from '@/lib/blog'
import { pageTitle } from '@/lib/seo'
import { BlockImage, Container, Heading, Section } from '@/components/ui'

// Índice del blog público. Gana a la catch-all [[...path]] porque el segmento
// estático es más específico; además `blog` es un path reservado en pagePath.ts,
// así que ninguna página del builder puede vivir aquí.

export async function generateMetadata({
  params,
}: {
  params: Promise<{ tenant: string }>
}): Promise<Metadata> {
  const { tenant: tenantIdentifier } = await params
  const tenant = await resolveTenant(tenantIdentifier)
  if (!tenant) return { title: 'No encontrado' }

  const title = pageTitle(tenant, { title: 'Blog' }, false)
  const description = tenant.config?.seo?.description?.trim() || undefined
  return { title, description, openGraph: { title, description, type: 'website' } }
}

export default async function BlogIndexPage({
  params,
}: {
  params: Promise<{ tenant: string }>
}) {
  const { tenant: tenantIdentifier } = await params

  // Tenant SIEMPRE resuelto en servidor.
  const tenant = await resolveTenant(tenantIdentifier)
  if (!tenant) notFound()

  // listPublishedPosts filtra por tenant_id y status='published': nunca borradores.
  const posts = await listPublishedPosts(tenant.id)

  return (
    <Section background="white">
      <Container narrow>
        <Heading as="h1" size="xl">
          Blog
        </Heading>

        {posts.length === 0 ? (
          <p className="mt-6 text-gray-600">Todavía no hay artículos publicados.</p>
        ) : (
          <ul className="mt-12 space-y-12">
            {posts.map((post) => {
              const fecha = formatPostDate(post.publishedAt)
              return (
                <li key={post.slug} className="border-b border-gray-100 pb-12 last:border-0 last:pb-0">
                  <article>
                    <Link href={`/blog/${post.slug}`} className="group block">
                      {post.coverUrl && (
                        <BlockImage
                          src={post.coverUrl}
                          alt=""
                          className="mb-6 aspect-video w-full rounded-xl object-cover"
                        />
                      )}
                      {fecha && (
                        <time dateTime={post.publishedAt ?? undefined} className="text-sm text-gray-500">
                          {fecha}
                        </time>
                      )}
                      <Heading as="h2" size="md" className="mt-2 group-hover:text-brand">
                        {post.title}
                      </Heading>
                    </Link>
                    <p className="mt-3 leading-relaxed text-gray-700">
                      {postExcerpt({ excerpt: post.excerpt, content: post.content })}
                    </p>
                    <Link
                      href={`/blog/${post.slug}`}
                      className="mt-4 inline-block text-sm font-semibold text-brand underline underline-offset-4 hover:opacity-80"
                    >
                      Leer artículo
                    </Link>
                  </article>
                </li>
              )
            })}
          </ul>
        )}
      </Container>
    </Section>
  )
}
