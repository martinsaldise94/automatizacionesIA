import { describe, expect, it } from 'vitest'
import { TEMPLATES, getTemplate, listTemplates } from '@/lib/templates'
import { validatePuckData } from '@/lib/builder/publish'
import { normalizePagePath } from '@/lib/builder/pagePath'
import { builderConfig } from '@/lib/builder/config'

const REGISTERED = Object.keys(builderConfig.components)

describe('plantillas', () => {
  it('todas las páginas usan SOLO bloques registrados y estructura válida', () => {
    for (const tpl of TEMPLATES) {
      for (const p of tpl.pages) {
        const res = validatePuckData(p.data as unknown, REGISTERED)
        expect(res.ok, `${tpl.key} ${p.path}: ${res.ok ? '' : res.error}`).toBe(true)
      }
    }
  })

  it('todos los paths de cada plantilla son válidos y canónicos', () => {
    for (const tpl of TEMPLATES) {
      for (const p of tpl.pages) {
        const r = normalizePagePath(p.path)
        expect(r.ok, `${tpl.key} ${p.path}`).toBe(true)
        if (r.ok) expect(r.path).toBe(p.path) // ya vienen canónicos
      }
    }
  })

  it('no hay paths duplicados dentro de una plantilla', () => {
    for (const tpl of TEMPLATES) {
      const paths = tpl.pages.map((p) => p.path)
      expect(new Set(paths).size).toBe(paths.length)
    }
  })

  it('cada plantilla tiene una home ("/")', () => {
    for (const tpl of TEMPLATES) {
      expect(tpl.pages.some((p) => p.path === '/')).toBe(true)
    }
  })

  it('las keys de plantilla son únicas', () => {
    const keys = TEMPLATES.map((t) => t.key)
    expect(new Set(keys).size).toBe(keys.length)
  })

  it('getTemplate y listTemplates funcionan', () => {
    expect(getTemplate('clinica')?.key).toBe('clinica')
    expect(getTemplate('inexistente')).toBeNull()
    expect(listTemplates().length).toBe(TEMPLATES.length)
    expect(listTemplates()[0]).toHaveProperty('label')
  })
})
