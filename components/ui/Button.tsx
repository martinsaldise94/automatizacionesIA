import { cn } from '@/lib/cn'

type ButtonVariant = 'brand' | 'brand-outline' | 'secondary' | 'ghost'
type ButtonSize    = 'sm' | 'md' | 'lg'
type CtaType       = 'link' | 'whatsapp' | 'booking'

type ButtonProps = {
  children: React.ReactNode
  variant?: ButtonVariant
  size?: ButtonSize
  // Cuando es enlace
  ctaType?: CtaType
  href?: string
  phone?: string        // para ctaType='whatsapp' — número en formato internacional sin +
  // Cuando es botón de formulario
  type?: 'button' | 'submit' | 'reset'
  disabled?: boolean
  className?: string
  newTab?: boolean
}

const variantMap: Record<ButtonVariant, string> = {
  'brand':         'bg-brand text-brand-fg hover:opacity-90',
  'brand-outline': 'border-2 border-brand text-brand hover:bg-brand hover:text-brand-fg',
  'secondary':     'bg-brand-secondary text-brand-secondary-fg hover:opacity-90',
  'ghost':         'text-brand hover:bg-brand/10',
}

const sizeMap: Record<ButtonSize, string> = {
  sm: 'px-4 py-2 text-sm rounded-lg',
  md: 'px-6 py-3 text-base rounded-xl',
  lg: 'px-8 py-4 text-lg rounded-xl',
}

const base = 'inline-flex items-center justify-center gap-2 font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none'

function buildHref(ctaType: CtaType, href?: string, phone?: string): string {
  if (ctaType === 'whatsapp' && phone) {
    const clean = phone.replace(/\D/g, '')
    return `https://wa.me/${clean}`
  }
  if (ctaType === 'booking') return href ?? '/reservar'
  return href ?? '#'
}

export function Button({
  children,
  variant = 'brand',
  size = 'md',
  ctaType,
  href,
  phone,
  type = 'button',
  disabled,
  className,
  newTab,
}: ButtonProps) {
  const cls = cn(base, variantMap[variant], sizeMap[size], className)

  if (ctaType || href) {
    const url = ctaType ? buildHref(ctaType, href, phone) : (href ?? '#')
    return (
      <a
        href={url}
        className={cls}
        target={newTab || ctaType === 'whatsapp' ? '_blank' : undefined}
        rel={newTab || ctaType === 'whatsapp' ? 'noopener noreferrer' : undefined}
      >
        {children}
      </a>
    )
  }

  return (
    <button type={type} disabled={disabled} className={cls}>
      {children}
    </button>
  )
}
