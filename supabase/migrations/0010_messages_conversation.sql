-- ─── Hilo de conversación en `messages` ──────────────────────────────────────
--
-- El modelo agrupaba una conversación por `lead_id`, pero el visitante de una
-- web NO tiene lead: llega, pregunta y a lo mejor nunca se identifica. Sin una
-- clave de hilo, sus turnos quedan sueltos y el agente no puede leer lo que se
-- dijo hace dos mensajes.
--
-- Las alternativas se descartaron:
--   (a) Crear un lead en el primer mensaje → el CRM del tier_3 se llena de
--       fichas vacías de curiosos y deja de valer para lo que vale.
--   (b) Guardar la conversación solo en el navegador y persistir al derivar →
--       se pierde justo lo más útil, las conversaciones que NO convierten:
--       son las que dicen al negocio qué le preguntan y no sabe responder.
--
-- Con `conversation_id` los turnos se hilan desde el primer mensaje sin crear
-- lead. Cuando el visitante se identifica (derivación), se crea el lead y se
-- rellena `lead_id` en TODOS los mensajes del hilo: el CRM ve la conversación
-- entera, incluido lo que pasó antes de dar el nombre.
--
-- ⚠️ El id lo genera el SERVIDOR, nunca el cliente, y es un uuid v4: el
-- servidor carga el historial de la DB con este id, así que uno adivinable
-- dejaría leer la conversación de otro visitante. Adivinar un uuid v4 es
-- inviable; aun así toda query filtra ADEMÁS por tenant_id.

alter table messages
  add column if not exists conversation_id uuid;

-- Índice compuesto: la consulta real es "dame los turnos de ESTE hilo de ESTE
-- tenant, en orden". tenant_id primero porque es el filtro de aislamiento y
-- está en todas las queries de la tabla.
create index if not exists messages_conversation_idx
  on messages (tenant_id, conversation_id, created_at);

comment on column messages.conversation_id is
  'Hilo de conversacion. Lo genera el servidor (uuid v4). Permite agrupar turnos de un visitante anonimo sin crear lead; al derivar se rellena lead_id en todo el hilo. Null en mensajes sueltos (p.ej. el texto del formulario de contacto).';
