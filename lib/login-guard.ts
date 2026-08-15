import { headers } from 'next/headers'
import {
  ACCOUNT_FREE_ATTEMPTS,
  IP_FREE_ATTEMPTS,
  strictest,
  throttleCheck,
  throttleMessage,
  type ThrottleVerdict,
} from '@/lib/auth-throttle'
import {
  clearFailedLogins,
  failureStatsByEmail,
  failureStatsByIp,
  recordFailedLogin,
  type LoginScope,
} from '@/lib/db/loginAttempts'

// Guard compartido por los DOS logins (panel de agencia y portal del dueño).
// Vive fuera de ambos a propósito: la lección de `createTenant` es que un guard
// dentro de un archivo no se ve desde el de al lado y acaba desincronizado.

// IP de origen. `x-forwarded-for` la escribe el proxy de delante y, en un
// despliegue serio (Vercel), la sobrescribe: la primera entrada es el cliente
// real. En local o detrás de un proxy mal configurado el cliente PUEDE
// falsearla, así que este contador es de refuerzo: la barrera que no se
// esquiva cambiando de cabecera es la de cuenta.
export function clientIpFrom(h: Headers): string | null {
  const forwarded = h.get('x-forwarded-for')
  if (forwarded) {
    const primera = forwarded.split(',')[0]?.trim()
    if (primera) return primera
  }
  return h.get('x-real-ip')?.trim() || null
}

function normalizeEmail(email: string): string {
  return (email ?? '').trim().toLowerCase()
}

export type LoginAttemptContext = {
  scope: LoginScope
  email: string
  ip: string | null
}

export async function loginAttemptContext(
  scope: LoginScope,
  rawEmail: string,
): Promise<LoginAttemptContext> {
  return { scope, email: normalizeEmail(rawEmail), ip: clientIpFrom(await headers()) }
}

export type ThrottleBlock = { message: string; waitMs: number }

// Se llama ANTES de pedirle nada a Supabase Auth: si está frenado, no gastamos
// la llamada. Devuelve null si puede pasar.
//
// Devuelve también `waitMs` y no solo el texto porque la pantalla pinta una
// cuenta atrás en vivo: el mensaje suelto se quedaba congelado en la cifra del
// instante del rechazo y parecía un número arbitrario.
export async function throttleBlock(ctx: LoginAttemptContext): Promise<ThrottleBlock | null> {
  const [porCuenta, porIp] = await Promise.all([
    failureStatsByEmail(ctx.scope, ctx.email),
    ctx.ip ? failureStatsByIp(ctx.scope, ctx.ip) : Promise.resolve(null),
  ])

  const verdicts: ThrottleVerdict[] = [
    throttleCheck({ ...porCuenta, freeAttempts: ACCOUNT_FREE_ATTEMPTS }),
  ]
  if (porIp) verdicts.push(throttleCheck({ ...porIp, freeAttempts: IP_FREE_ATTEMPTS }))

  const verdict = strictest(...verdicts)
  if (verdict.allowed) return null
  return { message: throttleMessage(verdict.waitMs), waitMs: verdict.waitMs }
}

// Un fallo es cualquier login que no acaba en sesión válida y autorizada:
// también "credenciales buenas pero no eres admin". Si solo contáramos las
// contraseñas erróneas, probar una credencial robada contra el panel saldría
// gratis mientras el atacante no acertara el rol.
export function noteFailure(ctx: LoginAttemptContext): Promise<void> {
  return recordFailedLogin(ctx.scope, ctx.email, ctx.ip)
}

export function noteSuccess(ctx: LoginAttemptContext): Promise<void> {
  return clearFailedLogins(ctx.scope, ctx.email)
}
