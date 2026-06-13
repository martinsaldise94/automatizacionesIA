import { cn } from '@/lib/cn'

type HeadingLevel = 'h1' | 'h2' | 'h3' | 'h4'
type HeadingSize  = 'xl' | 'lg' | 'md' | 'sm'

type HeadingProps = {
  as?: HeadingLevel
  size?: HeadingSize
  children: React.ReactNode
  className?: string
}

const sizeMap: Record<HeadingSize, string> = {
  xl: 'text-4xl sm:text-5xl font-bold tracking-tight leading-tight',
  lg: 'text-3xl sm:text-4xl font-bold tracking-tight leading-tight',
  md: 'text-2xl sm:text-3xl font-semibold tracking-tight',
  sm: 'text-xl sm:text-2xl font-semibold',
}

const defaultSize: Record<HeadingLevel, HeadingSize> = {
  h1: 'xl',
  h2: 'lg',
  h3: 'md',
  h4: 'sm',
}

export function Heading({ as: Tag = 'h2', size, children, className }: HeadingProps) {
  const resolvedSize = size ?? defaultSize[Tag]
  return (
    <Tag className={cn(sizeMap[resolvedSize], className)}>
      {children}
    </Tag>
  )
}
