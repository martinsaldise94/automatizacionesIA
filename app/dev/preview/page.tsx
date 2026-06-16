import type { CSSProperties } from 'react'
import { notFound } from 'next/navigation'
import { Render } from '@measured/puck'
import type { Data } from '@measured/puck'
import { builderConfig } from '@/lib/builder/config'

// Harness de validación (Paso 3a). NO es la web pública — eso es el Paso 4.
// Renderiza el Hero en sus 3 variantes y en 2 paletas para probar que es brand-adaptive.

const photo =
  'https://images.unsplash.com/photo-1600880292203-757bb62b4baf?auto=format&fit=crop&w=1200&q=70'

const data: Data = {
  root: { props: {} },
  content: [
    {
      type: 'Hero',
      props: {
        id: 'hero-centered',
        title: 'Tu negocio merece una web que transmita confianza',
        subtitle:
          'Atendemos con cercanía y profesionalidad. Reserva en segundos y te confirmamos al instante.',
        variant: 'centered',
        image: '',
        ctaText: 'Reservar cita',
        ctaHref: '/reservar',
        ctaType: 'booking',
        background: 'white',
      },
    },
    {
      type: 'Hero',
      props: {
        id: 'hero-image-right',
        title: 'Cuidamos de ti como nadie en la ciudad',
        subtitle:
          'Un equipo cercano, resultados que se notan. Escríbenos por WhatsApp y resolvemos tus dudas hoy mismo.',
        variant: 'image-right',
        image: photo,
        ctaText: 'Escribir por WhatsApp',
        ctaHref: '',
        ctaType: 'whatsapp',
        background: 'gray',
      },
    },
    {
      type: 'Hero',
      props: {
        id: 'hero-image-left',
        title: 'Reserva tu cita en menos de un minuto',
        subtitle: 'Sin llamadas, sin esperas. Elige hora y nosotros nos encargamos del resto.',
        variant: 'image-left',
        image: photo,
        ctaText: 'Ver disponibilidad',
        ctaHref: '/reservar',
        ctaType: 'booking',
        background: 'primary',
      },
    },
  ],
}

const palettes: { name: string; vars: CSSProperties }[] = [
  {
    name: 'Tenant A — verde sobrio',
    vars: {
      '--brand-primary': '#1f5e57',
      '--brand-primary-fg': '#ffffff',
      '--brand-secondary': '#e9f1ef',
      '--brand-secondary-fg': '#0f2e2a',
    } as CSSProperties,
  },
  {
    name: 'Tenant B — índigo',
    vars: {
      '--brand-primary': '#3a3a8c',
      '--brand-primary-fg': '#ffffff',
      '--brand-secondary': '#ecebf6',
      '--brand-secondary-fg': '#1c1c44',
    } as CSSProperties,
  },
]

export default function PreviewPage() {
  if (process.env.NODE_ENV === 'production') notFound()

  return (
    <main>
      {palettes.map((p) => (
        <section key={p.name} style={p.vars}>
          <div className="bg-gray-900 px-4 py-2 text-xs font-medium tracking-wide text-white">
            {p.name}
          </div>
          <Render config={builderConfig} data={data} />
        </section>
      ))}
    </main>
  )
}
