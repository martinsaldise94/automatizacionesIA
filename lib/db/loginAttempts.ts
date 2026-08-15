// ─── Capa de acceso a datos: tabla `login_attempts` ──────────────────────────
//
// ÚNICO sitio que toca la tabla del throttle de logins. Service role: la tabla
// tiene RLS activa y CERO policies a propósito, así que nadie más la ve.
//
// Todo aquí falla en SILENCIO y hacia el lado permisivo. Es deliberado y va en
// contra del instinto: si la DB del throttle se cae, la alternativa sería
// rechazar todos los logins, y eso convierte una incidencia de Supabase en una
// caída total del panel — un autoDoS con más alcance que el ataque del que nos
// defiende. El throttle es una capa de refuerzo; los límites por IP de Supabase
// Auth y la propia contraseña siguen en pie debajo.

import { createServiceClient } from '@/lib/supabase/service'
import { THROTTLE_WINDOW_MS } from '@/lib/auth-throttle'

// 'admin' y 'portal' = contraseña de cada login. 'mfa' = reto del segundo
// factor. Separados a propósito: si compartieran contador, fallar el código
// TOTP frenaría el login por contraseña y al revés. Ver `0009`.
export type LoginScope = 'admin' | 'portal' | 'mfa'

export type FailureStats = {
  failures: number
  msSinceLastFailure: number
}

// Sin fallos registrados → vía libre. Es también lo que devolvemos si la
// consulta revienta (ver cabecera).
const SIN_FALLOS: FailureStats = { failures: 0, msSinceLastFailure: Number.POSITIVE_INFINITY }

// Fallar en silencio es correcto (ver cabecera) pero fallar EN SECRETO no: sin
// esto, olvidarse de aplicar `0008` deja los logins sin frenar para siempre y
// desde fuera se ve exactamente igual que si funcionara. El aviso es lo único
// que distingue "no hay ataque" de "no hay protección".
function avisar(operacion: string, error: { message: string }): void {
  console.warn(
    `[throttle] ${operacion} falló: ${error.message}. ` +
      'Los logins NO están frenados. ¿Falta aplicar supabase/migrations/0008_login_attempts.sql?',
  )
}

// Cuánto se conserva. Pasada la ventana del throttle estos datos no sirven para
// nada y una IP es dato personal: no se guardan "por si acaso".
const RETENTION_MS = 24 * 60 * 60 * 1000

// Fallos dentro de la ventana para una clave (email o IP) + antigüedad del más
// reciente, que es lo que necesita `throttleCheck`.
async function statsFor(
  scope: LoginScope,
  column: 'email' | 'ip',
  value: string,
): Promise<FailureStats> {
  const since = new Date(Date.now() - THROTTLE_WINDOW_MS).toISOString()

  const supabase = createServiceClient()
  const { data, error, count } = await supabase
    .from('login_attempts')
    .select('created_at', { count: 'exact' })
    .eq('scope', scope)
    .eq(column, value)
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(1)

  if (error) {
    avisar(`consulta de fallos por ${column}`, error)
    return SIN_FALLOS
  }

  const ultimo = data?.[0]?.created_at
  return {
    failures: count ?? 0,
    msSinceLastFailure: ultimo ? Date.now() - new Date(ultimo).getTime() : Number.POSITIVE_INFINITY,
  }
}

export function failureStatsByEmail(scope: LoginScope, email: string): Promise<FailureStats> {
  return statsFor(scope, 'email', email)
}

export function failureStatsByIp(scope: LoginScope, ip: string): Promise<FailureStats> {
  return statsFor(scope, 'ip', ip)
}

export async function recordFailedLogin(
  scope: LoginScope,
  email: string,
  ip: string | null,
): Promise<void> {
  const supabase = createServiceClient()
  const { error } = await supabase.from('login_attempts').insert({ scope, email, ip })
  if (error) avisar('registro del intento fallido', error)

  // Limpieza oportunista en vez de cron (no hay crons de negocio en este
  // proyecto). Va sin `await`: purgar filas viejas no debe añadir latencia al
  // login de nadie, y si falla se reintentará en el siguiente fallo de login.
  const corte = new Date(Date.now() - RETENTION_MS).toISOString()
  void supabase
    .from('login_attempts')
    .delete()
    .lt('created_at', corte)
    .then(() => undefined)
}

// Tras un login correcto se borra el historial de esa cuenta: quien acaba de
// demostrar que es quien dice no debe arrastrar la penalización de los fallos
// previos. La IP no se limpia — ahí el atacante podría lavar su propio
// contador teniendo UNA cuenta válida.
export async function clearFailedLogins(scope: LoginScope, email: string): Promise<void> {
  const supabase = createServiceClient()
  await supabase.from('login_attempts').delete().eq('scope', scope).eq('email', email)
}
