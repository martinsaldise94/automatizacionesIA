import { createClient } from '@supabase/supabase-js'
import type { Database } from './types'

// Bypasa RLS. Usar solo en el servidor, nunca exponer al cliente.
// El tenant_id siempre debe resolverse en el servidor antes de llamar aquí.
export function createServiceClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}
