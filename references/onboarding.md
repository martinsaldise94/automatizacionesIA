# Onboarding de un cliente nuevo

Dar de alta un cliente **no es escribir código**: es insertar datos y apuntar un dominio. Si te encuentras creando componentes o páginas para un cliente concreto, algo va mal — esa necesidad debería resolverse como un bloque reutilizable o un campo de config, no como código a medida.

## Proceso

### 1. Crear el tenant
Inserta una fila en `tenants`:
- `slug` único (ej. `doixa`)
- `plan` inicial (`tier_1` por defecto; se sube luego sin rehacer nada)
- `status = 'setup'` mientras se configura
- `config` con branding y textos
- `ai_config` con prompt base, FAQs y reglas de derivación

Esto se hace desde el panel admin (`app/admin/tenants`), que es la vía oficial. La inserción directa en SQL solo para seeds/desarrollo.

### 2. Configurar el branding y la landing
En `config`:
- `branding`: logo (Supabase Storage), colores primario/secundario, tipografía.
- `blocks`: array ordenado de bloques de landing con sus props. Cada bloque mapea a un componente de `components/blocks` (hero, servicios, pricing, faq, testimonios, cta, contacto...). Reordenar o quitar bloques = editar el array.
- `contact`: teléfono, WhatsApp, dirección, horarios, redes.
- `seo`: título, descripción, keywords locales.

### 3. Configurar el agente IA
En `ai_config`: nombre del negocio, tono, lista de FAQs (q/a), servicios, `handoffRules`, `model`. Ver `ai-agent.md`.

### 4. Activar el nivel correcto
Ajusta `plan` según lo contratado. El gating por features hace el resto (ver `tiers.md`). Para tier_2+ revisa la configuración de reservas (servicios, duraciones, disponibilidad). Para tier_3 crea las credenciales del portal del cliente y conecta 360dialog si lleva WhatsApp.

### 5. Conectar automatizaciones
Las plantillas de n8n se reutilizan entre tenants parametrizando por `tenant_id`. Para un cliente nuevo: clona el flujo plantilla relevante (recordatorios, seguimientos) y fija su `tenant_id`. No se escribe lógica nueva salvo que el cliente pida algo realmente a medida.

### 6. Apuntar el dominio
- Subdominio de la plataforma: funciona vía `slug` sin más.
- Dominio propio: añade `domain` al tenant y configúralo en Vercel. El middleware resuelve el tenant por dominio o por slug.

### 7. Publicar
Cambia `status` a `active`. Verifica: landing renderiza, agente responde y deriva, formularios crean leads, (tier_2+) reservas funcionan, (tier_3) portal y WhatsApp conectados.

## Checklist rápida

- [ ] Tenant creado con slug y plan
- [ ] Branding + bloques de landing configurados
- [ ] SEO local relleno
- [ ] Agente IA con FAQs y reglas de derivación
- [ ] Reservas configuradas (tier_2+)
- [ ] Portal + WhatsApp (tier_3)
- [ ] Flujos n8n clonados y parametrizados
- [ ] Dominio apuntado
- [ ] `status = active` y smoke test pasado

## Tiempo objetivo

Con la plantilla madura, un tier_1 debería estar publicable en horas, no días. Si tarda más, normalmente es señal de que falta un bloque reutilizable o un campo de config que conviene añadir a la plataforma para el siguiente cliente.
