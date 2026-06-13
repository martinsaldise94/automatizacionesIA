// ─── Proveedor de IA: ÚNICO punto de acoplamiento con un motor concreto ───────
//
// El resto del código (endpoint del chat, construcción del prompt) usa
// `generateText`/`streamText` del AI SDK con el modelo que devuelve este
// archivo, sin saber si por detrás hay Claude, Ollama u otro. Cambiar de
// proveedor = tocar SOLO este archivo. El cliente no se entera: el agente se
// comporta igual (mismo prompt, mismas reglas de derivación).
//
// Regla: NADIE más importa `@ai-sdk/anthropic` (ni futuros providers). Si
// aparece ese import en otro sitio, está roto el desacoplamiento.

import { anthropic } from '@ai-sdk/anthropic'
import type { LanguageModel } from 'ai'

// Modelo por defecto para tenants sin modelo propio en `ai_config.model`.
// Barato y de sobra para un agente de FAQs con derivación a humano.
// Cambiar esta constante migra a todos los tenants sin modelo propio.
const DEFAULT_MODEL = 'anthropic:claude-haiku-4-5-20251001'

// Registro de proveedores. Cada uno mapea un nombre de modelo → instancia del
// AI SDK. Para añadir Ollama el día que escale (más barato self-hosted):
//   1. npm i ollama-ai-provider
//   2. import { createOllama } from 'ollama-ai-provider'
//   3. añadir aquí:  ollama: (model) => createOllama()(model)
// Y en la config del tenant poner `ollama:llama3.1`. Cero cambios en call sites.
const PROVIDERS: Record<string, (model: string) => LanguageModel> = {
  anthropic: (model) => anthropic(model),
}

// Separa `proveedor:modelo`. Sin prefijo se asume `anthropic` (retrocompat con
// los `ai_config.model` actuales, que guardan solo el nombre del modelo Claude).
function parse(id: string): { provider: string; model: string } {
  const i = id.indexOf(':')
  if (i === -1) return { provider: 'anthropic', model: id }
  return { provider: id.slice(0, i), model: id.slice(i + 1) }
}

// Resuelve un identificador de modelo en una instancia del AI SDK.
// Nunca lanza: un proveedor/modelo desconocido cae al por defecto para no
// tumbar el chat de un tenant por un valor mal puesto en config.
export function resolveModel(modelId?: string | null): LanguageModel {
  const raw = modelId?.trim() || DEFAULT_MODEL
  const { provider, model } = parse(raw)

  const factory = PROVIDERS[provider]
  if (!factory) {
    const def = parse(DEFAULT_MODEL)
    return PROVIDERS[def.provider](def.model)
  }
  return factory(model)
}
