import type { Config } from '@measured/puck'
import { Hero }      from '@/components/blocks/Hero'
import { Services }  from '@/components/blocks/Services'
import { Pricing }   from '@/components/blocks/Pricing'
import { FAQ }       from '@/components/blocks/FAQ'
import { CTA }       from '@/components/blocks/CTA'
import { Gallery }   from '@/components/blocks/Gallery'
import { TextImage } from '@/components/blocks/TextImage'
import { Stats }     from '@/components/blocks/Stats'
import { Team }      from '@/components/blocks/Team'
import { Steps }     from '@/components/blocks/Steps'
import { LogoGrid }  from '@/components/blocks/LogoGrid'
import { Video }     from '@/components/blocks/Video'
import { RichText }  from '@/components/blocks/RichText'
import { Contact }   from '@/components/blocks/Contact'
import { Map }       from '@/components/blocks/Map'
import { Testimonials } from '@/components/blocks/Testimonials'
import { Spacer }    from '@/components/blocks/Spacer'
import { LeadForm }  from '@/components/blocks/LeadForm'

// ─── Props por bloque ─────────────────────────────────────────────────────────

export type HeroProps = {
  title: string
  subtitle: string
  variant: 'centered' | 'image-left' | 'image-right'
  image: string
  ctaText: string
  ctaHref: string
  ctaType: 'link' | 'whatsapp' | 'booking'
  background: 'white' | 'primary' | 'gray'
}

export type ServicesProps = {
  title: string
  subtitle: string
  variant: 'cards' | 'list' | 'grid'
  items: { name: string; description: string; icon: string }[]
}

export type PricingProps = {
  title: string
  subtitle: string
  items: {
    name: string
    price: string
    period: string
    featuresText: string
    highlighted: boolean
    ctaText: string
  }[]
}

export type FaqProps = {
  title: string
  subtitle: string
  items: { question: string; answer: string }[]
}

export type TestimonialsProps = {
  title: string
  source: 'manual' | 'google'
  items: { text: string; author: string; role: string; avatar: string }[]
}

export type CtaProps = {
  title: string
  subtitle: string
  ctaText: string
  ctaType: 'whatsapp' | 'booking' | 'link'
  ctaHref: string
  background: 'white' | 'primary' | 'dark'
}

export type ContactProps = {
  title: string
  subtitle: string
  variant: 'horizontal' | 'vertical' | 'centered'
}

export type GalleryProps = {
  title: string
  variant: 'grid' | 'masonry' | 'carousel'
  items: { image: string; caption: string; alt: string }[]
}

export type TextImageProps = {
  title: string
  text: string
  image: string
  imageAlt: string
  variant: 'image-left' | 'image-right'
  proportion: '50/50' | '60/40' | '40/60'
}

export type StatsProps = {
  title: string
  variant: 'grid' | 'row' | 'stacked'
  items: { number: string; label: string; suffix: string }[]
}

export type MapProps = {
  title: string
  useConfigAddress: boolean
  address: string
  zoom: number
}

export type TeamProps = {
  title: string
  subtitle: string
  variant: 'grid' | 'cards' | 'list'
  items: { photo: string; name: string; role: string; bio: string }[]
}

export type StepsProps = {
  title: string
  subtitle: string
  variant: 'horizontal' | 'vertical'
  items: { title: string; description: string }[]
}

export type VideoProps = {
  title: string
  source: 'url' | 'upload'
  url: string
  caption: string
}

export type LogoGridProps = {
  title: string
  items: { logo: string; name: string; href: string }[]
}

export type RichTextProps = {
  content: string
}

export type LeadFormProps = {
  title: string
  subtitle: string
  buttonText: string
  background: 'white' | 'gray'
}

export type SpacerProps = {
  height: 'sm' | 'md' | 'lg' | 'xl'
}

// Mapa de nombre de bloque → props. Usado para Zod (Paso 7) y tipado del JSON guardado.
export type BuilderComponents = {
  Hero: HeroProps
  Services: ServicesProps
  Pricing: PricingProps
  FAQ: FaqProps
  Testimonials: TestimonialsProps
  CTA: CtaProps
  Contact: ContactProps
  Gallery: GalleryProps
  TextImage: TextImageProps
  Stats: StatsProps
  Map: MapProps
  Team: TeamProps
  Steps: StepsProps
  Video: VideoProps
  LogoGrid: LogoGridProps
  RichText: RichTextProps
  LeadForm: LeadFormProps
  Spacer: SpacerProps
}

// ─── Config de Puck ───────────────────────────────────────────────────────────

export const builderConfig: Config<BuilderComponents> = {
  categories: {
    cabecera: {
      title: 'Cabecera',
      components: ['Hero'],
      defaultExpanded: true,
    },
    contenido: {
      title: 'Contenido',
      components: ['Services', 'Pricing', 'FAQ', 'Testimonials', 'Stats', 'Steps', 'TextImage', 'RichText'],
    },
    equipo: {
      title: 'Equipo y galería',
      components: ['Team', 'Gallery', 'Video', 'LogoGrid'],
    },
    contacto: {
      title: 'Contacto y CTA',
      components: ['CTA', 'LeadForm', 'Contact', 'Map'],
    },
    utilidades: {
      title: 'Utilidades',
      components: ['Spacer'],
    },
  },

  components: {
    // ── Hero ────────────────────────────────────────────────────────────────
    Hero: {
      label: 'Hero',
      defaultProps: {
        title: 'Tu negocio, tu estilo',
        subtitle: 'Atendemos a nuestros clientes con la mejor calidad y servicio.',
        variant: 'centered',
        image: '',
        ctaText: 'Contáctanos',
        ctaHref: '',
        ctaType: 'whatsapp',
        background: 'white',
      } satisfies HeroProps,
      fields: {
        title:    { type: 'text',     label: 'Título' },
        subtitle: { type: 'textarea', label: 'Subtítulo' },
        variant: {
          type: 'select', label: 'Variante',
          options: [
            { label: 'Centrado',          value: 'centered' },
            { label: 'Imagen izquierda',  value: 'image-left' },
            { label: 'Imagen derecha',    value: 'image-right' },
          ],
        },
        image:   { type: 'text', label: 'URL de imagen' },
        ctaText: { type: 'text', label: 'Texto del botón' },
        ctaHref: { type: 'text', label: 'Enlace del botón' },
        ctaType: {
          type: 'select', label: 'Tipo de botón',
          options: [
            { label: 'WhatsApp', value: 'whatsapp' },
            { label: 'Reserva',  value: 'booking' },
            { label: 'Enlace',   value: 'link' },
          ],
        },
        background: {
          type: 'select', label: 'Fondo',
          options: [
            { label: 'Blanco',   value: 'white' },
            { label: 'Primario', value: 'primary' },
            { label: 'Gris',     value: 'gray' },
          ],
        },
      },
      render: (props) => <Hero {...props} />,
    },

    // ── Services ─────────────────────────────────────────────────────────────
    Services: {
      label: 'Servicios',
      defaultProps: {
        title: 'Nuestros servicios',
        subtitle: 'Todo lo que necesitas en un solo lugar.',
        variant: 'cards',
        items: [
          { name: 'Servicio 1', description: 'Descripción del servicio.', icon: '' },
          { name: 'Servicio 2', description: 'Descripción del servicio.', icon: '' },
          { name: 'Servicio 3', description: 'Descripción del servicio.', icon: '' },
        ],
      } satisfies ServicesProps,
      fields: {
        title:    { type: 'text', label: 'Título' },
        subtitle: { type: 'text', label: 'Subtítulo' },
        variant: {
          type: 'select', label: 'Variante',
          options: [
            { label: 'Tarjetas', value: 'cards' },
            { label: 'Lista',    value: 'list' },
            { label: 'Rejilla',  value: 'grid' },
          ],
        },
        items: {
          type: 'array', label: 'Servicios',
          getItemSummary: (item) => item.name || 'Servicio',
          defaultItemProps: { name: '', description: '', icon: '' },
          arrayFields: {
            name:        { type: 'text',     label: 'Nombre' },
            description: { type: 'textarea', label: 'Descripción' },
            icon:        { type: 'text',     label: 'Icono (nombre Lucide o URL)' },
          },
        },
      },
      render: (props) => <Services {...props} />,
    },

    // ── Pricing ──────────────────────────────────────────────────────────────
    Pricing: {
      label: 'Precios',
      defaultProps: {
        title: 'Nuestras tarifas',
        subtitle: '',
        items: [
          { name: 'Básico', price: '29', period: 'mes', featuresText: 'Característica 1\nCaracterística 2', highlighted: false, ctaText: 'Empezar' },
          { name: 'Pro',    price: '59', period: 'mes', featuresText: 'Todo lo del Básico\nSoporte prioritario', highlighted: true,  ctaText: 'Empezar' },
        ],
      } satisfies PricingProps,
      fields: {
        title:    { type: 'text', label: 'Título' },
        subtitle: { type: 'text', label: 'Subtítulo' },
        items: {
          type: 'array', label: 'Planes',
          getItemSummary: (item) => item.name || 'Plan',
          defaultItemProps: { name: '', price: '0', period: 'mes', featuresText: '', highlighted: false, ctaText: 'Empezar' },
          arrayFields: {
            name:         { type: 'text',     label: 'Nombre del plan' },
            price:        { type: 'text',     label: 'Precio' },
            period:       { type: 'text',     label: 'Periodo (mes, año...)' },
            featuresText: { type: 'textarea', label: 'Características (una por línea)' },
            highlighted: {
              type: 'radio', label: 'Destacado',
              options: [
                { label: 'Sí', value: true },
                { label: 'No', value: false },
              ],
            },
            ctaText: { type: 'text', label: 'Texto del botón' },
          },
        },
      },
      render: (props) => <Pricing {...props} />,
    },

    // ── FAQ ──────────────────────────────────────────────────────────────────
    FAQ: {
      label: 'Preguntas frecuentes',
      defaultProps: {
        title: 'Preguntas frecuentes',
        subtitle: '',
        items: [
          { question: '¿Cuál es vuestro horario?',  answer: 'Estamos disponibles de lunes a viernes de 9:00 a 18:00.' },
          { question: '¿Cómo puedo contactar?',     answer: 'Puedes escribirnos por WhatsApp o rellenar el formulario.' },
        ],
      } satisfies FaqProps,
      fields: {
        title:    { type: 'text', label: 'Título' },
        subtitle: { type: 'text', label: 'Subtítulo' },
        items: {
          type: 'array', label: 'Preguntas',
          getItemSummary: (item) => item.question || 'Pregunta',
          defaultItemProps: { question: '', answer: '' },
          arrayFields: {
            question: { type: 'text',     label: 'Pregunta' },
            answer:   { type: 'textarea', label: 'Respuesta' },
          },
        },
      },
      render: (props) => <FAQ {...props} />,
    },

    // ── Testimonials ─────────────────────────────────────────────────────────
    Testimonials: {
      label: 'Testimonios',
      defaultProps: {
        title: 'Lo que dicen nuestros clientes',
        source: 'manual',
        items: [
          { text: 'Excelente servicio, muy recomendable.', author: 'María García',   role: 'Cliente', avatar: '' },
          { text: 'Profesionales y amables. Repetiré.',   author: 'Juan Martínez', role: 'Cliente', avatar: '' },
        ],
      } satisfies TestimonialsProps,
      fields: {
        title: { type: 'text', label: 'Título' },
        source: {
          type: 'radio', label: 'Fuente de reseñas',
          options: [
            { label: 'Manual (añadir a mano)', value: 'manual' },
            { label: 'Google Reviews',          value: 'google' },
          ],
        },
        items: {
          type: 'array', label: 'Testimonios (solo si fuente es Manual)',
          getItemSummary: (item) => item.author || 'Testimonio',
          defaultItemProps: { text: '', author: '', role: '', avatar: '' },
          arrayFields: {
            text:   { type: 'textarea', label: 'Texto' },
            author: { type: 'text',     label: 'Nombre' },
            role:   { type: 'text',     label: 'Cargo / descripción' },
            avatar: { type: 'text',     label: 'URL avatar (opcional)' },
          },
        },
      },
      render: (props) => <Testimonials {...props} />,
    },

    // ── CTA ──────────────────────────────────────────────────────────────────
    CTA: {
      label: 'Llamada a la acción',
      defaultProps: {
        title: '¿Listo para empezar?',
        subtitle: 'Contáctanos y te atendemos hoy mismo.',
        ctaText: 'Hablar por WhatsApp',
        ctaType: 'whatsapp',
        ctaHref: '',
        background: 'primary',
      } satisfies CtaProps,
      fields: {
        title:    { type: 'text', label: 'Título' },
        subtitle: { type: 'text', label: 'Subtítulo' },
        ctaText:  { type: 'text', label: 'Texto del botón' },
        ctaType: {
          type: 'select', label: 'Tipo de botón',
          options: [
            { label: 'WhatsApp', value: 'whatsapp' },
            { label: 'Reserva',  value: 'booking' },
            { label: 'Enlace',   value: 'link' },
          ],
        },
        ctaHref: { type: 'text', label: 'Enlace (si tipo es Enlace)' },
        background: {
          type: 'select', label: 'Fondo',
          options: [
            { label: 'Blanco',   value: 'white' },
            { label: 'Primario', value: 'primary' },
            { label: 'Oscuro',   value: 'dark' },
          ],
        },
      },
      render: (props) => <CTA {...props} />,
    },

    // ── Contact ──────────────────────────────────────────────────────────────
    Contact: {
      label: 'Contacto',
      defaultProps: {
        title: 'Contacta con nosotros',
        subtitle: 'Estamos aquí para ayudarte.',
        variant: 'horizontal',
      } satisfies ContactProps,
      fields: {
        title:    { type: 'text', label: 'Título' },
        subtitle: { type: 'text', label: 'Subtítulo' },
        variant: {
          type: 'select', label: 'Variante',
          options: [
            { label: 'Horizontal', value: 'horizontal' },
            { label: 'Vertical',   value: 'vertical' },
            { label: 'Centrado',   value: 'centered' },
          ],
        },
      },
      render: (props) => <Contact {...props} />,
    },

    // ── Gallery ──────────────────────────────────────────────────────────────
    Gallery: {
      label: 'Galería',
      defaultProps: {
        title: 'Galería',
        variant: 'grid',
        items: [
          { image: '', caption: '', alt: 'Imagen 1' },
          { image: '', caption: '', alt: 'Imagen 2' },
          { image: '', caption: '', alt: 'Imagen 3' },
        ],
      } satisfies GalleryProps,
      fields: {
        title: { type: 'text', label: 'Título (opcional)' },
        variant: {
          type: 'select', label: 'Variante',
          options: [
            { label: 'Rejilla',  value: 'grid' },
            { label: 'Masonry',  value: 'masonry' },
            { label: 'Carrusel', value: 'carousel' },
          ],
        },
        items: {
          type: 'array', label: 'Imágenes',
          getItemSummary: (item) => item.alt || 'Imagen',
          defaultItemProps: { image: '', caption: '', alt: '' },
          arrayFields: {
            image:   { type: 'text', label: 'URL de imagen' },
            caption: { type: 'text', label: 'Pie de foto (opcional)' },
            alt:     { type: 'text', label: 'Texto alternativo (SEO)' },
          },
        },
      },
      render: (props) => <Gallery {...props} />,
    },

    // ── TextImage ─────────────────────────────────────────────────────────────
    TextImage: {
      label: 'Texto + imagen',
      defaultProps: {
        title: 'Sobre nosotros',
        text: 'Contamos con años de experiencia ofreciendo el mejor servicio a nuestros clientes.',
        image: '',
        imageAlt: '',
        variant: 'image-right',
        proportion: '60/40',
      } satisfies TextImageProps,
      fields: {
        title:    { type: 'text',     label: 'Título' },
        text:     { type: 'textarea', label: 'Texto' },
        image:    { type: 'text',     label: 'URL de imagen' },
        imageAlt: { type: 'text',     label: 'Texto alternativo (SEO)' },
        variant: {
          type: 'select', label: 'Posición de imagen',
          options: [
            { label: 'Imagen izquierda', value: 'image-left' },
            { label: 'Imagen derecha',   value: 'image-right' },
          ],
        },
        proportion: {
          type: 'select', label: 'Proporción',
          options: [
            { label: '50 / 50', value: '50/50' },
            { label: '60 / 40', value: '60/40' },
            { label: '40 / 60', value: '40/60' },
          ],
        },
      },
      render: (props) => <TextImage {...props} />,
    },

    // ── Stats ─────────────────────────────────────────────────────────────────
    Stats: {
      label: 'Estadísticas',
      defaultProps: {
        title: '',
        variant: 'grid',
        items: [
          { number: '500', label: 'Clientes satisfechos', suffix: '+' },
          { number: '10',  label: 'Años de experiencia',  suffix: '' },
          { number: '98',  label: 'Valoración media',     suffix: '%' },
        ],
      } satisfies StatsProps,
      fields: {
        title: { type: 'text', label: 'Título (opcional)' },
        variant: {
          type: 'select', label: 'Variante',
          options: [
            { label: 'Rejilla',    value: 'grid' },
            { label: 'Banda',      value: 'row' },
            { label: 'Destacadas', value: 'stacked' },
          ],
        },
        items: {
          type: 'array', label: 'Cifras',
          getItemSummary: (item) => item.label || 'Cifra',
          defaultItemProps: { number: '0', label: '', suffix: '' },
          arrayFields: {
            number: { type: 'text', label: 'Número' },
            label:  { type: 'text', label: 'Etiqueta' },
            suffix: { type: 'text', label: 'Sufijo (%, +, k...)' },
          },
        },
      },
      render: (props) => <Stats {...props} />,
    },

    // ── Map ───────────────────────────────────────────────────────────────────
    Map: {
      label: 'Mapa',
      defaultProps: {
        title: 'Dónde estamos',
        useConfigAddress: true,
        address: '',
        zoom: 15,
      } satisfies MapProps,
      fields: {
        title: { type: 'text', label: 'Título' },
        useConfigAddress: {
          type: 'radio', label: 'Dirección',
          options: [
            { label: 'Usar dirección del negocio',  value: true },
            { label: 'Dirección personalizada',      value: false },
          ],
        },
        address: { type: 'text',   label: 'Dirección manual (si no usa config)' },
        zoom:    { type: 'number', label: 'Zoom (10–18)', min: 10, max: 18, step: 1 },
      },
      render: (props) => <Map {...props} />,
    },

    // ── Team ──────────────────────────────────────────────────────────────────
    Team: {
      label: 'Equipo',
      defaultProps: {
        title: 'Nuestro equipo',
        subtitle: 'Profesionales a tu servicio.',
        variant: 'grid',
        items: [
          { photo: '', name: 'Nombre Apellido', role: 'Cargo', bio: 'Breve descripción profesional.' },
        ],
      } satisfies TeamProps,
      fields: {
        title:    { type: 'text', label: 'Título' },
        subtitle: { type: 'text', label: 'Subtítulo' },
        variant: {
          type: 'select', label: 'Variante',
          options: [
            { label: 'Rejilla (foto redonda)', value: 'grid' },
            { label: 'Tarjetas (retrato)',     value: 'cards' },
            { label: 'Lista',                  value: 'list' },
          ],
        },
        items: {
          type: 'array', label: 'Miembros',
          getItemSummary: (item) => item.name || 'Miembro',
          defaultItemProps: { photo: '', name: '', role: '', bio: '' },
          arrayFields: {
            photo: { type: 'text',     label: 'URL de foto' },
            name:  { type: 'text',     label: 'Nombre' },
            role:  { type: 'text',     label: 'Cargo' },
            bio:   { type: 'textarea', label: 'Bio corta' },
          },
        },
      },
      render: (props) => <Team {...props} />,
    },

    // ── Steps ─────────────────────────────────────────────────────────────────
    Steps: {
      label: 'Cómo funciona',
      defaultProps: {
        title: '¿Cómo funciona?',
        subtitle: 'En tres sencillos pasos.',
        variant: 'horizontal',
        items: [
          { title: 'Paso 1', description: 'Describe el primer paso del proceso.' },
          { title: 'Paso 2', description: 'Describe el segundo paso del proceso.' },
          { title: 'Paso 3', description: 'Describe el tercer paso del proceso.' },
        ],
      } satisfies StepsProps,
      fields: {
        title:    { type: 'text', label: 'Título' },
        subtitle: { type: 'text', label: 'Subtítulo' },
        variant: {
          type: 'select', label: 'Variante',
          options: [
            { label: 'Horizontal', value: 'horizontal' },
            { label: 'Vertical',   value: 'vertical' },
          ],
        },
        items: {
          type: 'array', label: 'Pasos',
          getItemSummary: (item) => item.title || 'Paso',
          defaultItemProps: { title: '', description: '' },
          arrayFields: {
            title:       { type: 'text',     label: 'Título del paso' },
            description: { type: 'textarea', label: 'Descripción' },
          },
        },
      },
      render: (props) => <Steps {...props} />,
    },

    // ── Video ─────────────────────────────────────────────────────────────────
    Video: {
      label: 'Vídeo',
      defaultProps: {
        title: '',
        source: 'url',
        url: '',
        caption: '',
      } satisfies VideoProps,
      fields: {
        title: { type: 'text', label: 'Título (opcional)' },
        source: {
          type: 'select', label: 'Fuente',
          options: [
            { label: 'URL (YouTube/Vimeo)', value: 'url' },
            { label: 'Archivo subido',       value: 'upload' },
          ],
        },
        url:     { type: 'text', label: 'URL del vídeo' },
        caption: { type: 'text', label: 'Pie de vídeo (opcional)' },
      },
      render: (props) => <Video {...props} />,
    },

    // ── LogoGrid ──────────────────────────────────────────────────────────────
    LogoGrid: {
      label: 'Logos / Partners',
      defaultProps: {
        title: 'Trabajan con nosotros',
        items: [
          { logo: '', name: 'Partner 1', href: '' },
          { logo: '', name: 'Partner 2', href: '' },
          { logo: '', name: 'Partner 3', href: '' },
        ],
      } satisfies LogoGridProps,
      fields: {
        title: { type: 'text', label: 'Título (opcional)' },
        items: {
          type: 'array', label: 'Logos',
          getItemSummary: (item) => item.name || 'Logo',
          defaultItemProps: { logo: '', name: '', href: '' },
          arrayFields: {
            logo: { type: 'text', label: 'URL del logo' },
            name: { type: 'text', label: 'Nombre (alt)' },
            href: { type: 'text', label: 'Enlace (opcional)' },
          },
        },
      },
      render: (props) => <LogoGrid {...props} />,
    },

    // ── RichText ──────────────────────────────────────────────────────────────
    RichText: {
      label: 'Texto libre',
      defaultProps: {
        content: 'Escribe aquí tu contenido en **markdown**.',
      } satisfies RichTextProps,
      fields: {
        content: { type: 'textarea', label: 'Contenido (markdown)' },
      },
      render: (props) => <RichText {...props} />,
    },

    // ── LeadForm ──────────────────────────────────────────────────────────────
    LeadForm: {
      label: 'Formulario de contacto',
      defaultProps: {
        title: 'Cuéntanos qué necesitas',
        subtitle: 'Rellena el formulario y te contactamos enseguida.',
        buttonText: 'Enviar',
        background: 'gray',
      } satisfies LeadFormProps,
      fields: {
        title:      { type: 'text', label: 'Título' },
        subtitle:   { type: 'text', label: 'Subtítulo' },
        buttonText: { type: 'text', label: 'Texto del botón' },
        background: {
          type: 'select', label: 'Fondo',
          options: [
            { label: 'Blanco', value: 'white' },
            { label: 'Gris',   value: 'gray' },
          ],
        },
      },
      render: (props) => <LeadForm {...props} />,
    },

    // ── Spacer ────────────────────────────────────────────────────────────────
    Spacer: {
      label: 'Espacio',
      defaultProps: {
        height: 'md',
      } satisfies SpacerProps,
      fields: {
        height: {
          type: 'select', label: 'Altura',
          options: [
            { label: 'Pequeño (32 px)',       value: 'sm' },
            { label: 'Mediano (64 px)',        value: 'md' },
            { label: 'Grande (96 px)',         value: 'lg' },
            { label: 'Extra grande (128 px)', value: 'xl' },
          ],
        },
      },
      render: (props) => <Spacer {...props} />,
    },
  },
}
