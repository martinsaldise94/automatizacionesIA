# Builder visual (Puck)

El cliente monta y edita su web él mismo. El editor es **Puck** (`@measured/puck`, MIT, ya en `package.json`); los bloques son componentes React nuestros. Puck solo participa en la pantalla de edición — la web pública renderiza el JSON publicado en el servidor, sin editor ni JS extra.

**Antes de tocar código del builder: leer las docs de Puck (puckeditor.com/docs). No asumir su API de memoria.**

## Las piezas

```
lib/builder/config.tsx       # config de Puck: registro de bloques + campos. ÚNICA fuente de verdad
components/blocks/*          # los componentes React de cada bloque (puros, reciben props)
components/ui/*              # primitivos (Button, Section...) con CSS variables de branding
app/[tenant]/(portal)/builder  # el editor (requiere login de dueño)
app/[tenant]/[[...path]]       # render público de pages.published_data
```

## Modelo de datos: tabla `pages`

Una fila por página del tenant. Ver `data-model.md` para el schema completo. Lo importante:

- `draft_data` (jsonb) — el JSON de Puck que el cliente está editando. **Nunca se renderiza en público.**
- `published_data` (jsonb, nullable) — lo que ve el mundo. Solo se escribe al pulsar "Publicar".
- `path` — ruta de la página (`/`, `/servicios`...). Unique por tenant.

Flujo: editar → autoguardar en `draft_data` → "Publicar" → validación server-side → copia a `published_data`.

## Contrato de bloques

Cada bloque se registra en `lib/builder/config.tsx` con:
- **Campos editables**: texto, textarea, imagen, select de variante, color, arrays de items (servicios, FAQs...).
- **Variantes de layout** como campo select (ej. Hero: `centered` | `image-left` | `image-right`).
- **defaultProps** sensatos: un bloque recién arrastrado se ve bien sin configurar nada.

Reglas:
1. Un bloque es un componente React **puro**: recibe props, no consulta DB ni APIs.
2. Responsive móvil-primero siempre. Un bloque que se rompe en móvil no se mergea.
3. Branding por CSS variables (`var(--color-primary)`...), nunca colores hardcodeados.
4. El mismo componente sirve para editor y web pública. Sin forks.
5. Bloque nuevo = añadirlo a `components/blocks/` + registrarlo en la config. Disponible para todos los tenants automáticamente.

## Datos del tenant en bloques (Contact, Map, Testimonials-google)

Algunos bloques muestran datos que viven en el tenant (`config.contact`, reseñas de Google), **no en props editables**. Se inyectan con **React Context**: un `<TenantProvider>` envuelve tanto el editor `<Puck>` como el `<Render>` público; el bloque lee el contexto.

- **Decisión cerrada: Context, no el `metadata` de Puck** — evita acoplarse a la API interna de Puck y se comporta igual en editor y web pública.
- Estos datos **nunca van en las props guardadas** → no entran en `published_data` ni en la validación zod, y no son manipulables desde el JSON. Las props editables del bloque solo controlan el **layout** (ej. `variant` de Contact).
- Excepción consciente a la regla 1 ("componente puro"): estos bloques leen contexto, no DB/APIs directamente. El provider resuelve los datos server-side una sola vez.

## Seguridad

- **Validación al publicar (server-side, zod):** el JSON solo puede contener bloques registrados con props del shape correcto. Tamaño máximo del JSON limitado. Lo que no pasa, no se publica.
- **El editor exige sesión de dueño** (`app_metadata.tenant_id` del JWT == tenant de la URL) o de admin. RLS en `pages` refuerza a nivel de DB.
- **Imágenes:** suben a Supabase Storage en `tenants/{tenant_id}/`, con límite de tamaño y tipos permitidos (jpg/png/webp/svg-no). La policy de Storage aísla por carpeta de tenant.
- **Vídeo (`Video`) — dos fuentes, ambas seguras:**
  - `source: 'url'` → URL de YouTube/Vimeo. Se extrae el ID contra un **allowlist de hosts** y **construimos nosotros** el iframe (`youtube-nocookie.com/embed/ID`, `player.vimeo.com/video/ID`). **Jamás** se acepta "código embed" del usuario. Host no reconocido → placeholder, no se pinta.
  - `source: 'upload'` → archivo subido a Supabase Storage `tenants/{tenant_id}/` (reusa el uploader del Paso 8). Solo `mp4`/`webm`, **MIME validado server-side** (no por extensión), con límite de tamaño. Se sirve con `<video controls preload="metadata">`, sin JS. Tipo no permitido → rechazo en la subida.
  - Nota de coste: el vídeo self-hosted consume egress de Storage; para piezas largas, preferir URL. Es deuda de ancho de banda consciente.
- **RichText:** markdown con `react-markdown` **sin `rehype-raw`** → no procesa HTML crudo por defecto. Subset seguro; un `<script>` en el texto sale **escapado**, no ejecutado.
- **Nunca** un campo de bloque que acepte HTML/JS arbitrario (nada de "código embed" sin sanitizar).

## Tests de bloques

Se testea la **lógica que se rompe en silencio**, no el render trivial:
- **Sí:** parseo de URL de `Video` (válidas, raras, maliciosas), validación de tipo/MIME en la subida, sanitizado de `react-markdown` (`<script>` escapado), selección de fuente en `Testimonials`.
- **No:** "el `Hero` pinta un `<h1>`". Cobertura por cobertura es ruido.

## Plantillas

Una plantilla (`lib/templates/`) = un set de filas de `pages` con `draft_data`/`published_data` iniciales + branding por defecto. Al crear tenant: elegir plantilla → insertar sus pages → el cliente ya tiene web completa y la personaliza en el builder. Cambiar textos/fotos, añadir/quitar bloques, crear páginas nuevas: todo del lado del cliente.

## Blog

El blog **no usa Puck**: es un editor markdown simple en `(portal)/blog` sobre la tabla `posts` (ver `data-model.md`). Borrador/publicado igual que pages. El markdown se renderiza de forma segura en la web pública (sin HTML arbitrario). Los posts publicados entran en el sitemap.

## Diseño a medida

Si un cliente pide algo que los bloques no cubren: la agencia crea el bloque nuevo en `components/blocks/`, lo registra, y queda disponible para todos. Nunca una página hardcodeada para un cliente.
