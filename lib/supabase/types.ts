// ─── Config shapes ────────────────────────────────────────────────────────────

export interface BrandingConfig {
  logo?: string        // URL en Supabase Storage
  primaryColor: string
  secondaryColor: string
  fontFamily?: string
}

export interface BlockConfig {
  type: 'hero' | 'services' | 'pricing' | 'faq' | 'testimonials' | 'cta' | 'contact'
  props: Record<string, unknown>
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

export interface Tenant {
  id: string
  slug: string
  domain: string | null
  name: string
  plan: 'tier_1' | 'tier_2' | 'tier_3'
  config: TenantConfig
  ai_config: TenantAiConfig
  status: 'setup' | 'active' | 'paused'
  created_at: string
}

export interface Lead {
  id: string
  tenant_id: string
  name: string | null
  email: string | null
  phone: string | null
  source: 'web' | 'whatsapp' | 'chat' | 'form'
  status: 'new' | 'qualified' | 'booked' | 'won' | 'lost'
  created_at: string
}

export interface Booking {
  id: string
  tenant_id: string
  lead_id: string | null
  service: string
  starts_at: string
  status: 'pending' | 'confirmed' | 'cancelled' | 'no_show'
  cal_event_id: string | null
  created_at: string
}

export interface Message {
  id: string
  tenant_id: string
  lead_id: string | null
  role: 'user' | 'assistant' | 'human'
  channel: 'web' | 'whatsapp'
  content: string
  created_at: string
}

export interface Page {
  id: string
  tenant_id: string
  path: string
  title: string
  draft_data: Record<string, unknown>
  published_data: Record<string, unknown> | null
  created_at: string
  updated_at: string
}

export interface Post {
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

// ─── Database type (usado por el cliente Supabase) ────────────────────────────

export interface Database {
  public: {
    Tables: {
      tenants: {
        Row: Tenant
        Insert: Omit<Tenant, 'id' | 'created_at'>
        Update: Partial<Omit<Tenant, 'id' | 'created_at'>>
      }
      leads: {
        Row: Lead
        Insert: Omit<Lead, 'id' | 'created_at'>
        Update: Partial<Omit<Lead, 'id' | 'created_at'>>
      }
      bookings: {
        Row: Booking
        Insert: Omit<Booking, 'id' | 'created_at'>
        Update: Partial<Omit<Booking, 'id' | 'created_at'>>
      }
      messages: {
        Row: Message
        Insert: Omit<Message, 'id' | 'created_at'>
        Update: Partial<Omit<Message, 'id' | 'created_at'>>
      }
      pages: {
        Row: Page
        Insert: Omit<Page, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Page, 'id' | 'created_at'>>
      }
      posts: {
        Row: Post
        Insert: Omit<Post, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Post, 'id' | 'created_at'>>
      }
    }
  }
}
