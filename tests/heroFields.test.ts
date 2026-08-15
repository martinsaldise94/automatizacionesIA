import { describe, expect, it } from 'vitest'
import {
  heroFieldsFor,
  heroUsesBackground,
  heroUsesImage,
  heroUsesOverlay,
} from '@/lib/builder/heroFields'
import { builderConfig } from '@/lib/builder/config'

const CAMPOS = {
  title: { type: 'text' },
  subtitle: { type: 'textarea' },
  variant: { type: 'select' },
  image: { type: 'custom' },
  overlay: { type: 'select' },
  background: { type: 'select' },
  ctaText: { type: 'text' },
}

describe('heroUsesImage', () => {
  it('solo las variantes con imagen la usan', () => {
    expect(heroUsesImage('image-left')).toBe(true)
    expect(heroUsesImage('image-right')).toBe(true)
    expect(heroUsesImage('image-background')).toBe(true)
    expect(heroUsesImage('centered')).toBe(false)
  })

  it('un valor raro o ausente cuenta como sin imagen', () => {
    // Coincide con el render del bloque: `variant !== 'centered' && image`
    // mostraría la imagen con basura en `variant`. Aquí se elige el criterio
    // inverso y explícito: solo las dos variantes conocidas.
    expect(heroUsesImage(undefined)).toBe(false)
    expect(heroUsesImage(null)).toBe(false)
    expect(heroUsesImage('otra-cosa')).toBe(false)
  })
})

describe('heroUsesOverlay', () => {
  it('el oscurecido solo existe con la foto DETRÁS del texto', () => {
    // Con la imagen al lado no hay nada que oscurecer.
    expect(heroUsesOverlay('image-background')).toBe(true)
    expect(heroUsesOverlay('image-left')).toBe(false)
    expect(heroUsesOverlay('centered')).toBe(false)
  })
})

describe('heroUsesBackground', () => {
  it('el selector de fondo desaparece si la foto lo tapa entero', () => {
    // Elegir "blanco/primario/gris" con una foto a pantalla completa no cambia
    // nada visible: sería otro control que no hace nada.
    expect(heroUsesBackground('image-background')).toBe(false)
    expect(heroUsesBackground('centered')).toBe(true)
    expect(heroUsesBackground('image-left')).toBe(true)
  })
})

describe('heroFieldsFor', () => {
  it('esconde imagen y oscurecido en la variante de solo texto', () => {
    const r = heroFieldsFor('centered', CAMPOS)
    expect(r).not.toHaveProperty('image')
    expect(r).not.toHaveProperty('overlay')
    expect(r).toHaveProperty('background')
  })

  it('muestra la imagen pero no el oscurecido con la foto al lado', () => {
    for (const v of ['image-left', 'image-right']) {
      const r = heroFieldsFor(v, CAMPOS)
      expect(r, v).toHaveProperty('image')
      expect(r, v).not.toHaveProperty('overlay')
      expect(r, v).toHaveProperty('background')
    }
  })

  it('con foto de fondo: imagen y oscurecido sí, selector de fondo no', () => {
    const r = heroFieldsFor('image-background', CAMPOS)
    expect(r).toHaveProperty('image')
    expect(r).toHaveProperty('overlay')
    expect(r).not.toHaveProperty('background')
  })

  it('NO muta el objeto recibido', () => {
    // Puck reutiliza la misma referencia entre renders: quitarle la clave in
    // situ haría desaparecer el campo también en las variantes con imagen, y
    // ya no volvería salvo recargando el editor.
    const original = { ...CAMPOS }
    heroFieldsFor('centered', original)
    expect(original).toHaveProperty('image')
  })

  it('el resto de campos queda intacto', () => {
    const r = heroFieldsFor('centered', CAMPOS)
    expect(r.title).toBe(CAMPOS.title)
    expect(r.variant).toBe(CAMPOS.variant)
  })
})

describe('cableado en la config', () => {
  it('el Hero declara resolveFields', () => {
    // Si alguien lo quita, vuelve el fallo silencioso: subir una foto que el
    // bloque descarta sin avisar.
    const hero = builderConfig.components.Hero as { resolveFields?: unknown }
    expect(typeof hero.resolveFields).toBe('function')
  })

  it('las opciones de diseño dicen cuál lleva imagen', () => {
    // "Centrado" a secas no le dice a nadie que esa opción descarta la foto.
    const hero = builderConfig.components.Hero as {
      fields: { variant: { options: Array<{ label: string; value: string }> } }
    }
    const centered = hero.fields.variant.options.find((o) => o.value === 'centered')

    expect(centered?.label).toMatch(/solo texto/i)
    expect(hero.fields.variant.options.filter((o) => /imagen/i.test(o.label))).toHaveLength(3)
  })

  it('el oscurecido no ofrece "ninguno"', () => {
    // Quitar el velo del todo deja el titular ilegible sobre cualquier foto
    // clara, y el dueño no tiene forma de saber que el fallo es de su foto.
    // La opción más suave se llama "Poco", nunca "Ninguno".
    const hero = builderConfig.components.Hero as {
      fields: { overlay: { options: Array<{ label: string; value: string }> } }
    }
    const etiquetas = hero.fields.overlay.options.map((o) => o.label.toLowerCase())

    expect(etiquetas).not.toContain('ninguno')
    expect(etiquetas).not.toContain('sin oscurecer')
    expect(hero.fields.overlay.options).toHaveLength(3)
  })
})
