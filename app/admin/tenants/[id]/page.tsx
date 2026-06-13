import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createServiceClient } from '@/lib/supabase/service'
import type { Tenant } from '@/lib/supabase/types'
import { updateBasic, updateConfig, updateAiConfig, inviteOwner, changeOwnerEmail } from './actions'

const STATUS_BADGE: Record<Tenant['status'], string> = {
  active: 'bg-green-100 text-green-700',
  setup:  'bg-yellow-100 text-yellow-700',
  paused: 'bg-red-100 text-red-700',
}

const inputCls = 'w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400'
const labelCls = 'block text-sm font-medium text-gray-700 mb-1'
const hintCls  = 'mt-1 text-xs text-gray-400'

export default async function TenantEditPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ ok?: string; error?: string }>
}) {
  const { id } = await params
  const { ok, error } = await searchParams

  const supabase = createServiceClient()
  const { data } = await supabase.from('tenants').select('*').eq('id', id).single()

  if (!data) notFound()
  const tenant = data as Tenant

  // Buscar usuario dueño por app_metadata.tenant_id (listUsers no filtra; escala pequeña)
  const { data: usersData } = await supabase.auth.admin.listUsers({ perPage: 1000 })
  const ownerUser = usersData?.users?.find(
    u => u.app_metadata?.tenant_id === id && u.app_metadata?.role === 'owner'
  ) ?? null

  const brandingRaw = tenant.config?.branding ?? {}
  const branding = {
    logo:           brandingRaw.logo           ?? '',
    primaryColor:   brandingRaw.primaryColor   ?? '#000000',
    secondaryColor: brandingRaw.secondaryColor ?? '#ffffff',
    fontFamily:     brandingRaw.fontFamily     ?? '',
  }
  const contactRaw = tenant.config?.contact ?? {}
  const contact = {
    phone:    contactRaw.phone    ?? '',
    whatsapp: contactRaw.whatsapp ?? '',
    email:    contactRaw.email    ?? '',
    address:  contactRaw.address  ?? '',
    hours:    contactRaw.hours    ?? '',
  }
  const seoRaw = tenant.config?.seo ?? {}
  const seo = {
    title:       seoRaw.title       ?? '',
    description: seoRaw.description ?? '',
    keywords:    seoRaw.keywords    ?? [],
  }
  const aiRaw    = tenant.ai_config        ?? {}
  const ai = {
    businessName:  aiRaw.businessName  ?? '',
    tone:          aiRaw.tone          ?? 'neutro',
    model:         aiRaw.model         ?? '',
    services:      aiRaw.services      ?? [],
    faqs:          aiRaw.faqs          ?? [],
    handoffRules:  aiRaw.handoffRules  ?? [],
  }

  const updateBasicAction    = updateBasic.bind(null, id)
  const updateConfigAction   = updateConfig.bind(null, id)
  const updateAiConfigAction = updateAiConfig.bind(null, id)
  const inviteOwnerAction       = inviteOwner.bind(null, id)
  const changeOwnerEmailAction  = changeOwnerEmail.bind(null, id)

  return (
    <div className="max-w-2xl space-y-8">

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm">
        <Link href="/admin/tenants" className="text-gray-400 hover:text-gray-600">← Tenants</Link>
        <span className="text-gray-300">/</span>
        <span className="font-semibold text-gray-900">{tenant.name}</span>
        <span className={`ml-2 inline-block px-2 py-0.5 rounded text-xs font-medium ${STATUS_BADGE[tenant.status]}`}>
          {tenant.status}
        </span>
      </div>

      {/* Feedback */}
      {error && (
        <div className="px-4 py-3 rounded bg-red-50 border border-red-200 text-red-700 text-sm">
          {error}
        </div>
      )}
      {ok && !error && (
        <div className="px-4 py-3 rounded bg-green-50 border border-green-200 text-green-700 text-sm">
          Guardado correctamente.
        </div>
      )}

      {/* ── Información básica ─────────────────────────────────────────────── */}
      <section className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-5">Información básica</h2>
        <form action={updateBasicAction} className="space-y-4">
          <div>
            <label htmlFor="name" className={labelCls}>Nombre del negocio</label>
            <input id="name" name="name" type="text" required defaultValue={tenant.name} className={inputCls} />
          </div>
          <div>
            <label htmlFor="domain" className={labelCls}>Dominio propio</label>
            <input
              id="domain" name="domain" type="text"
              defaultValue={tenant.domain ?? ''}
              placeholder="miclinica.com"
              className={inputCls}
            />
            <p className={hintCls}>Dejar vacío para usar solo el subdominio ({tenant.slug}.tudominio.com).</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="plan" className={labelCls}>Plan</label>
              <select id="plan" name="plan" defaultValue={tenant.plan} className={inputCls}>
                <option value="tier_1">tier_1 — Web Inteligente</option>
                <option value="tier_2">tier_2 — Web + Reservas</option>
                <option value="tier_3">tier_3 — Sistema Conectado</option>
              </select>
            </div>
            <div>
              <label htmlFor="status" className={labelCls}>Estado</label>
              <select id="status" name="status" defaultValue={tenant.status} className={inputCls}>
                <option value="setup">setup</option>
                <option value="active">active</option>
                <option value="paused">paused</option>
              </select>
            </div>
          </div>
          <div className="pt-2 flex justify-end">
            <SaveButton />
          </div>
        </form>
      </section>

      {/* ── Branding, contacto y SEO ───────────────────────────────────────── */}
      <section className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-5">Branding, contacto y SEO</h2>
        <form action={updateConfigAction} className="space-y-6">

          <fieldset>
            <legend className="text-sm font-medium text-gray-700 mb-3">Branding</legend>
            <div className="space-y-4">
              <div>
                <label htmlFor="branding.logo" className={labelCls}>URL del logo</label>
                <input
                  id="branding.logo" name="branding.logo" type="url"
                  defaultValue={branding.logo ?? ''}
                  placeholder="https://…"
                  className={inputCls}
                />
                <p className={hintCls}>URL pública de la imagen. Subirla a Supabase Storage y pegar la URL aquí.</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="branding.primaryColor" className={labelCls}>Color primario</label>
                  <div className="flex items-center gap-2">
                    <input
                      id="branding.primaryColor" name="branding.primaryColor" type="color"
                      defaultValue={branding.primaryColor}
                      className="h-9 w-16 cursor-pointer rounded border border-gray-300 p-0.5"
                    />
                    <span className="text-xs text-gray-400 font-mono">{branding.primaryColor}</span>
                  </div>
                </div>
                <div>
                  <label htmlFor="branding.secondaryColor" className={labelCls}>Color secundario</label>
                  <div className="flex items-center gap-2">
                    <input
                      id="branding.secondaryColor" name="branding.secondaryColor" type="color"
                      defaultValue={branding.secondaryColor}
                      className="h-9 w-16 cursor-pointer rounded border border-gray-300 p-0.5"
                    />
                    <span className="text-xs text-gray-400 font-mono">{branding.secondaryColor}</span>
                  </div>
                </div>
              </div>
              <div>
                <label htmlFor="branding.fontFamily" className={labelCls}>Tipografía</label>
                <input
                  id="branding.fontFamily" name="branding.fontFamily" type="text"
                  defaultValue={branding.fontFamily ?? ''}
                  placeholder="Inter, sans-serif"
                  className={inputCls}
                />
              </div>
            </div>
          </fieldset>

          <hr className="border-gray-100" />

          <fieldset>
            <legend className="text-sm font-medium text-gray-700 mb-3">Contacto</legend>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="contact.phone" className={labelCls}>Teléfono</label>
                <input id="contact.phone" name="contact.phone" type="text" defaultValue={contact.phone ?? ''} placeholder="+34 600 000 000" className={inputCls} />
              </div>
              <div>
                <label htmlFor="contact.whatsapp" className={labelCls}>WhatsApp</label>
                <input id="contact.whatsapp" name="contact.whatsapp" type="text" defaultValue={contact.whatsapp ?? ''} placeholder="+34 600 000 000" className={inputCls} />
              </div>
              <div>
                <label htmlFor="contact.email" className={labelCls}>Email</label>
                <input id="contact.email" name="contact.email" type="email" defaultValue={contact.email ?? ''} placeholder="hola@negocio.com" className={inputCls} />
              </div>
              <div>
                <label htmlFor="contact.hours" className={labelCls}>Horario</label>
                <input id="contact.hours" name="contact.hours" type="text" defaultValue={contact.hours ?? ''} placeholder="Lun–Vie 9:00–18:00" className={inputCls} />
              </div>
            </div>
            <div className="mt-4">
              <label htmlFor="contact.address" className={labelCls}>Dirección</label>
              <input id="contact.address" name="contact.address" type="text" defaultValue={contact.address ?? ''} placeholder="Calle Mayor 1, Madrid" className={inputCls} />
            </div>
          </fieldset>

          <hr className="border-gray-100" />

          <fieldset>
            <legend className="text-sm font-medium text-gray-700 mb-3">SEO</legend>
            <div className="space-y-4">
              <div>
                <label htmlFor="seo.title" className={labelCls}>Título</label>
                <input id="seo.title" name="seo.title" type="text" required defaultValue={seo.title} placeholder="Mi Negocio — Ciudad" className={inputCls} />
              </div>
              <div>
                <label htmlFor="seo.description" className={labelCls}>Descripción</label>
                <textarea
                  id="seo.description" name="seo.description" required rows={2}
                  defaultValue={seo.description}
                  placeholder="Descripción corta que aparece en Google (150–160 caracteres)."
                  className={`${inputCls} resize-none`}
                />
              </div>
              <div>
                <label htmlFor="seo.keywords" className={labelCls}>Keywords</label>
                <input
                  id="seo.keywords" name="seo.keywords" type="text"
                  defaultValue={(seo.keywords ?? []).join(', ')}
                  placeholder="restaurante madrid, tapas centro"
                  className={inputCls}
                />
                <p className={hintCls}>Separadas por coma.</p>
              </div>
            </div>
          </fieldset>

          <div className="pt-2 flex justify-end">
            <SaveButton />
          </div>
        </form>
      </section>

      {/* ── Agente IA ──────────────────────────────────────────────────────── */}
      <section className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-5">Agente IA</h2>
        <form action={updateAiConfigAction} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="businessName" className={labelCls}>Nombre del negocio</label>
              <input id="businessName" name="businessName" type="text" required defaultValue={ai.businessName} className={inputCls} />
            </div>
            <div>
              <label htmlFor="tone" className={labelCls}>Tono</label>
              <select id="tone" name="tone" defaultValue={ai.tone} className={inputCls}>
                <option value="neutro">Neutro</option>
                <option value="formal">Formal</option>
                <option value="cercano">Cercano</option>
                <option value="profesional">Profesional</option>
              </select>
            </div>
          </div>
          <div>
            <label htmlFor="model" className={labelCls}>Modelo</label>
            <select id="model" name="model" defaultValue={ai.model ?? 'claude-haiku-4-5-20251001'} className={inputCls}>
              <option value="claude-haiku-4-5-20251001">Haiku 4.5 (por defecto — rápido y barato)</option>
              <option value="claude-sonnet-4-6">Sonnet 4.6 (más capaz)</option>
            </select>
          </div>
          <div>
            <label htmlFor="services" className={labelCls}>Servicios</label>
            <textarea
              id="services" name="services" rows={3}
              defaultValue={ai.services.join('\n')}
              placeholder="Corte de pelo&#10;Coloración&#10;Manicura"
              className={`${inputCls} resize-none`}
            />
            <p className={hintCls}>Uno por línea.</p>
          </div>
          <div>
            <label htmlFor="handoffRules" className={labelCls}>Reglas de derivación</label>
            <textarea
              id="handoffRules" name="handoffRules" rows={3}
              defaultValue={ai.handoffRules.join('\n')}
              placeholder="Si preguntan por precio exacto, derivar a WhatsApp&#10;Si piden cita urgente, pasar a humano"
              className={`${inputCls} resize-none`}
            />
            <p className={hintCls}>Una por línea. Cuando el agente cumple una regla, pasa al humano.</p>
          </div>
          <div>
            <label htmlFor="faqs" className={labelCls}>FAQs</label>
            <textarea
              id="faqs" name="faqs" rows={6}
              defaultValue={ai.faqs.length ? JSON.stringify(ai.faqs, null, 2) : ''}
              placeholder={'[\n  {"q": "¿Dónde estáis?", "a": "En Calle Mayor 1, Madrid."}\n]'}
              className={`${inputCls} font-mono text-xs resize-y`}
            />
            <p className={hintCls}>JSON con formato <code>[{'{'}&#34;q&#34;:&#34;…&#34;,&#34;a&#34;:&#34;…&#34;{'}'}]</code>. Dejar vacío si no hay FAQs.</p>
          </div>
          <div className="pt-2 flex justify-end">
            <SaveButton />
          </div>
        </form>
      </section>

      {/* ── Usuario dueño ─────────────────────────────────────────────────────── */}
      <section className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-1">Usuario dueño</h2>
        <p className="text-xs text-gray-400 mb-5">
          Login del cliente para acceder al builder y al portal. Usa <code>app_metadata</code> (no modificable por el usuario).
        </p>

        {ownerUser ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                ownerUser.email_confirmed_at
                  ? 'bg-green-100 text-green-700'
                  : 'bg-yellow-100 text-yellow-700'
              }`}>
                {ownerUser.email_confirmed_at ? 'Acceso activo' : 'Invitación pendiente'}
              </span>
              <span className="text-sm text-gray-700">{ownerUser.email}</span>
            </div>
            {!ownerUser.email_confirmed_at && (
              <p className="text-xs text-gray-400">
                El cliente aún no ha aceptado la invitación. Pídele que revise su correo.
              </p>
            )}
            <hr className="border-gray-100" />
            <form action={changeOwnerEmailAction} className="space-y-3">
              <input type="hidden" name="userId" value={ownerUser.id} />
              <div>
                <label htmlFor="owner-new-email" className={labelCls}>Cambiar email</label>
                <input
                  id="owner-new-email"
                  name="email"
                  type="email"
                  required
                  placeholder={ownerUser.email ?? ''}
                  className={inputCls}
                />
                <p className={hintCls}>
                  El email anterior queda invalidado al instante. Si la invitación estaba pendiente, el cliente deberá usar el nuevo correo.
                </p>
              </div>
              <div className="flex justify-end">
                <button
                  type="submit"
                  className="bg-gray-900 text-white text-sm px-5 py-2 rounded hover:bg-gray-700 transition-colors"
                >
                  Cambiar email
                </button>
              </div>
            </form>
          </div>
        ) : (
          <form action={inviteOwnerAction} className="space-y-4">
            <div>
              <label htmlFor="owner-email" className={labelCls}>Email del cliente</label>
              <input
                id="owner-email"
                name="email"
                type="email"
                required
                placeholder="cliente@negocio.com"
                className={inputCls}
              />
              <p className={hintCls}>
                Supabase le enviará un email de invitación. Su JWT llevará <code>tenant_id</code> y <code>role: owner</code>.
              </p>
            </div>
            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                className="bg-blue-600 text-white text-sm px-5 py-2 rounded hover:bg-blue-500 transition-colors"
              >
                Enviar invitación
              </button>
            </div>
          </form>
        )}
      </section>

    </div>
  )
}

function SaveButton() {
  return (
    <button
      type="submit"
      className="bg-gray-900 text-white text-sm px-5 py-2 rounded hover:bg-gray-700 transition-colors"
    >
      Guardar
    </button>
  )
}
