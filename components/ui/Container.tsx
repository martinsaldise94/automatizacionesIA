import { cn } from '@/lib/cn'

type ContainerProps = {
  children: React.ReactNode
  className?: string
  narrow?: boolean  // max-w-3xl en vez de max-w-6xl
}

export function Container({ children, className, narrow = false }: ContainerProps) {
  return (
    <div className={cn(
      'mx-auto w-full px-4 sm:px-6 lg:px-8',
      narrow ? 'max-w-3xl' : 'max-w-6xl',
      className,
    )}>
      {children}
    </div>
  )
}
