import { cn } from '@/lib/cn'

type BlockImageProps = {
  src: string
  alt: string
  className?: string
}

// Punto ÚNICO de uso de <img> crudo en los bloques. Las URLs son arbitrarias del
// tenant (todavía sin dominios conocidos), por eso no usamos next/image aún.
// Cuando llegue el uploader (Paso 8) se migra a next/image SOLO aquí.
export function BlockImage({ src, alt, className }: BlockImageProps) {
  // eslint-disable-next-line @next/next/no-img-element -- URL arbitraria de tenant; migración a next/image en Paso 8
  return <img src={src} alt={alt} className={className} />
}

type FramedImageProps = {
  src: string
  alt: string
  className?: string
}

// Imagen con el panel tintado de marca desplazado detrás — recurso firma compartido
// por Hero y TextImage. Da profundidad sin sombra difusa.
export function FramedImage({ src, alt, className }: FramedImageProps) {
  return (
    <div className="relative">
      <div
        aria-hidden
        className="absolute -inset-2 -z-10 translate-x-3 translate-y-3 rounded-2xl bg-brand/10"
      />
      <BlockImage src={src} alt={alt} className={cn('aspect-4/3 w-full rounded-2xl object-cover', className)} />
    </div>
  )
}
