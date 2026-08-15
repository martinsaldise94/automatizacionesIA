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

## Seguridad del agente

### La inyección de prompt no se resuelve filtrando

Una lista de frases prohibidas ("ignora tus instrucciones") se esquiva parafraseando, en otro idioma o troceando el texto. Lo peor no es que falle: es que **da sensación de estar protegido** y se deja de acotar lo que sí importa.

La defensa real es que **el agente no pueda hacer nada peligroso aunque le convenzan**. Todo lo de abajo va en esa dirección.

### Qué puede hacer el agente (y qué no)

| Puede | No puede |
|---|---|
| Responder texto | Leer la DB — **no existe ninguna herramienta de lectura** |
| Llamar a `derivar_a_persona` (máx. 2 por conversación) | Ver otro tenant: el prompt se construye con whitelist de `ai_config` |
| — | Ejecutar código, navegar, mandar correos |

Que **no haya herramienta de lectura** es la decisión de seguridad más importante de todas: no hay nada que sonsacarle sobre otros clientes porque no tiene por dónde consultarlo. Si algún día se añade una (buscar en el blog, consultar disponibilidad), hay que reevaluar esta tabla entera — pasa a haber datos que una inyección puede intentar extraer.

### Límites, y por qué cada uno

Todos en `lib/ai/guard.ts`, con test.

| Límite | Valor | Qué evita |
|---|---|---|
| `MAX_HANDOFFS_PER_CONVERSATION` | 2 | **El daño real de una inyección con éxito**: convencer al agente de derivar en bucle llenaría el CRM de fichas falsas y dispararía un webhook por cada una. Con presupuesto, la inyección funciona y aun así no hace daño. |
| `MAX_TURNS_PER_CONVERSATION` | 40 | Conversación interminable = bot gastando tokens. |
| `MAX_USER_MESSAGE_CHARS` | 2000 | Pegar un libro en el chat sale gratis para quien lo pega, no para quien lo paga. |
| `MAX_REPLY_CHARS` | 4000 | Agente convencido de escribir una novela: coste y widget roto. |
| `CONVERSATION_TTL_MS` | 24 h | Acota la ventana en que un `conversationId` robado sirve de algo. |

El contador de derivaciones **se cuenta contra la DB, no en memoria**: en serverless un contador en memoria no sobrevive a un despliegue ni se comparte entre instancias. Y si la cuenta falla se asume el **tope**, no cero — al revés, una caída de la DB abriría de par en par justo la puerta que ese contador protege.

Cuando se agota el presupuesto, al visitante se le responde con normalidad ("ya he avisado al equipo"). **No se le dice que hay un límite**: eso es exactamente lo que un atacante quiere medir.

### Entradas hostiles, por origen

- **Mensaje del visitante.** Es la vía directa. Se limpian los caracteres invisibles (ancho cero, controles bidi) *antes* de nada: sirven para esconder instrucciones en un texto que a una persona le parece inocente —el modelo sí los lee— y para invertir el orden visual y mostrar una cosa mientras el texto dice otra.
- **Historial.** **Nunca lo manda el cliente.** El navegador envía solo su `conversationId`; el servidor carga los turnos de la DB. Aceptar historial del cliente permitiría inventarse turnos de `assistant` —*"claro, te hacemos un 90% de descuento"*— que el agente tomaría por suyos. Inyección por la puerta de atrás.
- **Argumentos de la herramienta.** Los rellena un LLM: pueden faltar, venir vacíos o con el tipo cambiado. `planHandoff` los trata como dato hostil y no lanza nunca — petar ahí dejaría al visitante colgado justo al pedir ayuda.
- **`ai_config` del propio tenant.** Hoy lo escribe el admin. **Al abrir el autoservicio esto cambia de naturaleza**: el dueño podrá hacer que su agente diga lo que quiera, en un dominio que alojamos nosotros. La salida es `status='paused'`, que ya existe. Ver `security.md`.

### Salida del agente

- **Texto llano, sin enlaces ni HTML** (regla en el prompt). Si una inyección lograra colar un enlace, el widget lo pintaría en la web del cliente: un enlace de phishing servido desde el dominio del negocio es el peor resultado posible de todo esto.
- **El widget renderiza como texto, jamás `dangerouslySetInnerHTML` ni markdown con HTML.** Esta es la barrera dura contra XSS; la regla del prompt solo es apoyo.
- **La respuesta al derivar sale del código, no del modelo**, para que no prometa plazos que nadie acordó.

### El transcript que viaja a n8n

El payload de `handoff` incluye la conversación para que el aviso tenga contexto. **Ese texto lo escribió un desconocido.** Si la plantilla de n8n lo mete en un email HTML sin escapar, la inyección acaba en la bandeja del dueño del negocio. Las plantillas de n8n tratan `transcript` como texto, nunca como HTML.

### Coste como superficie de ataque

El endpoint del chat gasta dinero en cada llamada. Un atacante no necesita robar nada: le basta con hacerte gastar. Por eso los topes de arriba son de seguridad, no de higiene, y por eso el endpoint (Paso 2) llevará limitación por tenant y por IP como el resto de puertas abiertas del proyecto.

### Aislamiento

- El `tenant_id` del agente se resuelve en el servidor desde el slug/dominio, nunca desde el cliente.
- El prompt jamás expone `ai_config` de otro tenant ni claves.
- Rate limiting por tenant para evitar abuso de la API.
