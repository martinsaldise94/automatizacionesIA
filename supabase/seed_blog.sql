-- Seed de desarrollo — posts del blog para `demo-clinica`
-- Ejecutar en Supabase → SQL Editor después de 0003_pages_posts.sql y de seed.sql.
--
-- Idempotente: se puede reejecutar sin duplicar (on conflict sobre (tenant_id, slug)).
--
-- Incluye un post en BORRADOR a propósito: sirve para verificar a mano que la web
-- pública no lo lista ni lo sirve por URL directa (debe dar 404).

-- ─── Post 1: con excerpt escrito a mano y portada ────────────────────────────
insert into posts (tenant_id, slug, title, excerpt, cover_url, content, status, published_at)
select
  t.id,
  'aliviar-dolor-lumbar-en-casa',
  'Cinco ejercicios para aliviar el dolor lumbar en casa',
  'Rutina de diez minutos que puedes hacer sin material. No sustituye a una valoración, pero alivia mientras llega tu cita.',
  'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=1200&q=80',
  $md$El dolor lumbar es el motivo de consulta **más frecuente** en nuestra clínica. En la mayoría de casos no hay nada estructural roto: hay musculatura sobrecargada y poco movimiento.

## Antes de empezar

Si el dolor baja por la pierna, notas hormigueo o has tenido un golpe fuerte, para y [pide cita](/contacto). Estos ejercicios son para molestias mecánicas del día a día.

## La rutina

1. **Báscula pélvica.** Tumbado boca arriba, rodillas dobladas. Aplasta la zona lumbar contra el suelo y suelta. 15 repeticiones.
2. **Rodilla al pecho.** Una pierna cada vez, 30 segundos. Sin tirar de golpe.
3. **Gato-camello.** A cuatro patas, arquea y redondea la espalda al ritmo de la respiración.
4. **Puente de glúteos.** Sube la cadera apretando el glúteo, no la lumbar. 12 repeticiones.
5. **Estiramiento de psoas.** Rodilla en el suelo, cadera adelante. 30 segundos por lado.

> Regla de oro: si un ejercicio aumenta el dolor, no es tu ejercicio hoy. Sáltalo.

## Cuánto tarda en notarse

La mayoría de pacientes nota mejoría en `2 o 3 semanas` haciendo la rutina a diario. Lo que no mejora es lo que no se hace: diez minutos constantes ganan a una hora suelta el domingo.

---

¿Llevas más de un mes con molestias? Eso ya no es una contractura pasajera. Escríbenos y lo valoramos.$md$,
  'published',
  now() - interval '3 days'
from tenants t
where t.slug = 'demo-clinica'
on conflict (tenant_id, slug) do update set
  title = excluded.title,
  excerpt = excluded.excerpt,
  cover_url = excluded.cover_url,
  content = excluded.content,
  status = excluded.status,
  published_at = excluded.published_at;

-- ─── Post 2: SIN excerpt → el resumen se deriva del cuerpo (postExcerpt) ─────
insert into posts (tenant_id, slug, title, excerpt, cover_url, content, status, published_at)
select
  t.id,
  'cuando-acudir-al-fisioterapeuta',
  '¿Cuándo hay que ir al fisioterapeuta y cuándo esperar?',
  null,
  null,
  $md$No todo dolor necesita una consulta, y esperar demasiado tampoco sale gratis. Esta es la regla que damos a nuestros pacientes.

## Espera unos días si

- El dolor apareció tras un esfuerzo puntual y va **a menos** cada día.
- Puedes hacer tu vida normal, aunque con molestia.
- Mejora con movimiento suave y calor.

## Pide cita ya si

- El dolor lleva **más de dos semanas** igual o a peor.
- Te despierta por la noche.
- Hay hormigueo, pérdida de fuerza o la zona se te "duerme".
- Es la tercera vez este año que te pasa lo mismo: ahí el problema no es el episodio, es el patrón.

## Qué pasa en la primera sesión

Valoramos, explicamos qué hemos encontrado y salimos con un plan. Nada de bonos de diez sesiones antes de saber qué te pasa.$md$,
  'published',
  now() - interval '10 days'
from tenants t
where t.slug = 'demo-clinica'
on conflict (tenant_id, slug) do update set
  title = excluded.title,
  excerpt = excluded.excerpt,
  cover_url = excluded.cover_url,
  content = excluded.content,
  status = excluded.status,
  published_at = excluded.published_at;

-- ─── Post 3: BORRADOR — no debe aparecer en la lista ni responder por URL ────
insert into posts (tenant_id, slug, title, excerpt, cover_url, content, status, published_at)
select
  t.id,
  'borrador-que-no-debe-verse',
  'BORRADOR: este post no debe salir en la web pública',
  'Si ves este texto en la web pública, hay una fuga de borradores.',
  null,
  $md$Contenido a medio escribir. La web pública solo sirve posts con `status = 'published'`.

Comprobación manual: `/blog` no debe listarlo y `/blog/borrador-que-no-debe-verse` debe devolver 404.$md$,
  'draft',
  null
from tenants t
where t.slug = 'demo-clinica'
on conflict (tenant_id, slug) do update set
  title = excluded.title,
  excerpt = excluded.excerpt,
  content = excluded.content,
  status = excluded.status,
  published_at = excluded.published_at;
