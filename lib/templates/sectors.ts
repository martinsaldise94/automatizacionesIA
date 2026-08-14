import type { Template } from './types'
import { block, page } from './types'

// Plantillas por sector. Cada una arranca al cliente con una web completa
// (home + contacto) que luego personaliza en el builder. El branding por defecto
// (colores) va en `config`; el cliente lo cambia desde su portal (Paso 10).
//
// Los bloques Contact/Map leen los datos del tenant (config.contact), así que las
// plantillas solo fijan estructura y textos; los datos reales entran al configurar
// el tenant. block() completa las props restantes con los defaultProps del bloque.

export const clinica: Template = {
  key: 'clinica',
  label: 'Clínica / Salud',
  config: { branding: { primaryColor: '#0f766e', secondaryColor: '#134e4a' } },
  pages: [
    page('/', 'Inicio', [
      block('Hero', {
        title: 'Tu salud, en las mejores manos',
        subtitle: 'Atención cercana y profesional. Pide tu cita hoy mismo.',
        ctaText: 'Pedir cita',
        background: 'primary',
      }),
      block('Services', {
        title: 'Nuestros servicios',
        items: [
          { name: 'Consulta general', description: 'Diagnóstico y seguimiento personalizado.', icon: '' },
          { name: 'Especialidades', description: 'Un equipo experto para cada necesidad.', icon: '' },
          { name: 'Pruebas y análisis', description: 'Resultados rápidos y fiables.', icon: '' },
        ],
      }),
      block('FAQ', {
        items: [
          { question: '¿Cómo pido cita?', answer: 'Por teléfono, WhatsApp o el formulario de contacto.' },
          { question: '¿Atienden urgencias?', answer: 'Sí, consulta nuestros horarios de atención.' },
        ],
      }),
      block('CTA', { title: '¿Necesitas una cita?', subtitle: 'Escríbenos y te atendemos hoy.' }),
    ]),
    page('/contacto', 'Contacto', [
      block('Hero', { title: 'Contacto', subtitle: 'Estamos aquí para ayudarte.', variant: 'centered' }),
      block('Contact', {}),
      block('Map', {}),
    ]),
  ],
}

export const restaurante: Template = {
  key: 'restaurante',
  label: 'Restaurante / Hostelería',
  config: { branding: { primaryColor: '#b91c1c', secondaryColor: '#7f1d1d' } },
  pages: [
    page('/', 'Inicio', [
      block('Hero', {
        title: 'Sabor auténtico, cada día',
        subtitle: 'Cocina de siempre con producto fresco. Reserva tu mesa.',
        ctaText: 'Reservar mesa',
        background: 'primary',
      }),
      block('Services', {
        title: 'La carta',
        variant: 'list',
        items: [
          { name: 'Entrantes', description: 'Para compartir y empezar bien.', icon: '' },
          { name: 'Principales', description: 'Nuestros platos estrella.', icon: '' },
          { name: 'Postres', description: 'El final perfecto.', icon: '' },
        ],
      }),
      block('Gallery', { title: 'Nuestro local' }),
      block('CTA', { title: '¿Reservamos tu mesa?', subtitle: 'Llámanos o escríbenos por WhatsApp.' }),
    ]),
    page('/contacto', 'Contacto', [
      block('Hero', { title: 'Dónde estamos', subtitle: 'Te esperamos.', variant: 'centered' }),
      block('Contact', {}),
      block('Map', {}),
    ]),
  ],
}

export const consultoria: Template = {
  key: 'consultoria',
  label: 'Consultoría / Servicios profesionales',
  config: { branding: { primaryColor: '#1d4ed8', secondaryColor: '#1e3a8a' } },
  pages: [
    page('/', 'Inicio', [
      block('Hero', {
        title: 'Asesoramiento que impulsa tu negocio',
        subtitle: 'Soluciones a medida para crecer con seguridad.',
        ctaText: 'Solicitar información',
        background: 'primary',
      }),
      block('Services', {
        title: 'Áreas de trabajo',
        items: [
          { name: 'Estrategia', description: 'Definimos el rumbo contigo.', icon: '' },
          { name: 'Fiscal y contable', description: 'Cumplimiento sin sorpresas.', icon: '' },
          { name: 'Laboral', description: 'Gestión de tu equipo.', icon: '' },
        ],
      }),
      block('Stats', {}),
      block('CTA', { title: 'Hablemos de tu proyecto', subtitle: 'Primera consulta sin compromiso.' }),
    ]),
    page('/contacto', 'Contacto', [
      block('Hero', { title: 'Contacto', subtitle: 'Cuéntanos qué necesitas.', variant: 'centered' }),
      block('Contact', {}),
      block('Map', {}),
    ]),
  ],
}

export const estetica: Template = {
  key: 'estetica',
  label: 'Estética / Belleza',
  config: { branding: { primaryColor: '#be185d', secondaryColor: '#831843' } },
  pages: [
    page('/', 'Inicio', [
      block('Hero', {
        title: 'Realza tu belleza natural',
        subtitle: 'Tratamientos personalizados en un espacio para ti.',
        ctaText: 'Reservar cita',
        background: 'primary',
      }),
      block('Services', {
        title: 'Tratamientos',
        items: [
          { name: 'Facial', description: 'Cuidado y luminosidad para tu piel.', icon: '' },
          { name: 'Corporal', description: 'Bienestar de pies a cabeza.', icon: '' },
          { name: 'Estética avanzada', description: 'Tecnología con resultados.', icon: '' },
        ],
      }),
      block('Testimonials', {}),
      block('CTA', { title: '¿Te esperamos?', subtitle: 'Reserva tu cita en un minuto.' }),
    ]),
    page('/contacto', 'Contacto', [
      block('Hero', { title: 'Contacto', subtitle: 'Estamos deseando conocerte.', variant: 'centered' }),
      block('Contact', {}),
      block('Map', {}),
    ]),
  ],
}
