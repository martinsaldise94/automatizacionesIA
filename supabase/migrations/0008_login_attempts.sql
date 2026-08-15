-- ─── Freno a la fuerza bruta en los logins ───────────────────────────────────
--
-- Registro de intentos FALLIDOS de login, para el backoff exponencial de
-- `lib/auth-throttle.ts`. Solo fallos: un login correcto no interesa aquí y
-- guardarlo sería acumular un rastro de actividad sin necesitarlo.
--
-- Por qué en la DB y no en memoria: en serverless cada instancia tiene su
-- propia memoria y muere entre despliegues. Un contador en memoria daría
-- sensación de protección sin darla — bastaría con reintentar hasta caer en
-- una instancia fría.
--
-- Por qué hace falta si Supabase Auth ya limita: sus límites son POR IP. Un
-- credential stuffing repartido entre cientos de IPs contra UNA cuenta pasa por
-- delante sin despeinarse. Esta tabla permite frenar también por cuenta.
--
-- ⚠️ ESTA TABLA NO LLEVA `tenant_id`, Y ES CORRECTO. La invariante "toda tabla
-- de cliente lleva tenant_id + RLS" aplica a datos DE un cliente. Los logins
-- son transversales: el admin de la agencia no pertenece a ningún tenant, y el
-- mismo email podría ser dueño de varios. Meterle un tenant_id obligaría a
-- inventarse uno para el admin y partiría el contador por tenant, que es
-- justamente lo que el atacante querría.

create table if not exists login_attempts (
  id         bigserial   primary key,
  -- Ámbito del intento: 'admin' (panel de agencia) o 'portal' (dueño).
  -- Se separan para que un ataque al portal no frene el acceso del admin.
  scope      text        not null check (scope in ('admin', 'portal')),
  -- Email en minúsculas. Se guarda en claro a propósito: ya está en
  -- auth.users, así que hashearlo no reduce la exposición, solo la aparenta.
  email      text        not null,
  -- IP de origen. Puede ser null: detrás de según qué proxy no hay cabecera
  -- fiable, y preferimos un contador por cuenta sin IP a no contar nada.
  ip         text,
  created_at timestamptz not null default now()
);

-- Las dos consultas que hace el throttle: fallos recientes por cuenta y por IP.
-- `created_at desc` porque además del recuento necesita el más reciente.
create index if not exists login_attempts_email_idx
  on login_attempts (scope, email, created_at desc);

create index if not exists login_attempts_ip_idx
  on login_attempts (scope, ip, created_at desc);

-- Solo el service role toca esta tabla. Ni anon ni un usuario autenticado
-- tienen nada que hacer aquí: leerla sería una lista de emails con actividad
-- (enumeración de usuarios) y escribirla permitiría frenar a otro a voluntad,
-- que es el autoDoS que este diseño evita a propósito.
alter table login_attempts enable row level security;
revoke all on login_attempts from anon, authenticated;
revoke all on sequence login_attempts_id_seq from anon, authenticated;

-- Sin ninguna policy: con RLS activa y sin policies, nadie salvo el service
-- role (que la bypassa) puede leer ni escribir. Es deliberado, no un olvido.

-- Retención. Estos datos solo sirven durante la ventana del throttle (minutos);
-- conservarlos más es acumular IPs —dato personal— sin motivo. La limpieza la
-- dispara la propia escritura (lib/db/loginAttempts.ts), no un cron: no hay
-- crons de negocio en este proyecto.
comment on table login_attempts is
  'Intentos de login fallidos para el backoff de lib/auth-throttle.ts. Retencion 24h, limpieza oportunista al escribir. Sin tenant_id a proposito: los logins son transversales.';
