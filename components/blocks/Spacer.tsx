import type { SpacerProps } from '@/lib/builder/config'

const heightMap = {
  sm: 'h-8',
  md: 'h-16',
  lg: 'h-24',
  xl: 'h-32',
} as const

export function Spacer({ height }: SpacerProps) {
  return <div className={heightMap[height]} aria-hidden />
}
