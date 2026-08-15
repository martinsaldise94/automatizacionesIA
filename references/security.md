# Seguridad

Estado de la seguridad de la plataforma: qué está cerrado, qué sigue abierto y qué hay que decidir **antes** de abrir el autoservicio.

El riesgo nº1 del proyecto es una **fuga entre tenants**. Todo lo demás va después.

---

## Las cinco barreras

El aislamiento no depende de una sola cosa. Si una falla, las otras siguen en pie.

| # | Barrera | Dónde vive | Qué pasa si cae |
|---|---|---|---|
| 1 | El `tenant_id` se deriva del host **en servidor** | `proxy.ts` → `lib/tenant.ts` | El cliente elegiría de qué tenant es |
| 2 | Guards de autorización | `lib/portal-auth.ts`, `lib/admin-auth.ts`, `lib/guard.ts` | Sesión válida = acceso a todo |
| 3 | Toda query filtra por `tenant_id` | `lib/db/*.ts` | Un id acertado leería datos de otro cliente |
| 4 | RLS + privilegios de columna | `supabase/migrations/` | La `anon key` (que viaja al navegador) leería la DB |
| 5 | Validación server-side antes de escribir | zod en actions | Datos corruptos o inyectados en la web pública |

**Los claims de autorización viven en `app_metadata`, nunca en `user_metadata`.** `user_metadata` lo puede escribir el propio usuario desde el navegador. Probado en `tests/portalGuard.test.ts`.

---

## Trampas que ya nos han mordido

Escritas porque volverán a pasar.

### Un guard de layout NO protege una server action

Una server action es un **endpoint POST propio**, alcanzable sin renderizar la página que la contiene. `createTenant` se publicó sin `requireAdmin()` porque el layout de `/admin` "ya protegía".

**Regla:** toda action bajo `/admin` llama a `requireAdmin()` en su primera línea. Toda action del portal llama a `authorizePortal()`. Sin excepciones.

`tests/adminGuards.test.ts` lee el código fuente y falla si alguna se salta el guard. Ignora comentarios a propósito: un `// requireAdmin()` comentado no cuenta.

### RLS es por FILAS, no por columnas

Dos fugas reales cerradas por este motivo:

- **`0004`** — `tenants_public_read` dejaba a la `anon key` leer `ai_config` (prompt del agente, reglas de derivación) de **todos** los tenants activos vía la Data API. Cerrado con `GRANT` por columna.
- **`0006`** — `pages_public_read` dejaba a un dueño autenticado leer el `draft_data` de **otro** tenant. Cerrado quitando la policy y revocando `anon`.

**Regla:** una policy que permite leer la fila permite leer **todas** sus columnas. Si una tabla mezcla datos públicos y privados en la misma fila, hace falta `GRANT` por columna o la lectura va por service role.

### El service role salta RLS

`createServiceClient()` ignora todas las policies. Es correcto usarlo (el render público lo necesita), pero entonces **el filtro por `tenant_id` en la query es la única barrera**. Por eso toda función de `lib/db/` lleva `.eq('tenant_id', tenantId)`.

Nunca se importa desde un componente `'use client'`.

---

## Cerrado (revisión de seguridad, agosto 2026)

| | Qué | Dónde |
|---|---|---|
| ✅ | **Next 16.2.7 → 16.3.1.** Eliminaba 4 CVEs altos, dos críticos para este diseño: *proxy bypass en App Router con Turbopack* (el proxy **es** la frontera entre tenants) y *disclosure sin autenticar de endpoints de server functions* (el vector para llegar a una action sin guard). Se lleva también postcss, sharp y nanoid. | `package.json` |
| ✅ | **`createTenant` sin guard.** Cualquiera que alcanzara el endpoint creaba tenants, escribiendo con service role. Guard extraído a módulo compartido + test estructural. | `lib/admin-auth.ts`, `tests/adminGuards.test.ts` |
| ✅ | **Cabeceras de seguridad.** No había ninguna. Destaca `frame-ancestors 'self'`: sin ella, el portal se enmarca en un iframe y se le roba un clic al dueño logueado sobre "Borrar página" — el `confirm()` no protege de eso. | `next.config.ts` |
| ✅ | **Inyección en el JSON-LD.** `JSON.stringify` no escapa `<` ni `/`: un `</script>` en el nombre o la descripción del tenant cerraba la etiqueta y ejecutaba. | `lib/seo.ts` → `jsonLdScript` |

### Cabeceras: qué se aplica y qué no

`Content-Security-Policy` va **solo** con las directivas que no pueden romper nada: `frame-ancestors`, `base-uri`, `form-action`, `object-src`.

La CSP completa —con `script-src`— va en `Content-Security-Policy-Report-Only`. **No bloquea nada**, solo avisa en consola. Está así porque un `script-src` estricto necesita un nonce por petición, y el nonce se genera en `proxy.ts`, que es la frontera entre tenants y no se toca en el mismo cambio que arregla un CVE de bypass de proxy.

**Para promoverla a enforcing:**

1. Abre el builder con Puck, una página pública y un post del blog.
2. Mira la consola: cada violación te dice qué directiva falta.
3. Ajusta hasta que no salga ninguna.
4. Cambia la clave de la cabecera a `Content-Security-Policy` y borra la Report-Only.

`X-Frame-Options` es `SAMEORIGIN`, no `DENY`: **Puck renderiza su preview en un iframe same-origin** y `DENY` rompería el builder.

---

## Abierto

Por orden de riesgo.

- [ ] **Sin protección de fuerza bruta en los logins.** Ni `/auth` ni `/admin/login` limitan intentos. El admin es el objetivo goloso: una credencial entra al panel de la agencia y, vía `canAccessPortal`, al portal de **todos** los tenants.

  **Decisión tomada (agosto 2026):** *throttling*, **nunca bloqueo de cuenta**. El bloqueo crea autoDoS —te quedas fuera de tu propia plataforma sin nadie que te desbloquee—; el throttling exponencial por IP+cuenta te cuesta segundos y al atacante le tumba el diccionario. Salida fuera de banda si algo va mal: el Dashboard de Supabase.

  **Prioridad: MFA (TOTP) en el admin antes que su throttling.** Con segundo factor, el credential stuffing deja de importar aunque se filtre la contraseña; Supabase Auth lo soporta y el coste para un operador único es escanear un QR una vez. En los dueños es al revés: el throttling es la defensa principal (muchas cuentas, gente no técnica, contraseñas reutilizadas, sin MFA).

  **Comprobar primero:** Supabase Auth ya aplica límites propios en sus endpoints. Antes de escribir throttling a mano, mirar en el Dashboard qué hay y si basta con ajustarlo.
- [ ] **El MIME de las subidas lo declara el cliente.** `validateImageFile(file.type, ...)` valida lo que el navegador *dice* que es el archivo, no lo que es. Acotado por `allowed_mime_types` del bucket y por fijar `contentType` al subir, pero la comprobación real son los magic bytes.
- [ ] **Huecos en el matcher del proxy.** Excluye `_next/*` y `*.png|svg|jpg|...`; en esas rutas **el `x-tenant` del cliente no se borra**. Hoy no es explotable (ninguna ruta de servidor con esas extensiones). Trampa latente: el día que exista `app/algo.png/route.ts`, el header pasa sin sanear.
- [ ] **`posts_public_read` es innecesaria.** El blog renderiza por service role, así que `anon` no necesita leer `posts` directo. Anotado ya en `0006`. Least privilege: revocar.
- [ ] **Sin log de auditoría.** No hay registro de quién cambió qué. Con un admin que entra en todos los tenants, no es opcional — es requisito de RGPD antes que técnico.
- [ ] **`uuid` moderado vía Puck.** Arreglarlo exige bajar Puck a 0.13 (rotura). Solo afecta a `v3/v5/v6` con `buf`; Puck usa v4 para ids. Se acepta y se revisa cuando Puck actualice.

---

## Antes de abrir el autoservicio

**El autoservicio invierte el modelo de amenazas.** Hoy casi todo lo peligroso lo escribe el admin. Después lo escribe cualquiera con una tarjeta. Estos cuatro puntos se deciden **antes** de escribir código.

### 1. Aprovisionar en el webhook de pago, nunca en el redirect

El navegador vuelve del proveedor de pago con una URL que el usuario controla. Crear el tenant ahí = tenants gratis.

El tenant se crea cuando el proveedor lo confirma por **webhook con firma verificada**. El diseño ya encaja: `resolveTenant` exige `status='active'` y `resolveTenantForPortal` no, así que **el cliente monta su web en `setup` y solo se publica al cobrar**.

### 2. El `role` y el `tenant_id` los pone el servidor, siempre

Ya es así (`app_metadata`, solo escribible con service role). La tentación al abrir el registro será aceptar el `tenant_id` del formulario. Nunca.

### 3. Admin que lo ve todo ≠ admin invisible

`canAccessPortal` deja pasar al admin al portal de cualquier tenant, sin dejar rastro. Con clientes de pago y datos de sus usuarios dentro, eso necesita **modo de suplantación explícito y registrado**, no acceso silencioso.

### 4. Registro abierto = alguien alojará phishing en tu dominio

El día que cualquiera levante un `loquesea.tudominio.com` con builder y blog, alguien montará una copia de un banco. Hace falta ruta de baja rápida (`status='paused'` ya existe) y moderación.

Y los dos puntos abiertos de arriba —MIME declarado por el cliente, y todo campo de texto que acabe en el JSON-LD— dejan de ser teóricos: pasan a estar **controlados por un desconocido**.

---

## Al tocar código sensible

Antes de mergear cualquier cambio en `lib/db/`, `supabase/migrations/`, `lib/tenant.ts`, `proxy.ts`, guards, API routes o server actions:

1. ¿La query nueva filtra por `tenant_id`?
2. ¿La action nueva llama a su guard en la primera línea?
3. ¿La policy nueva expone columnas que no deberían salir de servidor?
4. ¿El dato nuevo del usuario acaba en HTML, en una URL o en un `<script>`?

El subagente `tenant-isolation-auditor` está para esto.
