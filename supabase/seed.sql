-- Seed de desarrollo — 3 tenants, uno por tier
-- Ejecutar en Supabase → SQL Editor después de las migraciones 0001 y 0002

-- ─── TIER 1: Restaurante ─────────────────────────────────────────────────────
insert into tenants (slug, domain, name, plan, status, config, ai_config) values (
  'demo-restaurante',
  null,
  'Casa Pepe',
  'tier_1',
  'active',
  '{
    "template": "restaurante",
    "branding": {
      "primaryColor": "#c0392b",
      "secondaryColor": "#f39c12",
      "fontFamily": "Georgia, serif",
      "logo": null
    },
    "blocks": [
      {
        "type": "hero",
        "variant": "centered",
        "props": {
          "title": "Cocina tradicional desde 1980",
          "subtitle": "El sabor de siempre, en el corazón del barrio",
          "cta": "Reservar mesa"
        }
      },
      {
        "type": "services",
        "variant": "grid",
        "props": {
          "title": "Nuestra carta",
          "items": [
            { "name": "Menú del día", "description": "Primer plato, segundo y postre por 12€", "price": "12€" },
            { "name": "Paella valenciana", "description": "Para 2 personas, con ingredientes de temporada", "price": "18€" },
            { "name": "Tapas y raciones", "description": "Selección de la casa para compartir", "price": "desde 4€" }
          ]
        }
      },
      {
        "type": "faq",
        "variant": "accordion",
        "props": {
          "title": "Preguntas frecuentes",
          "items": [
            { "q": "¿Hacéis reservas?", "a": "Sí, puedes reservar por WhatsApp o llamándonos." },
            { "q": "¿Tenéis menú para celíacos?", "a": "Sí, consulta con nosotros al reservar." },
            { "q": "¿Cuál es el horario?", "a": "Lunes a sábado de 13:00 a 16:00 y de 20:00 a 23:00. Domingos solo mediodía." }
          ]
        }
      },
      {
        "type": "contact",
        "variant": "simple",
        "props": {}
      }
    ],
    "contact": {
      "phone": "960 000 001",
      "whatsapp": "34600000001",
      "email": "info@casapepe.es",
      "address": "Calle Mayor 12, Valencia",
      "hours": "L-S 13:00-16:00 y 20:00-23:00"
    },
    "seo": {
      "title": "Casa Pepe — Restaurante tradicional en Valencia",
      "description": "Cocina tradicional valenciana desde 1980. Menú del día, paellas y tapas en el corazón del barrio.",
      "keywords": ["restaurante Valencia", "cocina tradicional", "menú del día Valencia", "paella valenciana"]
    }
  }',
  '{
    "businessName": "Casa Pepe",
    "tone": "cercano y familiar",
    "services": ["Menú del día", "Paella valenciana", "Tapas y raciones", "Celebraciones privadas"],
    "faqs": [
      { "q": "¿Hacéis reservas?", "a": "Sí, por WhatsApp al 600000001 o llamando al 960000001." },
      { "q": "¿Tenéis menú para celíacos?", "a": "Sí, avisad al reservar y lo preparamos." },
      { "q": "¿Cuál es el horario?", "a": "Lunes a sábado de 13:00 a 16:00 y de 20:00 a 23:00. Domingos solo mediodía." },
      { "q": "¿Cuánto cuesta el menú del día?", "a": "12€ con primer plato, segundo y postre incluido." }
    ],
    "handoffRules": [
      "Si preguntan por reservas para más de 10 personas, deriva.",
      "Si preguntan por celebraciones o eventos privados, deriva.",
      "Si preguntan por alergias no listadas, deriva.",
      "Si el tono es de queja o reclamación, deriva."
    ],
    "model": "claude-haiku-4-5-20251001"
  }'
);

-- ─── TIER 2: Clínica estética ─────────────────────────────────────────────────
insert into tenants (slug, domain, name, plan, status, config, ai_config) values (
  'demo-clinica',
  null,
  'Clínica Estética Lumina',
  'tier_2',
  'active',
  '{
    "template": "clinica",
    "branding": {
      "primaryColor": "#8e44ad",
      "secondaryColor": "#d7bde2",
      "fontFamily": "Helvetica Neue, sans-serif",
      "logo": null
    },
    "blocks": [
      {
        "type": "hero",
        "variant": "split",
        "props": {
          "title": "Tu belleza, nuestra especialidad",
          "subtitle": "Tratamientos estéticos avanzados con tecnología de última generación",
          "cta": "Pedir cita"
        }
      },
      {
        "type": "services",
        "variant": "cards",
        "props": {
          "title": "Nuestros tratamientos",
          "items": [
            { "name": "Hidratación facial", "description": "Tratamiento profundo con ácido hialurónico", "price": "desde 60€" },
            { "name": "Depilación láser", "description": "Tecnología diodo para todos los fototipos", "price": "desde 40€" },
            { "name": "Mesoterapia corporal", "description": "Reafirmante y anticelulítica", "price": "desde 80€" },
            { "name": "Peeling químico", "description": "Renovación celular y luminosidad", "price": "desde 50€" }
          ]
        }
      },
      {
        "type": "faq",
        "variant": "accordion",
        "props": {
          "title": "Preguntas frecuentes",
          "items": [
            { "q": "¿Cómo pido cita?", "a": "Puedes reservar online desde esta página o llamarnos." },
            { "q": "¿Cuántas sesiones necesito?", "a": "Depende del tratamiento. En la primera visita hacemos valoración gratuita." },
            { "q": "¿Los tratamientos duelen?", "a": "La mayoría son indoloros. Te informamos antes de cada sesión." }
          ]
        }
      },
      {
        "type": "cta",
        "variant": "banner",
        "props": {
          "title": "Primera consulta gratuita",
          "subtitle": "Sin compromiso. Te asesoramos y diseñamos tu plan personalizado.",
          "cta": "Reservar ahora"
        }
      },
      {
        "type": "contact",
        "variant": "map",
        "props": {}
      }
    ],
    "contact": {
      "phone": "960 000 002",
      "whatsapp": "34600000002",
      "email": "info@lumina.es",
      "address": "Calle Gran Vía 45, Madrid",
      "hours": "L-V 9:00-20:00, S 9:00-14:00"
    },
    "seo": {
      "title": "Clínica Lumina — Estética avanzada en Madrid",
      "description": "Tratamientos de estética facial y corporal en Madrid. Depilación láser, mesoterapia, hidratación. Primera consulta gratuita.",
      "keywords": ["clínica estética Madrid", "depilación láser Madrid", "tratamientos faciales", "mesoterapia Madrid"]
    }
  }',
  '{
    "businessName": "Clínica Estética Lumina",
    "tone": "profesional y empático",
    "services": ["Hidratación facial", "Depilación láser", "Mesoterapia corporal", "Peeling químico", "Valoración gratuita"],
    "faqs": [
      { "q": "¿Cómo pido cita?", "a": "Puedes reservar online desde nuestra web o llamarnos al 960000002." },
      { "q": "¿La primera consulta es gratuita?", "a": "Sí, la valoración inicial no tiene coste." },
      { "q": "¿Cuántas sesiones necesito?", "a": "Varía por tratamiento. Lo determinamos en la primera visita." },
      { "q": "¿Hacéis depilación láser para hombres?", "a": "Sí, tratamos todos los fototipos y zonas corporales." }
    ],
    "handoffRules": [
      "Si preguntan precios exactos de tratamientos no listados, deriva.",
      "Si tienen alguna condición médica o toman medicación, deriva.",
      "Si quieren cancelar o reclamar, deriva a humano.",
      "Si preguntan por tratamientos médicos (bótox, rellenos), deriva."
    ],
    "model": "claude-haiku-4-5-20251001"
  }'
);

-- ─── TIER 3: Consultoría ──────────────────────────────────────────────────────
insert into tenants (slug, domain, name, plan, status, config, ai_config) values (
  'demo-consultoria',
  null,
  'Asesoria Vértex',
  'tier_3',
  'active',
  '{
    "template": "consultoria",
    "branding": {
      "primaryColor": "#1a252f",
      "secondaryColor": "#2980b9",
      "fontFamily": "Inter, sans-serif",
      "logo": null
    },
    "blocks": [
      {
        "type": "hero",
        "variant": "minimal",
        "props": {
          "title": "Asesoría fiscal y laboral para empresas",
          "subtitle": "Más de 15 años ayudando a pymes y autónomos a crecer con seguridad.",
          "cta": "Hablar con un asesor"
        }
      },
      {
        "type": "services",
        "variant": "list",
        "props": {
          "title": "Servicios",
          "items": [
            { "name": "Asesoría fiscal", "description": "IRPF, IVA, Sociedades. Declaraciones trimestrales y anuales." },
            { "name": "Asesoría laboral", "description": "Nóminas, contratos, altas y bajas en Seguridad Social." },
            { "name": "Constitución de empresas", "description": "SL, SA, autónomo. Te acompañamos desde el inicio." },
            { "name": "Contabilidad", "description": "Llevanza contable completa y reporting mensual." }
          ]
        }
      },
      {
        "type": "testimonials",
        "variant": "grid",
        "props": {
          "title": "Lo que dicen nuestros clientes",
          "items": [
            { "name": "Laura G.", "text": "Llevan mi asesoría desde hace 8 años. Siempre disponibles y muy profesionales.", "role": "Autónoma" },
            { "name": "Carlos M.", "text": "Nos ahorraron miles de euros en la declaración de sociedades. Muy recomendables.", "role": "CEO Pyme" }
          ]
        }
      },
      {
        "type": "cta",
        "variant": "banner",
        "props": {
          "title": "Primera consulta sin coste",
          "subtitle": "Analizamos tu situación y te decimos exactamente cómo podemos ayudarte.",
          "cta": "Solicitar consulta"
        }
      },
      {
        "type": "contact",
        "variant": "form",
        "props": {}
      }
    ],
    "contact": {
      "phone": "960 000 003",
      "whatsapp": "34600000003",
      "email": "info@vertex-asesoria.es",
      "address": "Paseo de la Castellana 100, Madrid",
      "hours": "L-V 9:00-18:00"
    },
    "seo": {
      "title": "Asesoría Vértex — Fiscal y laboral para pymes en Madrid",
      "description": "Asesoría fiscal, laboral y contable para autónomos y pymes en Madrid. Más de 15 años de experiencia. Primera consulta gratuita.",
      "keywords": ["asesoría fiscal Madrid", "asesoría laboral pymes", "gestoría Madrid", "contabilidad empresas"]
    }
  }',
  '{
    "businessName": "Asesoría Vértex",
    "tone": "profesional y claro, sin tecnicismos innecesarios",
    "services": ["Asesoría fiscal", "Asesoría laboral", "Constitución de empresas", "Contabilidad"],
    "faqs": [
      { "q": "¿Cuánto cobráis por llevar la contabilidad?", "a": "Depende del volumen de operaciones. Contáctanos para un presupuesto personalizado." },
      { "q": "¿Podéis ayudarme a constituir una SL?", "a": "Sí, gestionamos todo el proceso de principio a fin." },
      { "q": "¿Hacéis la declaración de la renta?", "a": "Sí, tanto para autónomos como para particulares." },
      { "q": "¿Trabajáis con empresas de toda España?", "a": "Sí, trabajamos en remoto con clientes de toda España." }
    ],
    "handoffRules": [
      "Si preguntan precios concretos, deriva para presupuesto personalizado.",
      "Si tienen una situación fiscal compleja o urgente, deriva.",
      "Si preguntan por inspecciones o problemas con Hacienda, deriva.",
      "Si quieren ser clientes, recoge nombre, email y teléfono y deriva."
    ],
    "model": "claude-haiku-4-5-20251001"
  }'
);

-- ─── PAGE publicada de ejemplo (Paso 4: render público) ───────────────────────
-- Home de demo-clinica en formato Puck real (bloques registrados). Como el
-- editor (Paso 6) aún no existe, sembramos published_data a mano para poder
-- renderizar la web pública desde la DB. Idempotente: re-ejecutable.
-- Contact y Map leen el contacto del tenant vía Context (no van en el JSON).
insert into pages (tenant_id, path, title, published_data)
values (
  (select id from tenants where slug = 'demo-clinica'),
  '/',
  'Inicio',
  $json$
  {
    "root": { "props": {} },
    "content": [
      {
        "type": "Hero",
        "props": {
          "id": "hero-1",
          "title": "Tu belleza, nuestra especialidad",
          "subtitle": "Tratamientos estéticos avanzados con tecnología de última generación y un trato cercano.",
          "variant": "image-right",
          "image": "https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&w=1200&q=70",
          "ctaText": "Pedir cita",
          "ctaHref": "/reservar",
          "ctaType": "booking",
          "background": "white"
        }
      },
      {
        "type": "Services",
        "props": {
          "id": "svc-1",
          "title": "Nuestros tratamientos",
          "subtitle": "Todo lo que tu piel necesita, en un solo lugar.",
          "variant": "cards",
          "items": [
            { "name": "Hidratación facial", "description": "Tratamiento profundo con ácido hialurónico.", "icon": "💧" },
            { "name": "Depilación láser", "description": "Tecnología diodo para todos los fototipos.", "icon": "✨" },
            { "name": "Mesoterapia corporal", "description": "Reafirmante y anticelulítica.", "icon": "🌿" }
          ]
        }
      },
      {
        "type": "Steps",
        "props": {
          "id": "steps-1",
          "title": "Cómo trabajamos",
          "subtitle": "En tres pasos sencillos.",
          "variant": "horizontal",
          "items": [
            { "title": "Valoración gratuita", "description": "Estudiamos tu caso sin compromiso." },
            { "title": "Plan personalizado", "description": "Diseñamos el tratamiento a tu medida." },
            { "title": "Resultados", "description": "Seguimiento continuo hasta tu objetivo." }
          ]
        }
      },
      {
        "type": "Testimonials",
        "props": {
          "id": "test-1",
          "title": "Lo que dicen nuestras pacientes",
          "source": "manual",
          "items": [
            { "text": "Trato excelente y resultados desde la primera sesión.", "author": "María García", "role": "Paciente", "avatar": "" },
            { "text": "Profesionales muy cercanos. Me explicaron todo con paciencia.", "author": "Lucía Fernández", "role": "Paciente", "avatar": "" }
          ]
        }
      },
      {
        "type": "FAQ",
        "props": {
          "id": "faq-1",
          "title": "Preguntas frecuentes",
          "subtitle": "",
          "items": [
            { "question": "¿La primera consulta es gratuita?", "answer": "Sí, la valoración inicial no tiene coste ni compromiso." },
            { "question": "¿Cuántas sesiones necesito?", "answer": "Depende del tratamiento; lo definimos en la primera visita." }
          ]
        }
      },
      {
        "type": "CTA",
        "props": {
          "id": "cta-1",
          "title": "Primera consulta sin coste",
          "subtitle": "Reserva ahora y diseñamos tu plan personalizado.",
          "ctaText": "Reservar cita",
          "ctaType": "booking",
          "ctaHref": "/reservar",
          "background": "primary"
        }
      },
      {
        "type": "Contact",
        "props": {
          "id": "contact-1",
          "title": "Contacta con nosotros",
          "subtitle": "Estamos aquí para ayudarte.",
          "variant": "horizontal"
        }
      },
      {
        "type": "Map",
        "props": {
          "id": "map-1",
          "title": "Dónde estamos",
          "useConfigAddress": true,
          "address": "",
          "zoom": 15
        }
      }
    ]
  }
  $json$::jsonb
)
on conflict (tenant_id, path)
do update set title = excluded.title, published_data = excluded.published_data;
