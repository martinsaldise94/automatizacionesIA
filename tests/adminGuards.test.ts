import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

// Test estructural, no de comportamiento.
//
// Motivo: `createTenant` se desplegó SIN `requireAdmin()`. Sus seis hermanas sí
// lo llamaban; el guard vivía dentro de otro archivo y desde el de al lado no
// se veía. Un guard del layout NO protege una server action — la action es un
// endpoint POST propio, alcanzable sin renderizar la página.
//
// Este test lee el código fuente y falla si alguna action bajo /admin no llama
// al guard. Es feo leer fuentes desde un test; es más feo volver a publicar una
// action de admin abierta.

const ADMIN_DIR = join(process.cwd(), 'app', 'admin')

// Único archivo exento: el login es donde te conviertes en admin. Exigir
// requireAdmin() ahí sería un bucle (nadie podría entrar nunca).
const EXENTOS = new Set(['app/admin/login/actions.ts'])

function findActionFiles(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) findActionFiles(full, acc)
    else if (entry.name === 'actions.ts') acc.push(full)
  }
  return acc
}

// Quita comentarios ANTES de buscar el guard. Sin esto, un `// requireAdmin()`
// comentado cuenta como guard presente — que es justo el fallo que este test
// existe para detectar. El `[^:]` evita destrozar URLs (https://...).
function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1')
}

// Trocea el archivo por declaraciones exportadas: [nombre, cuerpo hasta la siguiente].
function exportedActions(source: string): Array<{ name: string; body: string }> {
  const re = /export\s+async\s+function\s+(\w+)/g
  const marks: Array<{ name: string; start: number }> = []
  let m: RegExpExecArray | null
  while ((m = re.exec(source)) !== null) marks.push({ name: m[1], start: m.index })

  return marks.map((mark, i) => ({
    name: mark.name,
    body: source.slice(mark.start, marks[i + 1]?.start ?? source.length),
  }))
}

const files = findActionFiles(ADMIN_DIR)

describe('server actions del panel de admin', () => {
  it('encuentra archivos de actions que auditar', () => {
    // Si esto falla, el test dejó de mirar donde debía (¿se movió /admin?).
    expect(files.length).toBeGreaterThan(0)
  })

  it('TODA action exportada bajo /admin llama a requireAdmin()', () => {
    const sinGuard: string[] = []

    for (const file of files) {
      const rel = file.replace(process.cwd(), '').replace(/\\/g, '/').replace(/^\//, '')
      if (EXENTOS.has(rel)) continue

      const source = stripComments(readFileSync(file, "utf8"))
      for (const action of exportedActions(source)) {
        if (!/requireAdmin\s*\(\s*\)/.test(action.body)) {
          sinGuard.push(`${rel} → ${action.name}()`)
        }
      }
    }

    expect(sinGuard, `Actions de admin sin requireAdmin():\n${sinGuard.join('\n')}`).toEqual([])
  })

  it('el guard se importa del módulo compartido, no se redefine por archivo', () => {
    // Una copia local del guard es cómo se desincronizan. Debe venir de lib/admin-auth.
    for (const file of files) {
      const rel = file.replace(process.cwd(), '').replace(/\\/g, '/').replace(/^\//, '')
      if (EXENTOS.has(rel)) continue

      const source = stripComments(readFileSync(file, "utf8"))
      expect(source, `${rel} debe importar requireAdmin de @/lib/admin-auth`).toContain(
        "from '@/lib/admin-auth'",
      )
      expect(source, `${rel} redefine requireAdmin en local`).not.toMatch(
        /(async\s+)?function\s+requireAdmin/,
      )
    }
  })
})
