import { cn } from '@/lib/cn'
import { Heading } from './Heading'
import { Text } from './Text'

type SectionHeaderProps = {
  title?: string
  subtitle?: string
  align?: 'center' | 'left'
  className?: string
}

// Cabecera de sección reutilizable. `align` rompe la monotonía de "todo centrado":
// las variantes editoriales (list, row) la usan a la izquierda.
export function SectionHeader({ title, subtitle, align = 'center', className }: SectionHeaderProps) {
  if (!title && !subtitle) return null
  const centered = align === 'center'

  return (
    <div className={cn('mb-12', centered ? 'text-center' : 'max-w-2xl', className)}>
      {title && (
        <Heading as="h2" className="text-balance">
          {title}
        </Heading>
      )}
      {subtitle && (
        <Text size="lg" className={cn('mt-3 text-gray-600', centered && 'mx-auto max-w-2xl')}>
          {subtitle}
        </Text>
      )}
    </div>
  )
}
