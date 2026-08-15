// ─── Config shapes ────────────────────────────────────────────────────────────

export interface BrandingConfig {
  logo?: string        // URL en Supabase Storage
  primaryColor: string
  secondaryColor: string
  fontFamily?: string
}

export interface ContactConfig {
  phone?: string
  whatsapp?: string
  email?: string
  address?: string
  hours?: string
  social?: Record<string, string>
}

export interface SeoConfig {
  title: string
  description: string
  keywords?: string[]
}

export interface TenantConfig {
  template?: string
  branding: BrandingConfig
  contact: ContactConfig
  seo: SeoConfig
}

export interface FaqItem {
  q: string
  a: string
}

export interface TenantAiConfig {
  businessName: string
  tone: string
  services: string[]
  faqs: FaqItem[]
  handoffRules: string[]
  model?: string
}

// ─── Row types ───────────────────────────────────────────────────────────────

export type Tenant = {
  id: string
  slug: string
  domain: string | null
  name: string
  plan: 'tier_1' | 'tier_2' | 'tier_3'
  config: TenantConfig
  ai_config: TenantAiConfig
  status: 'setup' | 'active' | 'paused'
  owner_user_id: string | null
  created_at: string
}

export type Lead = {
  id: string
  tenant_id: string
  name: string | null
  email: string | null
  phone: string | null
  source: 'web' | 'whatsapp' | 'chat' | 'form'
  status: 'new' | 'qualified' | 'booked' | 'won' | 'lost'
  created_at: string
}

export type Booking = {
  id: string
  tenant_id: string
  lead_id: string | null
  service: string
  starts_at: string
  status: 'pending' | 'confirmed' | 'cancelled' | 'no_show'
  cal_event_id: string | null
  created_at: string
}

export type Message = {
  id: string
  tenant_id: string
  lead_id: string | null
  // Hilo de conversación (uuid v4 generado en SERVIDOR). Agrupa los turnos de
  // un visitante anónimo sin obligar a crear un lead; al derivar se rellena
  // `lead_id` en todo el hilo. Null en mensajes sueltos, como el texto del
  // formulario de contacto. Ver `0010_messages_conversation.sql`.
  conversation_id: string | null
  role: 'user' | 'assistant' | 'human'
  channel: 'web' | 'whatsapp'
  content: string
  created_at: string
}

export type Page = {
  id: string
  tenant_id: string
  path: string
  title: string
  draft_data: Record<string, unknown>
  published_data: Record<string, unknown> | null
  created_at: string
  updated_at: string
}

export type Post = {
  id: string
  tenant_id: string
  slug: string
  title: string
  excerpt: string | null
  cover_url: string | null
  content: string
  status: 'draft' | 'published'
  published_at: string | null
  created_at: string
  updated_at: string
}

// Intento de login FALLIDO. Alimenta el backoff de `lib/auth-throttle.ts`.
// Sin `tenant_id` a propósito: los logins son transversales (el admin no
// pertenece a ningún tenant). Ver el comentario de `0008_login_attempts.sql`.
export type LoginAttempt = {
  id: number
  scope: 'admin' | 'portal' | 'mfa'
  email: string
  ip: string | null
  created_at: string
}

// ─── Database type (usado por el cliente Supabase) ────────────────────────────
//
// Los Insert reflejan los DEFAULT y NULL del SQL: una columna con default o
// nullable es opcional al insertar. Mantener esto sincronizado con las
// migraciones evita los casts `as never` en escrituras.
// Para regenerar automáticamente cuando el CLI esté enlazado: `npm run db:types`.

// id y created_at los pone la DB; updated_at lo gestiona la DB/trigger.
type Insertable<Row, Required extends keyof Row> =
  Pick<Row, Required> & Partial<Omit<Row, Required | 'id' | 'created_at' | 'updated_at'>>

// supabase-js exige que cada tabla declare `Relationships` y que el schema
// tenga `Views`/`Functions`; sin esto el cliente resuelve Insert/Update a `never`.
type Table<Row, Required extends keyof Row> = {
  Row: Row
  Insert: Insertable<Row, Required>
  Update: Partial<Omit<Row, 'id' | 'created_at'>>
  Relationships: []
}

export interface Database {
  public: {
    Tables: {
      tenants:  Table<Tenant,  'slug' | 'name'>
      leads:    Table<Lead,    'tenant_id'>
      bookings: Table<Booking, 'tenant_id' | 'service' | 'starts_at'>
      messages: Table<Message, 'tenant_id' | 'role' | 'content'>
      pages:    Table<Page,    'tenant_id' | 'path' | 'title'>
      posts:    Table<Post,    'tenant_id' | 'slug' | 'title'>
      login_attempts: Table<LoginAttempt, 'scope' | 'email'>
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
