// Freno a la fuerza bruta en los logins. Lógica pura → testeable sin DB.
//
// THROTTLING, NUNCA BLOQUEO DE CUENTA. Decisión tomada y documentada en
// `references/security.md`: bloquear una cuenta tras N fallos crea autoDoS —
// cualquiera que sepa tu email te deja fuera de tu propia plataforma, y no hay
// nadie que te desbloquee. El backoff exponencial le cuesta segundos a una
// persona real y le tumba el diccionario al atacante, y **se cura solo**.
//
// Por qué existe esto si Supabase Auth ya tiene límites propios: los suyos son
// **por IP**. Un credential stuffing repartido entre cientos de IPs contra UNA
// cuenta pasa por delante de ellos sin despeinarse. El freno por cuenta es
// complementario, no redundante. (Los límites de Supabase siguen valiendo y no
// se tocan: son la primera capa.)

export const THROTTLE_WINDOW_MS = 15 * 60 * 1000

// Cuántos intentos salen gratis antes de frenar. Literal: con 2, el tercer
// intento ya espera. Distinto a propósito según la clave:
// - Por cuenta: estrecho. Un dueño real no falla tres veces seguidas.
// - Por IP: ancho. Una oficina con NAT comparte IP, y no queremos que un
//   compañero torpe deje fuera a los demás.
export const ACCOUNT_FREE_ATTEMPTS = 2
export const IP_FREE_ATTEMPTS = 10

// Escalera de espera: 10s el primer frenazo, y +10s por cada fallo más.
// 10 → 20 → 30 → 40… hasta el tope.
//
// Lineal y no exponencial a propósito. La exponencial mordía brutal enseguida
// (al sexto fallo ya eran 5 minutos), y quien más falla seis veces seguidas es
// una persona real hecha un lío, no un diccionario. Lo lineal es amable con
// ella y sigue siendo caro para el atacante: el coste ACUMULADO crece al
// cuadrado — 50 intentos cuestan ya más de tres horas de espera sumada.
const BACKOFF_STEP_MS = 10_000

// El tope es lo que convierte esto en throttling y no en bloqueo: por muchos
// fallos que se acumulen, la espera nunca crece más y siempre se cura sola.
export const MAX_BACKOFF_MS = 15 * 60 * 1000

export type ThrottleVerdict = { allowed: true } | { allowed: false; waitMs: number }

// Cuánto hay que esperar DESDE EL ÚLTIMO FALLO, dado cuántos van en la ventana.
export function backoffMs(failures: number, freeAttempts: number): number {
  // Un contador corrupto (NaN) se trata como "muchos fallos", no como cero:
  // ante un dato roto, el lado seguro es frenar.
  if (!Number.isFinite(failures)) return MAX_BACKOFF_MS

  // El `+ 1` es lo que hace que "2 intentos gratis" signifique literalmente
  // eso: con 2 fallos ya registrados, el TERCER intento espera. La comprobación
  // corre ANTES de registrar el intento en curso, así que sin el +1 saldrían
  // tres gratis en vez de dos.
  const over = failures - freeAttempts + 1
  if (over <= 0) return 0

  return Math.min(over * BACKOFF_STEP_MS, MAX_BACKOFF_MS)
}

export function throttleCheck(input: {
  failures: number
  msSinceLastFailure: number
  freeAttempts: number
}): ThrottleVerdict {
  const required = backoffMs(input.failures, input.freeAttempts)
  if (required === 0) return { allowed: true }

  // Reloj torcido, dato corrupto o fallo aún sin registrar → 0 esperado, que
  // exige la espera entera. Nunca al revés: un NaN no puede regalar el acceso.
  const waited = Number.isFinite(input.msSinceLastFailure)
    ? Math.max(0, input.msSinceLastFailure)
    : 0

  const remaining = required - waited
  return remaining <= 0 ? { allowed: true } : { allowed: false, waitMs: remaining }
}

// Combina los veredictos de varias claves (cuenta e IP). Gana el más severo.
export function strictest(...verdicts: ThrottleVerdict[]): ThrottleVerdict {
  const blocked = verdicts.filter((v): v is { allowed: false; waitMs: number } => !v.allowed)
  if (blocked.length === 0) return { allowed: true }
  return { allowed: false, waitMs: Math.max(...blocked.map((v) => v.waitMs)) }
}

// Mensaje para el usuario. NO menciona cuentas ni emails: el mismo texto sale
// para un email real y para uno inventado, así el login no sirve de oráculo
// para enumerar usuarios.
export function throttleMessage(waitMs: number): string {
  const segundos = Math.ceil(Math.max(0, waitMs) / 1000)

  if (segundos < 60) {
    return `Demasiados intentos fallidos. Espera ${segundos} ${segundos === 1 ? 'segundo' : 'segundos'} y vuelve a probar.`
  }

  const minutos = Math.ceil(segundos / 60)
  return `Demasiados intentos fallidos. Espera ${minutos} ${minutos === 1 ? 'minuto' : 'minutos'} y vuelve a probar.`
}
