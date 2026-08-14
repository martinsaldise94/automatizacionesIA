# Niveles (tiers) y gating por features

Un tenant tiene un `plan`. Pero **el código nunca pregunta por el plan directamente**: pregunta por *features* nombradas. Así, si mañana se reempaqueta la oferta (mover reservas al tier 1, crear un tier 4...), se cambia un solo mapa y no se toca el resto del código.

## Mapa de features

El mapa vive en `lib/features.ts` (el código es la fuente de verdad; esto es el resumen):

```ts
// lib/features.ts
const TIER_FEATURES = {
  tier_1: ['web', 'agent', 'leads', 'builder', 'blog'],
  tier_2: [...tier_1, 'bookings', 'reminders', 'forms'],
  tier_3: [...tier_2, 'client_portal', 'crm', 'dashboard', 'whatsapp'],
}

hasFeature(tenant, 'crm') // → boolean
```

`builder` y `blog` están en **todos** los tiers: el cliente edita su web y su blog él mismo desde el primer nivel. Eso implica que el login del dueño existe desde tier_1 (ver `data-model.md`, usuarios del cliente).

Uso en cualquier punto:

```ts
if (hasFeature(tenant, 'crm')) { /* render del CRM */ }
```

En el App Router, para proteger una ruta entera (ej. el portal del cliente solo en tier_3), valida en el layout del segmento y redirige si la feature no está activa.

## Qué incluye cada nivel

### tier_1 — Web Inteligente (≈49€/mes)
- Web premium multi-página que el cliente monta y edita él mismo con el **builder visual** (plantilla por sector como punto de partida; ver `builder.md`).
- **Blog** actualizable por el cliente desde su portal.
- SEO local: metadata dinámica por tenant y por página, schema.org `LocalBusiness`, sitemap (páginas + posts).
- Agente IA básico: responde FAQs desde `ai_config`, deriva a WhatsApp/formulario cuando no sabe.
- Sin DB de citas activa para el cliente (la tabla existe, pero no hay UI de reservas).

### tier_2 — Web + Reservas (≈69€/mes)
- Todo lo de tier_1.
- Activa `app/[tenant]/reservar`: calendario, selección de servicio, confirmación.
- Cal.com embebido o motor propio sobre `bookings`.
- `reminders`: n8n dispara recordatorios por email/WhatsApp antes de la cita.
- Formularios cualificados que crean `leads` con `status='qualified'`.

### tier_3 — Sistema Conectado (≈89€/mes)
- Todo lo de tier_2.
- `client_portal`: área privada (`(portal)/`) con login Supabase Auth para el dueño del negocio.
- `crm`: vista de `leads` con estados, notas, timeline.
- `dashboard`: panel visual (leads, citas, conversiones).
- `followups`: flujos n8n de seguimiento automático según estado del lead.
- `whatsapp`: WhatsApp Business API vía 360dialog, conversaciones unificadas en `messages`.

## Modalidad personalizada

Para negocios grandes (varias sedes, mucho volumen, integraciones internas) no se fuerza un tier estándar: se crea un tenant con `plan` base y features extra activadas manualmente, o features ad-hoc fuera del mapa estándar. Documenta cualquier feature custom en el `config` del tenant para no perder el rastro.

## Antipatrones a evitar

- `if (tenant.plan === 'tier_3')` esparcido por componentes → usa `hasFeature`.
- Duplicar una página para "la versión tier_2" → la misma página comprueba features y muestra/oculta.
- Migraciones condicionadas al tier → el esquema es igual para todos; el gating es lógico.
