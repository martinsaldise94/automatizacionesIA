#!/usr/bin/env node
/**
 * SessionStart — inyecta el estado real del repo al arrancar la sesión.
 *
 * La convención dice "lee `## Contexto actual` de plan.md antes de hacer nada".
 * En vez de confiar en que se cumpla, se entrega ya masticado: rama, trabajo sin
 * commitear y la sección de contexto del plan.
 */
import { readFileSync, existsSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

/** Raíz del proyecto derivada de la ubicación del propio hook, no del cwd. */
const projectDir = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..')

const git = (args) => {
  const run = spawnSync('git', args, { cwd: projectDir, encoding: 'utf8' })
  return run.status === 0 ? run.stdout.trim() : ''
}

const parts = []

const branch = git(['branch', '--show-current'])
if (branch) parts.push(`Rama activa: \`${branch}\``)

const dirty = git(['status', '--porcelain'])
if (dirty) {
  const lines = dirty.split('\n').filter(Boolean)
  parts.push(
    `Trabajo sin commitear (${lines.length}):\n` +
      lines.slice(0, 20).map((l) => `  ${l}`).join('\n') +
      (lines.length > 20 ? `\n  … y ${lines.length - 20} más` : '')
  )
} else if (branch) {
  parts.push('Working tree limpio.')
}

const plan = resolve(projectDir, 'plan.md')
if (existsSync(plan)) {
  const md = readFileSync(plan, 'utf8')
  const start = md.indexOf('\n## Contexto actual')
  if (start !== -1) {
    const rest = md.slice(start + 1)
    const next = rest.indexOf('\n## ', 1)
    const section = (next === -1 ? rest : rest.slice(0, next)).trim()
    parts.push(`Extraído de \`plan.md\`:\n\n${section}`)
  }
}

if (parts.length === 0) process.exit(0)

process.stdout.write(
  JSON.stringify({
    hookSpecificOutput: {
      hookEventName: 'SessionStart',
      additionalContext: `## Estado del repo al arrancar\n\n${parts.join('\n\n')}`,
    },
  })
)
