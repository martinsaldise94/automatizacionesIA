import { cn } from '@/lib/cn'

type ButtonVariant = 'brand' | 'brand-outline' | 'secondary' | 'ghost'
type ButtonSize    = 'sm' | 'md' | 'lg'

// Button NO sabe qué es un CTA de WhatsApp. Antes sí, y con `phone` opcional:
// un bloque que olvidaba pasarlo caía en href="#" y el botón parecía funcionar.
// Ahora el destino lo resuelve `resolveCtaLink` (lib/builder/cta.ts), que
// devuelve null si no hay destino y deja que el bloque oculte el botón.
type ButtonProps = {
  children: React.ReactNode
  variant?: ButtonVariant
  size?: ButtonSize
  // Cuando es enlace
  href?: string
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

export function Button({
  children,
  variant = 'brand',
  size = 'md',
  href,
  type = 'button',
  disabled,
  className,
  newTab,
}: ButtonProps) {
  const cls = cn(base, variantMap[variant], sizeMap[size], className)

  if (href) {
    return (
      <a
        href={href}
        className={cls}
        target={newTab ? '_blank' : undefined}
        rel={newTab ? 'noopener noreferrer' : undefined}
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
