// Segundo factor (TOTP) del panel de agencia. Lógica pura → testeable sin red.
//
// Por qué el admin y no los dueños: una credencial de admin entra al panel de la
// agencia y, vía `canAccessPortal`, al portal de TODOS los tenants. Es la llave
// maestra. Para un operador único el coste es escanear un QR una vez.
// En los dueños la defensa principal es el throttling (`lib/auth-throttle.ts`):
// son muchas cuentas, de gente no técnica, y exigirles TOTP para editar su web
// generaría más llamadas de soporte que ataques evitados.
//
// Los niveles los define Supabase Auth:
//   aal1 = contraseña verificada
//   aal2 = contraseña + segundo factor verificados EN ESTA SESIÓN
// `currentLevel` es lo que tiene la sesión; `nextLevel` es lo máximo a lo que
// puede llegar con los factores que el usuario tiene enrolados.

export type AalLevels = {
  currentLevel: string | null
  nextLevel: string | null
} | null

// 'ok'        → adelante
// 'challenge' → tiene autenticador; que teclee el código
// 'enroll'    → no tiene autenticador; que lo dé de alta
export type MfaGate = 'ok' | 'challenge' | 'enroll'

export function mfaGate(levels: AalLevels): MfaGate {
  // Sin factor enrolado (o sin poder averiguarlo) → enrolar.
  //
  // Ojo con la alternativa: rechazar en seco ante un error dejaría al admin
  // fuera de su propia plataforma sin nadie que le abra — el mismo autoDoS que
  // ya se descartó al elegir throttling en vez de bloqueo de cuenta. 'enroll'
  // no concede acceso por sí solo: para que la sesión suba a aal2 hay que
  // verificar un código del autenticador.
  if (levels?.nextLevel !== 'aal2') return 'enroll'

  // Tiene factor. ¿Lo ha usado en esta sesión?
  return levels.currentLevel === 'aal2' ? 'ok' : 'challenge'
}

// Forma mínima de un factor que nos interesa. No importamos el tipo de
// supabase-js aquí a propósito: este módulo no debe depender del SDK para
// poder testearse en frío.
export type MfaFactorLike = { id: string; status: string }

export function hasVerifiedTotp(factors: MfaFactorLike[] | null | undefined): boolean {
  return (factors ?? []).some((f) => f.status === 'verified')
}

// El código de 6 dígitos. Las apps lo muestran como "123 456" y la gente copia
// el espacio; se lo quitamos en vez de darle un error tonto.
//
// Devuelve string, NO número: `Number('000123')` es 123 y el código dejaría de
// valer. Los ceros a la izquierda son significativos.
export function normalizeTotpCode(raw: string): string | null {
  const clean = (raw ?? '').replace(/\s/g, '')
  return /^\d{6}$/.test(clean) ? clean : null
}
