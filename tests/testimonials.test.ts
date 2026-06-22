import { describe, expect, it } from 'vitest'
import { selectTestimonials, type Testimonial } from '@/lib/builder/testimonials'

const t = (over: Partial<Testimonial> = {}): Testimonial => ({
  text: 'Gran servicio',
  author: 'Ana',
  role: 'Cliente',
  avatar: '',
  ...over,
})

describe('selectTestimonials', () => {
  it('manual: devuelve los items válidos', () => {
    const res = selectTestimonials('manual', [t(), t({ author: 'Luis' })])
    expect(res).toEqual({ mode: 'list', items: [t(), t({ author: 'Luis' })] })
  })

  it('manual: filtra items sin texto o sin autor', () => {
    const res = selectTestimonials('manual', [t(), t({ text: '  ' }), t({ author: '' })])
    expect(res.mode).toBe('list')
    if (res.mode === 'list') expect(res.items).toHaveLength(1)
  })

  it('manual: sin items válidos → placeholder "empty"', () => {
    expect(selectTestimonials('manual', [])).toEqual({ mode: 'placeholder', reason: 'empty' })
  })

  it('google: con reseñas inyectadas → las usa', () => {
    const reviews = [t({ author: 'Google User', rating: 5 })]
    expect(selectTestimonials('google', [], reviews)).toEqual({ mode: 'list', items: reviews })
  })

  it('google: sin reseñas (no configurado) → placeholder "google-no-config"', () => {
    expect(selectTestimonials('google', [])).toEqual({ mode: 'placeholder', reason: 'google-no-config' })
    expect(selectTestimonials('google', [], null)).toEqual({ mode: 'placeholder', reason: 'google-no-config' })
  })
})
