import { cn } from '@/lib/cn'

type TextSize  = 'lg' | 'md' | 'sm' | 'xs'
type TextColor = 'default' | 'muted' | 'brand' | 'white'

type TextProps = {
  as?: 'p' | 'span' | 'div'
  size?: TextSize
  color?: TextColor
  children: React.ReactNode
  className?: string
}

const sizeMap: Record<TextSize, string> = {
  lg: 'text-lg leading-relaxed',
  md: 'text-base leading-relaxed',
  sm: 'text-sm leading-normal',
  xs: 'text-xs leading-normal',
}

const colorMap: Record<TextColor, string> = {
  default: 'text-foreground',
  muted:   'text-gray-500',
  brand:   'text-brand',
  white:   'text-white',
}

export function Text({ as: Tag = 'p', size = 'md', color = 'default', children, className }: TextProps) {
  return (
    <Tag className={cn(sizeMap[size], colorMap[color], className)}>
      {children}
    </Tag>
  )
}
