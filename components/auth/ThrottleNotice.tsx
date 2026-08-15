'use client'

import { useEffect, useState } from 'react'
import { throttleMessage } from '@/lib/auth-throttle'

// Aviso de "estás frenado", con cuenta atrás en vivo.
//
// Sin ella el número parecía aleatorio: el servidor devuelve lo que QUEDA de
// espera, así que si tardabas 8 segundos en teclear, un frenazo de 10 llegaba
// como "espera 2". Correcto, pero ilegible — cada intento mostraba una cifra
// distinta sin explicación. Aquí baja sola y dice cuándo puedes reintentar.

export function ThrottleNotice({ waitMs }: { waitMs: number }) {
  const [restante, setRestante] = useState(waitMs)

  useEffect(() => {
    // El instante final se calcula DENTRO del efecto: `Date.now()` es impura y
    // en render React puede repetirlo y dar otro valor.
    const fin = Date.now() + waitMs

    // No se hace un setRestante(waitMs) aquí: el estado ya arranca en waitMs y
    // llamar a setState en el cuerpo del efecto encadena renders (lo caza
    // react-hooks/set-state-in-effect). Si la prop cambia, el primer tick
    // corrige en 250ms.
    //
    // 250ms y no 1000: con un tick de un segundo el número se queda "pegado"
    // hasta un segundo entero después de cambiar y se ve a saltos.
    const id = setInterval(() => {
      const queda = Math.max(0, fin - Date.now())
      setRestante(queda)
      if (queda === 0) clearInterval(id)
    }, 250)

    return () => clearInterval(id)
  }, [waitMs])

  if (restante === 0) {
    return (
      <p role="status" className="rounded bg-green-50 px-3 py-2 text-sm text-green-700">
        Ya puedes volver a intentarlo.
      </p>
    )
  }

  return (
    <p role="alert" className="rounded bg-red-50 px-3 py-2 text-sm text-red-600">
      {throttleMessage(restante)}
    </p>
  )
}
