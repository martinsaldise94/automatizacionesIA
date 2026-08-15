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
| ✅ | **Fuerza bruta en los logins.** No había ningún freno en `/auth` ni en `/admin/login`. Backoff exponencial por cuenta y por IP. | `lib/auth-throttle.ts`, `lib/login-guard.ts`, `0008` |
| ✅ | **Segundo factor (TOTP) obligatorio en el admin.** Una credencial de admin abre el panel de la agencia y, vía `canAccessPortal`, el portal de **todos** los tenants. | `lib/mfa.ts`, `app/admin/mfa/` |

### Logins: qué se ha hecho y por qué así

**Throttling, nunca bloqueo de cuenta.** Bloquear tras N fallos crea autoDoS: cualquiera que sepa tu email te deja fuera de tu propia plataforma, y no hay nadie que te desbloquee. El backoff es **lineal: 10s el primer frenazo, +10s por cada fallo más, tope 15min**. **Se cura solo** — ese tope es lo que lo hace throttling y no bloqueo.

**Lineal y no exponencial**, revisado tras probarlo: la exponencial mordía brutal enseguida (al sexto fallo ya eran 5 minutos), y quien falla seis veces seguidas es casi siempre una persona real hecha un lío, no un diccionario. Lo lineal es amable con ella y sigue siendo caro para el atacante, porque **hay que pagar todos los escalones**: el coste acumulado crece al cuadrado y 50 intentos ya suman más de tres horas de espera. Hay un test que lo fija.

**La pantalla muestra lo que QUEDA, con cuenta atrás en vivo** (`components/auth/ThrottleNotice.tsx`). Importa porque sin ella el número parecía aleatorio: el servidor devuelve el resto de la espera, así que tardar 8 segundos en teclear convertía un frenazo de 10 en un "espera 2". Era correcto e ilegible. Ahora baja sola y avisa cuando se puede reintentar.

**Los tres ámbitos se cuentan por separado** (`login_attempts.scope`): `admin` y `portal` para la contraseña de cada login, `mfa` para el reto del segundo factor. Si compartieran contador, fallar el código TOTP frenaría el login por contraseña y al revés — son ataques distintos.

**Por qué existe si Supabase Auth ya limita: sus límites son por IP.** Un credential stuffing repartido entre cientos de IPs contra **una** cuenta pasa por delante sin despeinarse. El contador por cuenta es complementario, no redundante. Los límites de Supabase siguen siendo la primera capa y no se tocan.

**Márgenes distintos por clave, a propósito:** 2 fallos libres por cuenta, 10 por IP. Una oficina con NAT comparte IP y un compañero torpe no debe dejar fuera a los demás.

**Cuenta como fallo también "credenciales buenas pero no autorizado".** Si solo contáramos las contraseñas erróneas, probar credenciales robadas contra el panel a ver cuál tiene rol admin saldría gratis.

**El contador vive en la DB (`login_attempts`), no en memoria.** En serverless cada instancia tiene su memoria y muere entre despliegues: bastaría reintentar hasta caer en una fría.

**Si esa tabla falla, se deja pasar — pero avisando.** Lo primero va contra el instinto y es deliberado: rechazar todos los logins ante una incidencia de Supabase convierte un problema de disponibilidad en una caída total del panel — autoDoS con más alcance que el ataque del que defiende. Debajo siguen los límites por IP de Supabase, la contraseña y el segundo factor.

Lo segundo se añadió después de tropezar con ello: **fallar en silencio es correcto, fallar en secreto no.** Sin la migración aplicada el throttle no frenaba nada y desde fuera se veía exactamente igual que si funcionara. Ahora escribe `[throttle] … Los logins NO están frenados. ¿Falta aplicar 0008?` en consola. Si alguna vez dudas de si el freno está vivo, falla un login y mira ahí.

**`ACCOUNT_FREE_ATTEMPTS` es literal:** con 2, el **tercer** intento ya espera. La comprobación corre antes de registrar el intento en curso, de ahí el `+1` en `backoffMs` — sin él salían tres gratis.

**El contador por IP es de refuerzo.** `x-forwarded-for` lo sobrescribe el proxy en un despliegue serio (Vercel), pero en otros entornos el cliente puede falsearla. La barrera que no se esquiva cambiando de cabecera es la de cuenta.

### MFA: alcance y el agujero que hay que conocer

**En el admin sí, en los dueños no.** El admin es la llave maestra y es un operador único: escanear un QR una vez. A los dueños —muchos, no técnicos— exigirles TOTP para editar su web generaría más soporte que ataques evitados; ahí la defensa es el throttling.

**Se comprueba en `requireAdmin()`, no solo al hacer login.** Una server action es alcanzable por POST directo: una sesión a medio elevar (contraseña sí, TOTP no) llegaría a ella sin pasar por la pantalla del código.

**⚠️ Trust on first use.** Mientras el admin no haya dado de alta su autenticador, quien llegue primero con la contraseña **puede enrolar el suyo**. Es el mismo compromiso que hace cualquier sistema que impone MFA sobre cuentas ya existentes, y sigue siendo mejor que no tener MFA — pero significa que **el alta no se deja pendiente**: se hace en el primer login tras desplegar esto.

**El alta del autenticador NO se genera en el render.** Se pidió una vez desde cliente (`EnrollTotp.tsx`) y se queda quieta. La primera versión creaba el QR dentro del Server Component y churneaba el secreto: cada render generaba uno nuevo y borraba el anterior, así que un refresco —o volver de un código mal tecleado— invalidaba el QR recién escaneado. El usuario acababa con varias entradas idénticas en su app y solo una válida, sin forma de distinguirlas. **Un código erróneo tampoco puede tirar el secreto**: `verifyEnrollment` devuelve resultado en vez de redirigir.

**El reto del TOTP también está frenado** (ámbito `mfa`). Matemáticamente casi no hacía falta —un TOTP son 10⁶ combinaciones y rota cada 30s, y Supabase limita `verify` por su cuenta— pero se cerró igual por dos razones: es la **última barrera** (quien llega ahí ya tiene la contraseña, que es justo cuando toca ser estricto) y el límite de Supabase no lo hemos podido verificar, así que la última defensa no se apoya en una suposición. La clave es el email del usuario ya autenticado, no uno tecleado: aquí no hay nada que enumerar.

**Coste asumido:** con el reto frenado, alguien que tenga tu contraseña puede quemar intentos aposta para hacerte esperar. Ya pasaba con el login y está acotado a 15 minutos.

**Si se pierde el autenticador y no se guardó la clave, la única salida es el Dashboard de Supabase** (borrar el factor del usuario). No hay códigos de recuperación: añadirlos es otra cosa que guardar y proteger, y con un operador único el Dashboard ya es esa salida.

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

- [ ] **Pendiente de aplicar en Supabase:** la migración `0008_login_attempts.sql`. Hasta entonces el throttle no guarda nada, la consulta falla en silencio y **los logins no están frenados** (fail-open documentado arriba). Aplicarla es lo primero.
- [ ] **Revisar en el Dashboard los límites propios de Supabase Auth** (Authentication → Rate Limits). Nuestro throttle los complementa, no los sustituye: los suyos son por IP y actúan antes de llegar a nuestro código. Comprobar que no están más laxos de lo que creemos.

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
