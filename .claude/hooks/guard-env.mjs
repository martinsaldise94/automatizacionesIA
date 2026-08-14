#!/usr/bin/env node
/**
 * PreToolUse — impide que Claude lea o escriba secretos reales.
 *
 * `.env.local` (y cualquier `.env*` que no sea `.env.example`) contiene las keys
 * de Supabase, Anthropic y n8n. La regla existía escrita en la skill; este hook
 * la garantiza. Bloquea Read/Edit/Write sobre esos archivos y los comandos Bash
 * que intenten volcarlos.
 *
 * Salida: exit 2 = bloquear, y stderr se le devuelve a Claude como motivo.
 */
import { readFileSync } from 'node:fs'

/** `.env`, `.env.local`, `.env.production`… pero NO `.env.example`. */
const ENV_FILE = /(^|[/\\])\.env(?!\.example)(\.[\w.-]+)?$/i
/** Mismo criterio dentro de una línea de comando. */
const ENV_IN_CMD = /(^|[\s"'=/\\])\.env(?!\.example)(\.[\w.-]+)?(\s|$|["'`)])/i
/** Comandos que vuelcan el contenido de un archivo. */
const READS_FILE = /\b(cat|type|more|less|head|tail|gc|get-content|rg|grep|sed|awk|strings|cp|copy|mv|move)\b/i

function block(reason) {
  process.stderr.write(
    `${reason}\n` +
      'Regla del proyecto: nunca abras secretos reales. ' +
      'Si necesitas saber qué variables existen, mira `.env.example` o ' +
      '`references/onboarding.md`. Si falta una variable, dilo y que la ponga el usuario.\n'
  )
  process.exit(2)
}

let input
try {
  input = JSON.parse(readFileSync(0, 'utf8'))
} catch {
  process.exit(0) // sin input parseable no hay nada que juzgar
}

const tool = input.tool_name ?? ''
const args = input.tool_input ?? {}

if (['Read', 'Edit', 'Write', 'NotebookEdit', 'MultiEdit'].includes(tool)) {
  const path = args.file_path ?? args.notebook_path ?? ''
  if (ENV_FILE.test(String(path))) {
    block(`Bloqueado: \`${tool}\` sobre \`${path}\` (archivo de secretos).`)
  }
}

if (tool === 'Bash' || tool === 'PowerShell') {
  const cmd = String(args.command ?? '')
  if (ENV_IN_CMD.test(cmd) && READS_FILE.test(cmd)) {
    block(`Bloqueado: ese comando lee un archivo de entorno real.\n  ${cmd}`)
  }
}

process.exit(0)
