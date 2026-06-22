'use client'

import type { CSSProperties } from 'react'
import { notFound } from 'next/navigation'
import { Render } from '@measured/puck'
import type { Data } from '@measured/puck'
import { builderConfig } from '@/lib/builder/config'
import { TenantProvider } from '@/components/builder/TenantProvider'
import type { TenantContext } from '@/lib/builder/tenant-context'

// Harness de validación (Paso 3a). NO es la web pública — eso es el Paso 4.
// Renderiza el Hero en sus 3 variantes y en 2 paletas para probar que es brand-adaptive.

const photo =
  'https://images.unsplash.com/photo-1600880292203-757bb62b4baf?auto=format&fit=crop&w=1200&q=70'
const portrait =
  'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=400&q=70'
const logo =
  'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2f/Google_2015_logo.svg/640px-Google_2015_logo.svg.png'

const data: Data = {
  root: { props: {} },
  content: [
    // ── Hero (3a) ─────────────────────────────────────────────────────────────
    {
      type: 'Hero',
      props: {
        id: 'hero-centered',
        title: 'Tu negocio merece una web que transmita confianza',
        subtitle: 'Atendemos con cercanía y profesionalidad. Reserva en segundos y te confirmamos al instante.',
        variant: 'centered', image: '', ctaText: 'Reservar cita',
        ctaHref: '/reservar', ctaType: 'booking', background: 'white',
      },
    },
    {
      type: 'Hero',
      props: {
        id: 'hero-image-right',
        title: 'Cuidamos de ti como nadie en la ciudad',
        subtitle: 'Un equipo cercano, resultados que se notan. Escríbenos por WhatsApp y resolvemos tus dudas.',
        variant: 'image-right', image: photo, ctaText: 'Escribir por WhatsApp',
        ctaHref: '', ctaType: 'whatsapp', background: 'gray',
      },
    },
    {
      type: 'Hero',
      props: {
        id: 'hero-image-left',
        title: 'Reserva tu cita en menos de un minuto',
        subtitle: 'Sin llamadas, sin esperas. Elige hora y nosotros nos encargamos del resto.',
        variant: 'image-left', image: photo, ctaText: 'Ver disponibilidad',
        ctaHref: '/reservar', ctaType: 'booking', background: 'primary',
      },
    },
    // ── 3b ────────────────────────────────────────────────────────────────────
    {
      type: 'Services',
      props: {
        id: 'services-cards',
        title: 'Nuestros servicios', subtitle: 'Todo lo que necesitas en un solo lugar.',
        variant: 'cards',
        items: [
          { name: 'Consulta inicial', description: 'Valoración personalizada sin compromiso.', icon: '🩺' },
          { name: 'Tratamiento', description: 'Plan adaptado a tus necesidades concretas.', icon: '💊' },
          { name: 'Seguimiento', description: 'Acompañamiento continuo hasta tu objetivo.', icon: '📋' },
        ],
      },
    },
    {
      type: 'Services',
      props: {
        id: 'services-list',
        title: 'Servicios (variante lista)', subtitle: 'Cabecera a la izquierda, filas divididas.',
        variant: 'list',
        items: [
          { name: 'Consulta inicial', description: 'Valoración personalizada sin compromiso.', icon: '🩺' },
          { name: 'Tratamiento', description: 'Plan adaptado a tus necesidades concretas.', icon: '💊' },
          { name: 'Seguimiento', description: 'Acompañamiento continuo hasta tu objetivo.', icon: '📋' },
        ],
      },
    },
    {
      type: 'Services',
      props: {
        id: 'services-grid',
        title: 'Servicios (variante rejilla)', subtitle: 'Tiles tintados, sin borde.',
        variant: 'grid',
        items: [
          { name: 'Consulta inicial', description: 'Valoración personalizada sin compromiso.', icon: '🩺' },
          { name: 'Tratamiento', description: 'Plan adaptado a tus necesidades concretas.', icon: '💊' },
          { name: 'Seguimiento', description: 'Acompañamiento continuo hasta tu objetivo.', icon: '📋' },
        ],
      },
    },
    {
      type: 'Stats',
      props: {
        id: 'stats-grid',
        title: 'Números que hablan por sí solos',
        variant: 'grid',
        items: [
          { number: '1.200', label: 'Pacientes atendidos', suffix: '+' },
          { number: '8', label: 'Años de experiencia', suffix: '' },
          { number: '97', label: 'Satisfacción media', suffix: '%' },
          { number: '3', label: 'Especialistas en plantilla', suffix: '' },
        ],
      },
    },
    {
      type: 'Stats',
      props: {
        id: 'stats-row',
        title: 'Estadísticas (variante banda)',
        variant: 'row',
        items: [
          { number: '1.200', label: 'Pacientes atendidos', suffix: '+' },
          { number: '8', label: 'Años de experiencia', suffix: '' },
          { number: '97', label: 'Satisfacción media', suffix: '%' },
          { number: '3', label: 'Especialistas', suffix: '' },
        ],
      },
    },
    {
      type: 'Stats',
      props: {
        id: 'stats-stacked',
        title: 'Estadísticas (variante destacadas)',
        variant: 'stacked',
        items: [
          { number: '1.200', label: 'Pacientes atendidos', suffix: '+' },
          { number: '8', label: 'Años de experiencia', suffix: '' },
          { number: '97', label: 'Satisfacción media', suffix: '%' },
          { number: '3', label: 'Especialistas en plantilla', suffix: '' },
        ],
      },
    },
    {
      type: 'TextImage',
      props: {
        id: 'textimage-1',
        title: 'Más de ocho años cuidando tu salud',
        text: 'Somos un equipo de especialistas comprometidos con tu bienestar. Utilizamos las últimas técnicas y un trato cercano para que te sientas en buenas manos desde el primer momento.',
        image: photo, imageAlt: 'Equipo de la clínica',
        variant: 'image-right', proportion: '50/50',
      },
    },
    {
      type: 'Steps',
      props: {
        id: 'steps-1',
        title: '¿Cómo funciona?', subtitle: 'En tres pasos sencillos.',
        variant: 'horizontal',
        items: [
          { title: 'Reserva tu cita', description: 'Elige el día y hora que mejor te venga, sin llamadas.' },
          { title: 'Primera consulta', description: 'Te evaluamos y diseñamos un plan a tu medida.' },
          { title: 'Empieza tu mejora', description: 'Seguimiento continuo para que alcances tu objetivo.' },
        ],
      },
    },
    {
      type: 'Pricing',
      props: {
        id: 'pricing-1',
        title: 'Tarifas claras, sin sorpresas', subtitle: '',
        items: [
          { name: 'Básico', price: '49', period: 'sesión', featuresText: 'Consulta inicial\nPlan personalizado\nSoporte por email', highlighted: false, ctaText: 'Reservar' },
          { name: 'Mensual', price: '149', period: 'mes', featuresText: 'Todo lo del Básico\n4 sesiones al mes\nSeguimiento semanal\nAcceso prioritario', highlighted: true, ctaText: 'Empezar ahora' },
          { name: 'Trimestral', price: '399', period: 'trimestre', featuresText: 'Todo lo del Mensual\n12 sesiones\nDescuento del 10 %\nInforme de evolución', highlighted: false, ctaText: 'Reservar' },
        ],
      },
    },
    {
      type: 'FAQ',
      props: {
        id: 'faq-1',
        title: 'Preguntas frecuentes', subtitle: '',
        items: [
          { question: '¿Necesito derivación médica?', answer: 'No. Puedes reservar directamente desde nuestra web sin necesidad de derivación.' },
          { question: '¿Cuánto dura una sesión?', answer: 'Las sesiones tienen una duración aproximada de 50 minutos.' },
          { question: '¿Puedo cancelar mi cita?', answer: 'Sí, con al menos 24 horas de antelación sin coste alguno.' },
        ],
      },
    },
    {
      type: 'Team',
      props: {
        id: 'team-grid',
        title: 'Conoce al equipo', subtitle: 'Variante rejilla (foto redonda).',
        variant: 'grid',
        items: [
          { photo: portrait, name: 'Dra. Ana Martínez', role: 'Directora médica', bio: 'Especialista con 12 años de experiencia en medicina integrativa.' },
          { photo: '', name: 'Carlos Ruiz', role: 'Fisioterapeuta', bio: 'Experto en rehabilitación deportiva y técnicas manuales.' },
          { photo: '', name: 'Laura Gómez', role: 'Nutricionista', bio: 'Dietista-nutricionista colegiada, especializada en nutrición clínica.' },
        ],
      },
    },
    {
      type: 'Team',
      props: {
        id: 'team-cards',
        title: 'Equipo (variante tarjetas)', subtitle: 'Retrato vertical, info a la izquierda.',
        variant: 'cards',
        items: [
          { photo: portrait, name: 'Dra. Ana Martínez', role: 'Directora médica', bio: 'Especialista con 12 años de experiencia.' },
          { photo: portrait, name: 'Carlos Ruiz', role: 'Fisioterapeuta', bio: 'Experto en rehabilitación deportiva.' },
          { photo: '', name: 'Laura Gómez', role: 'Nutricionista', bio: 'Dietista-nutricionista colegiada.' },
          { photo: portrait, name: 'Marcos Vidal', role: 'Recepción', bio: 'Te atiende y gestiona tus citas.' },
        ],
      },
    },
    {
      type: 'Team',
      props: {
        id: 'team-list',
        title: 'Equipo (variante lista)', subtitle: 'Una fila por persona, cabecera a la izquierda.',
        variant: 'list',
        items: [
          { photo: portrait, name: 'Dra. Ana Martínez', role: 'Directora médica', bio: 'Especialista con 12 años de experiencia en medicina integrativa.' },
          { photo: '', name: 'Carlos Ruiz', role: 'Fisioterapeuta', bio: 'Experto en rehabilitación deportiva y técnicas manuales.' },
        ],
      },
    },
    {
      type: 'Gallery',
      props: {
        id: 'gallery-1',
        title: 'Nuestras instalaciones',
        variant: 'grid',
        items: [
          { image: photo, caption: 'Sala de consultas', alt: 'Sala de consultas' },
          { image: photo, caption: 'Área de tratamiento', alt: 'Área de tratamiento' },
          { image: photo, caption: 'Recepción', alt: 'Recepción' },
        ],
      },
    },
    {
      type: 'LogoGrid',
      props: {
        id: 'logogrid-1',
        title: 'Colaboramos con',
        items: [
          { logo, name: 'Google', href: '' },
          { logo, name: 'Partner 2', href: '' },
          { logo, name: 'Partner 3', href: '' },
          { logo, name: 'Partner 4', href: '' },
        ],
      },
    },
    {
      type: 'RichText',
      props: {
        id: 'richtext-1',
        content: [
          '## Sobre nuestra clínica',
          '',
          'Llevamos **más de 8 años** cuidando de nuestros pacientes con un trato cercano.',
          '',
          '- Primera consulta sin compromiso',
          '- Planes a medida',
          '- Seguimiento continuo',
          '',
          'Más info en [nuestra web](https://example.com). Texto ~~antiguo~~ actualizado.',
          '',
          '> La salud es lo primero.',
          '',
          'Intento de inyección: <script>alert(1)</script> (debe verse como texto).',
        ].join('\n'),
      },
    },
    {
      type: 'Video',
      props: {
        id: 'video-youtube',
        title: 'Conócenos en vídeo',
        source: 'url',
        url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        caption: 'Una visita rápida a nuestras instalaciones.',
      },
    },
    {
      type: 'Video',
      props: {
        id: 'video-invalid',
        title: 'Vídeo con URL inválida (placeholder)',
        source: 'url',
        url: 'https://evil.com/watch?v=xxx',
        caption: '',
      },
    },
    {
      type: 'Testimonials',
      props: {
        id: 'testimonials-manual',
        title: 'Lo que dicen nuestros pacientes',
        source: 'manual',
        items: [
          { text: 'Trato excelente y resultados desde la primera sesión. Repetiré sin duda.', author: 'María García', role: 'Paciente', avatar: portrait },
          { text: 'Profesionales muy cercanos. Me explicaron todo con paciencia.', author: 'Juan Martínez', role: 'Paciente', avatar: '' },
          { text: 'Reservar fue facilísimo y me confirmaron al instante.', author: 'Lucía Fernández', role: 'Paciente', avatar: '' },
        ],
      },
    },
    {
      type: 'Testimonials',
      props: {
        id: 'testimonials-google',
        title: 'Testimonios (fuente Google sin configurar → placeholder)',
        source: 'google',
        items: [],
      },
    },
    {
      type: 'Contact',
      props: {
        id: 'contact-horizontal',
        title: 'Contacta con nosotros',
        subtitle: 'Estamos aquí para ayudarte.',
        variant: 'horizontal',
      },
    },
    {
      type: 'Contact',
      props: {
        id: 'contact-vertical',
        title: 'Contacto (variante vertical)',
        subtitle: '',
        variant: 'vertical',
      },
    },
    {
      type: 'Contact',
      props: {
        id: 'contact-centered',
        title: 'Contacto (variante centrada)',
        subtitle: '',
        variant: 'centered',
      },
    },
    {
      type: 'Map',
      props: {
        id: 'map-1',
        title: 'Dónde estamos',
        useConfigAddress: true,
        address: '',
        zoom: 15,
      },
    },
    {
      type: 'CTA',
      props: {
        id: 'cta-white',
        title: '¿Listo para empezar?', subtitle: 'Contáctanos hoy y te atendemos sin esperas.',
        ctaText: 'Hablar por WhatsApp', ctaType: 'whatsapp', ctaHref: '', background: 'white',
      },
    },
    {
      type: 'CTA',
      props: {
        id: 'cta-primary',
        title: 'Primera consulta sin coste', subtitle: 'Reserva ahora y valoramos tu caso sin compromiso.',
        ctaText: 'Reservar gratis', ctaType: 'booking', ctaHref: '/reservar', background: 'primary',
      },
    },
    {
      type: 'CTA',
      props: {
        id: 'cta-dark',
        title: 'Más de 1.200 pacientes ya confían en nosotros', subtitle: 'Únete y empieza tu cambio hoy.',
        ctaText: 'Ver disponibilidad', ctaType: 'booking', ctaHref: '/reservar', background: 'dark',
      },
    },
    {
      type: 'Spacer',
      props: { id: 'spacer-1', height: 'lg' },
    },
  ],
}

const palettes: { name: string; vars: CSSProperties; tenant: TenantContext }[] = [
  {
    name: 'Tenant A — verde sobrio',
    vars: {
      '--brand-primary': '#1f5e57',
      '--brand-primary-fg': '#ffffff',
      '--brand-secondary': '#e9f1ef',
      '--brand-secondary-fg': '#0f2e2a',
    } as CSSProperties,
    tenant: {
      businessName: 'Clínica Verde',
      contact: { phone: '600111222', whatsapp: '34600111222', email: 'hola@verde.com', address: 'Calle Mayor 1, Madrid', hours: 'L-V 9:00–18:00' },
    },
  },
  {
    name: 'Tenant B — índigo',
    vars: {
      '--brand-primary': '#3a3a8c',
      '--brand-primary-fg': '#ffffff',
      '--brand-secondary': '#ecebf6',
      '--brand-secondary-fg': '#1c1c44',
    } as CSSProperties,
    tenant: {
      businessName: 'Estudio Índigo',
      contact: { phone: '699888777', whatsapp: '34699888777', email: 'info@indigo.com', address: 'Av. Diagonal 200, Barcelona', hours: 'L-S 10:00–20:00' },
    },
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
          <TenantProvider value={p.tenant}>
            <Render config={builderConfig} data={data} />
          </TenantProvider>
        </section>
      ))}
    </main>
  )
}
