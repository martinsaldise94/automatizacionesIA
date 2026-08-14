#!/usr/bin/env node
/**
 * Stop — impide terminar el turno con código tocado y `plan.md` sin actualizar.
 *
 * La convención del proyecto es que `plan.md` (marcas `[x]` + bloque
 * `## Contexto actual`) es la primera fuente de verdad al retomar una sesión.
 * Depender de que Claude se acuerde no funciona; esto lo hace obligatorio.
 *
 * Cómo evita bucles: la condición se autolimpia. En cuanto `plan.md` se edita,
 * pasa a ser el archivo más reciente y el hook deja de saltar. Además respeta
 * `stop_hook_active`, así que nunca puede bloquear dos veces seguidas.
 */
import { readFileSync, statSync, existsSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { resolve, dirname, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const SCOPE = ['app', 'lib', 'components', 'tests', 'supabase']

/** Raíz del proyecto derivada de la ubicación del propio hook, no del cwd. */
const projectDir = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..')

let input
try {
  input = JSON.parse(readFileSync(0, 'utf8'))
} catch {
  process.exit(0)
}

if (input.stop_hook_active) process.exit(0) // ya bloqueamos una vez; no insistir

const plan = resolve(projectDir, 'plan.md')
if (!existsSync(plan)) process.exit(0)

const status = spawnSync('git', ['status', '--porcelain'], {
  cwd: projectDir,
  encoding: 'utf8',
})
if (status.status !== 0) process.exit(0) // sin git no hay nada que comparar

const planMtime = statSync(plan).mtimeMs

const stale = status.stdout
  .split('\n')
  .map((line) => line.slice(3).trim().replace(/^"|"$/g, ''))
  .filter(Boolean)
  .filter((file) => SCOPE.includes(file.split('/')[0]) || SCOPE.includes(file.split(sep)[0]))
  .filter((file) => {
    try {
      return statSync(resolve(projectDir, file)).mtimeMs > planMtime
    } catch {
      return false // borrado o inaccesible
    }
  })

if (stale.length === 0) process.exit(0)

process.stderr.write(
  'Has tocado código y `plan.md` sigue sin actualizar:\n' +
    stale.slice(0, 10).map((f) => `  - ${f}`).join('\n') +
    (stale.length > 10 ? `\n  … y ${stale.length - 10} más` : '') +
    '\n\nAntes de terminar: marca `[x]` el paso si quedó en verde y refresca el bloque ' +
    '`## Contexto actual` de `plan.md` (rama activa, archivos nuevos/modificados, siguiente paso).\n'
)
process.exit(2)
