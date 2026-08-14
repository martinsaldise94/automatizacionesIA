#!/usr/bin/env node
/**
 * PostToolUse (Edit|Write) — pasa `eslint --fix` al archivo recién tocado.
 *
 * Es la misma red que husky corre en `pre-commit` con lint-staged, pero al
 * instante: los fallos de lint se ven al editar, no diez archivos después.
 * Solo actúa sobre el código de producto; ignora config, tests de hooks y todo
 * lo que quede fuera del scope de eslint.
 *
 * Salida: exit 2 si quedan errores que `--fix` no puede arreglar (stderr vuelve
 * a Claude). Nunca deshace la edición.
 */
import { readFileSync, existsSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { relative, resolve, dirname, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const LINTABLE = /\.(ts|tsx|js|jsx|mjs)$/
const SCOPE = ['app', 'lib', 'components', 'tests']

/** Este archivo vive en <proyecto>/.claude/hooks/, así que la raíz es dos arriba.
 *  Derivarla de aquí (y no del cwd) hace que el hook funcione lo lance quien lo lance. */
const projectDir = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..')

let input
try {
  input = JSON.parse(readFileSync(0, 'utf8'))
} catch {
  process.exit(0)
}

const filePath = input.tool_input?.file_path
if (!filePath || !LINTABLE.test(filePath)) process.exit(0)

const rel = relative(projectDir, resolve(filePath))
if (rel.startsWith('..')) process.exit(0) // fuera del proyecto
if (!SCOPE.includes(rel.split(sep)[0])) process.exit(0)

const eslint = resolve(projectDir, 'node_modules/eslint/bin/eslint.js')
if (!existsSync(eslint)) process.exit(0) // sin dependencias instaladas, no molestar

const run = spawnSync(process.execPath, [eslint, '--fix', rel], {
  cwd: projectDir,
  encoding: 'utf8',
})

if (run.status !== 0) {
  const out = `${run.stdout ?? ''}${run.stderr ?? ''}`.trim()
  process.stderr.write(`eslint deja errores en ${rel}:\n${out}\nArréglalos antes de seguir.\n`)
  process.exit(2)
}

process.exit(0)
