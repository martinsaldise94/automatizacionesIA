import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { builderConfig } from '@/lib/builder/config'

// Test estructural, no de render.
//
// Motivo: los campos de imagen eran `type: 'text'` y obligaban al dueño a
// PEGAR UNA URL. Un dueño no técnico no tiene la URL de una foto suya en
// ninguna parte, así que ese campo dejaba su web con huecos o le obligaba a
// llamar a la agencia — justo lo que el producto promete evitar.
//
// Este test falla si alguien añade un campo de imagen nuevo y se olvida de
// usar `imageField()`. Es fácil olvidarlo: `type: 'text'` compila igual.

type Campo = { type: string; label?: string }
type CampoArray = Campo & { arrayFields?: Record<string, Campo> }

// Nombres de prop que son imágenes. Si aparece uno nuevo (`banner`, `icono`…)
// se añade aquí y el test dirá si está bien cableado.
const NOMBRES_DE_IMAGEN = ['image', 'photo', 'logo', 'avatar', 'cover']

function esNombreDeImagen(nombre: string): boolean {
  const n = nombre.toLowerCase()
  // `imageAlt` NO es una imagen: es el texto alternativo. Por eso se compara
  // el nombre completo y no un "empieza por".
  return NOMBRES_DE_IMAGEN.includes(n)
}

// Recorre todos los campos de todos los bloques, incluidos los de dentro de un
// array (los items de Galería, Equipo, Logos y Testimonios).
function todosLosCampos(): Array<{ ruta: string; nombre: string; campo: Campo }> {
  const out: Array<{ ruta: string; nombre: string; campo: Campo }> = []

  for (const [bloque, def] of Object.entries(builderConfig.components)) {
    const fields = (def as { fields?: Record<string, CampoArray> }).fields ?? {}

    for (const [nombre, campo] of Object.entries(fields)) {
      out.push({ ruta: bloque, nombre, campo })

      for (const [sub, subCampo] of Object.entries(campo.arrayFields ?? {})) {
        out.push({ ruta: `${bloque}.${nombre}[]`, nombre: sub, campo: subCampo })
      }
    }
  }

  return out
}

describe('campos de imagen del builder', () => {
  it('encuentra campos que auditar', () => {
    // Si esto falla, el test dejó de mirar donde debía.
    expect(todosLosCampos().length).toBeGreaterThan(20)
  })

  it('TODO campo de imagen usa imageField (custom), no un texto con la URL', () => {
    const conUrlAMano = todosLosCampos()
      .filter(({ nombre, campo }) => esNombreDeImagen(nombre) && campo.type !== 'custom')
      .map(({ ruta, nombre, campo }) => `${ruta} → ${nombre} (type: '${campo.type}')`)

    expect(
      conUrlAMano,
      `Campos de imagen que aún obligan a pegar una URL:\n${conUrlAMano.join('\n')}`,
    ).toEqual([])
  })

  it('cubre los seis bloques que llevan imagen', () => {
    const imagenes = todosLosCampos().filter(({ nombre }) => esNombreDeImagen(nombre))
    expect(imagenes.length).toBe(6)

    const rutas = imagenes.map((c) => `${c.ruta}.${c.nombre}`)
    expect(rutas).toEqual(
      expect.arrayContaining([
        'Hero.image',
        'TextImage.image',
        'Gallery.items[].image',
        'Team.items[].photo',
        'LogoGrid.items[].logo',
        'Testimonials.items[].avatar',
      ]),
    )
  })

  it("imageField.tsx NO puede llevar 'use client'", () => {
    // Esto reventó en runtime: `lib/builder/config.tsx` se evalúa TAMBIÉN en el
    // servidor (plantillas de alta, validación al publicar, sitemap), y una
    // función exportada desde un módulo 'use client' no es invocable desde el
    // servidor — es una referencia. Error: "Attempted to call imageField()
    // from the server".
    //
    // Los tests no lo cazaron solos porque en vitest la directiva es inerte:
    // el módulo importa igual. De ahí este test de código fuente.
    const src = readFileSync(join(process.cwd(), 'components/builder/imageField.tsx'), 'utf8')
    expect(src).not.toMatch(/^\s*['"]use client['"]/m)

    // El envoltorio con `dynamic({ ssr: false })` sí debe serlo: ese hook solo
    // vale en cliente. Si alguien fusiona los dos archivos, algo se rompe.
    const lazy = readFileSync(join(process.cwd(), 'components/builder/LazyImagePicker.tsx'), 'utf8')
    expect(lazy).toMatch(/^\s*['"]use client['"]/m)
  })

  it('el texto alternativo sigue siendo texto, no un selector de imagen', () => {
    // `imageAlt` empieza por "image" pero es SEO, no una foto. Si acabara
    // siendo un selector, el bloque perdería su texto alternativo.
    const alt = todosLosCampos().find(({ nombre }) => nombre === 'imageAlt')
    expect(alt?.campo.type).toBe('text')
  })
})
