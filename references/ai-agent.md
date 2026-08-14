# Agente IA

El agente vive en `app/[tenant]/api/chat` y se construye con el **Vercel AI SDK** sobre la **Claude API**. No es un widget de terceros: es código propio para tener control total del comportamiento, el coste y el aislamiento por tenant.

## Principio rector

El agente **no finge resolver todo**. Su trabajo es responder dudas frecuentes con seguridad, captar datos del lead y **derivar a humano/WhatsApp cuando corresponde**. Un agente que inventa respuestas o no sabe escalar destruye la confianza del cliente final y la reputación de la agencia.

## El prompt se construye por tenant, en runtime

Nunca hardcodees el prompt. Se ensambla desde `tenant.ai_config`:

```ts
// lib/ai/buildPrompt.ts
export function buildSystemPrompt(tenant: Tenant): string {
  const { businessName, tone, faqs, handoffRules, services } = tenant.ai_config;
  return [
    `Eres el asistente de ${businessName}. Tono: ${tone}.`,
    `Respondes SOLO sobre este negocio. Si no sabes algo con certeza, derivas.`,
    `Servicios: ${services.join(', ')}.`,
    `Preguntas frecuentes que puedes responder:\n${faqs.map(f => `- ${f.q} → ${f.a}`).join('\n')}`,
    `Reglas de derivación a humano:\n${handoffRules.join('\n')}`,
    `Cuando debas derivar, recoge nombre y teléfono y confirma que alguien contactará pronto.`,
  ].join('\n\n');
}
```

Reconfigurar el agente de un cliente = editar su `ai_config` desde el panel admin. Cero despliegues.

## Modelo y coste

Por defecto usa un modelo económico (clase Haiku) para FAQs: el coste por conversación es de céntimos y el margen se mantiene. Reserva modelos más capaces solo si un tenant lo justifica (consultas complejas, cualificación elaborada). El modelo se guarda en `ai_config.model` por tenant, así se ajusta caso a caso.

## Derivación (handoff)

Las `handoffRules` son frases en lenguaje natural en la config, por ejemplo:
- "Si preguntan precios exactos de un tratamiento no listado, deriva."
- "Si quieren reclamar o cancelar, deriva a humano."
- "Si detectas urgencia médica, indica que llamen por teléfono y deriva."

Cuando el agente decide derivar: crea/actualiza el `lead`, registra el `message`, y dispara el webhook de n8n para avisar al negocio (email/WhatsApp). El traspaso queda trazado en `messages` con `role` cambiando a `human` cuando entra una persona.

## Persistencia

Cada turno se guarda en `messages` con su `tenant_id`, `lead_id`, `channel` y `role`. Esto alimenta el CRM (tier_3) y permite continuidad si la conversación salta de web a WhatsApp.

## Seguridad

- El `tenant_id` del agente se resuelve en el servidor desde el slug/dominio, nunca desde el cliente.
- El prompt jamás expone `ai_config` de otro tenant ni claves.
- Rate limiting por tenant para evitar abuso de la API.
