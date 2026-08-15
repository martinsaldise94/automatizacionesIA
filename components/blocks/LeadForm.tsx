'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { Section, Container, SectionHeader, Button } from '@/components/ui'
import { submitLeadAction } from '@/app/[tenant]/(public)/actions'
import type { LeadFormProps } from '@/lib/builder/config'

// Formulario de captación. Escribe en `leads` (+ `messages` si hay texto) vía
// server action, con el tenant resuelto en servidor.
//
// Sin librería de formularios: cuatro campos no la justifican, y cada
// dependencia en la web pública del cliente es peso que paga su visitante.

const field =
  'mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand'

export function LeadForm({ title, subtitle, buttonText, background }: LeadFormProps) {
  // Momento en que se montó el formulario. Si el envío llega demasiado rápido,
  // no lo ha rellenado una persona. Se compara en servidor.
  // En efecto y no en render: `Date.now()` es impura y React exige que el
  // render lo sea (el mismo render podría repetirse y dar otro valor).
  const mountedAt = useRef<number | null>(null)
  useEffect(() => {
    mountedAt.current = Date.now()
  }, [])

  const [enviado, setEnviado] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    setError(null)

    startTransition(async () => {
      const res = await submitLeadAction({
        name: (fd.get('name') as string) ?? '',
        email: (fd.get('email') as string) ?? '',
        phone: (fd.get('phone') as string) ?? '',
        message: (fd.get('message') as string) ?? '',
        website: (fd.get('website') as string) ?? '', // honeypot
        // null si el efecto no llegó a correr → NaN → el servidor lo trata
        // como sospechoso, que es el lado seguro.
        elapsedMs: mountedAt.current === null ? Number.NaN : Date.now() - mountedAt.current,
      })

      if (res.ok) setEnviado(true)
      else setError(res.error)
    })
  }

  return (
    <Section background={background}>
      <Container narrow>
        <SectionHeader title={title} subtitle={subtitle} />

        {enviado ? (
          <p
            role="status"
            className="mt-8 rounded-lg border border-brand/20 bg-brand/5 px-5 py-6 text-center text-lg text-gray-800"
          >
            Gracias. Te contactamos enseguida.
          </p>
        ) : (
          <form onSubmit={onSubmit} className="mt-8 space-y-4">
            {error && (
              <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </p>
            )}

            <label className="block text-sm">
              <span className="font-medium text-gray-700">Nombre</span>
              <input name="name" required autoComplete="name" className={field} />
            </label>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm">
                <span className="font-medium text-gray-700">Email</span>
                <input name="email" type="email" autoComplete="email" className={field} />
              </label>
              <label className="block text-sm">
                <span className="font-medium text-gray-700">Teléfono</span>
                <input name="phone" type="tel" autoComplete="tel" className={field} />
              </label>
            </div>
            <p className="text-xs text-gray-500">Déjanos al menos una forma de contacto.</p>

            <label className="block text-sm">
              <span className="font-medium text-gray-700">¿En qué podemos ayudarte?</span>
              <textarea name="message" rows={4} className={field} />
            </label>

            {/* Honeypot: oculto para personas, tentador para bots. aria-hidden y
                tabIndex -1 para que un lector de pantalla tampoco lo ofrezca. */}
            <div aria-hidden className="absolute left-[-9999px] h-0 w-0 overflow-hidden">
              <label>
                No rellenar
                <input name="website" tabIndex={-1} autoComplete="off" />
              </label>
            </div>

            <Button type="submit" size="lg" disabled={pending}>
              {pending ? 'Enviando…' : buttonText}
            </Button>
          </form>
        )}
      </Container>
    </Section>
  )
}
