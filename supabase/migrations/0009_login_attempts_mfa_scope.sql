-- ─── Ámbito 'mfa' en login_attempts ──────────────────────────────────────────
--
-- El throttle de `0008` cubría la contraseña ('admin' y 'portal'). El reto del
-- segundo factor (/admin/mfa/challenge) quedaba fuera, apoyado solo en los
-- límites propios de Supabase Auth.
--
-- Se cierra porque es la ÚLTIMA barrera: quien llega a esa pantalla ya tiene la
-- contraseña. Ahí no se confía en un valor por defecto que no hemos verificado.
--
-- Va en un ámbito propio y no reutilizando 'admin': si compartieran contador,
-- fallar el código TOTP frenaría también el login por contraseña y al revés.
-- Son ataques distintos y se cuentan por separado.

alter table login_attempts
  drop constraint if exists login_attempts_scope_check;

alter table login_attempts
  add constraint login_attempts_scope_check
  check (scope in ('admin', 'portal', 'mfa'));
