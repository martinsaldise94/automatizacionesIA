import type { User } from '@supabase/supabase-js'

// Único punto de verdad para decidir si un usuario es admin de la plataforma.
// El rol vive en app_metadata.role = 'admin' — solo editable con service role,
// el cliente final nunca puede asignárselo a sí mismo.
export function isAdmin(user: User | null): boolean {
  return user?.app_metadata?.role === 'admin'
}
