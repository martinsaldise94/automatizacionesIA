import { cn } from '@/lib/cn'

type SectionBackground = 'white' | 'gray' | 'brand' | 'dark'

type SectionProps = {
  children: React.ReactNode
  background?: SectionBackground
  className?: string
  id?: string
}

const bgMap: Record<SectionBackground, string> = {
  white: 'bg-white text-foreground',
  gray:  'bg-gray-50 text-foreground',
  brand: 'bg-brand text-brand-fg',
  dark:  'bg-gray-900 text-white',
}

export function Section({ children, background = 'white', className, id }: SectionProps) {
  return (
    <section
      id={id}
      className={cn('py-16 md:py-24', bgMap[background], className)}
    >
      {children}
    </section>
  )
}
