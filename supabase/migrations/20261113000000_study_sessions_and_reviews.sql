-- Sesiones de estudio + reseñas en los dos sentidos + filtro de lenguaje ofensivo.
--
-- Flujo:
--   1. Iniciar es de a dos: uno la propone (desde el chat) y el otro la acepta o dice "ahora no".
--      Así el profesor controla cuándo empieza, la proponga quien la proponga. Una propuesta
--      sin respuesta se cancela sola a las 24 h.
--   2. Para cerrarla tienen que terminarla LOS DOS: uno la termina y el otro confirma.
--   3. Si eso no pasa, se cierra sola a las 24 h: contadas desde que uno la terminó,
--      o desde que empezó si nadie la terminó.
--   4. Cerrada la sesión, cada uno puede calificar al otro una vez (1-5 estrellas + comentario).
--   5. Alumno y profesor ven las reseñas del otro: el profesor antes de aceptar una solicitud
--      y el alumno en el perfil del profesor.
--
-- El cierre por tiempo se calcula al leer (no hace falta un cron): una sesión está cerrada si
-- tiene ended_at o si ya pasó su límite. Las funciones que escriben la "materializan".
--
-- Promedio: cuenta la ÚLTIMA reseña de cada persona (varias clases con el mismo profe no
-- multiplican su voto).

-- =============================================================================
-- 1) Filtro de lenguaje ofensivo (comentarios de reseñas)
-- =============================================================================
-- Términos ya normalizados: minúsculas, sin tildes. Un '*' final = "y cualquier terminación"
-- (bolud* -> boludo, boluda, boludazo...). Se buscan como palabras enteras y toleran
-- letras repetidas ("putoooo"), signos entre letras ("p.u.t.o") y números por letras ("1d10t4").
-- La misma lista está en mobile/src/lib/moderation.ts (validación inmediata en la app):
-- si se agrega un término, agregarlo en los dos lados (acá, con una migración nueva).
create table public.blocked_terms (
  term text primary key check (term ~ '^[a-z]+( [a-z]+)*\*?$')
);
alter table public.blocked_terms enable row level security;
-- Sin grants: solo la leen las funciones de abajo.

insert into public.blocked_terms (term) values
  ('puto'), ('puta'), ('putos'), ('putas'), ('putita'), ('putito'), ('putear'), ('puteada'),
  ('hdp'), ('hdps'), ('lpm'), ('ctm'), ('lcdtm'),
  ('bolud*'), ('bolu'), ('pelotud*'), ('conchud*'), ('concha'),
  ('forro'), ('forra'), ('forros'), ('forras'),
  ('idiot*'), ('imbecil*'), ('estupido'), ('estupida'), ('estupidos'), ('estupidas'),
  ('tarado'), ('tarada'), ('tarados'), ('taradas'), ('mogolic*'), ('subnormal*'),
  ('retrasado mental'), ('retrasada mental'),
  ('pajer*'), ('choto'), ('chota'), ('sorete*'), ('garca'), ('garcas'), ('chanta'), ('chantas'),
  ('cagon'), ('cagona'), ('cagones'), ('mierda*'), ('cagada'), ('cagar'), ('cago'), ('cagaste'),
  ('verga'), ('pija'), ('poronga'), ('chupala'), ('chupame'), ('chupapija*'),
  ('culo'), ('culiad*'), ('culead*'), ('orto'), ('ojete'),
  ('trolo'), ('trola'), ('trolos'), ('trolas'), ('maricon*'), ('marica'), ('maricas'),
  ('villero'), ('villera'), ('villeros'), ('villeras'),
  ('zorra'), ('zorras'), ('perra'), ('cornud*'), ('carajo'), ('malparid*');

-- Texto -> minúsculas, sin tildes, números y símbolos usados como letras ("1d10t4" -> "idiota").
create function public.normalize_for_filter(p_text text) returns text
language sql stable set search_path = '' as $$
  select translate(
    extensions.unaccent('extensions.unaccent'::regdictionary, lower(coalesce(p_text, ''))),
    '0134@5$7', 'oieaasst'
  );
$$;

-- 'puto' -> '(^|[^a-z])p+[._*-]*u+[._*-]*t+[._*-]*o+($|[^a-z])'
create function public.blocked_term_pattern(p_term text) returns text
language sql immutable set search_path = '' as $$
  select '(^|[^a-z])'
    || string_agg(
         case when ch = ' ' then '[^a-z]+' else ch || '+' end,
         '[._*-]*' order by i
       )
    || case when right(p_term, 1) = '*' then '[a-z]*' else '' end
    || '($|[^a-z])'
  from unnest(string_to_array(rtrim(p_term, '*'), null)) with ordinality as t (ch, i);
$$;

-- ¿El texto tiene algún término bloqueado?
create function public.contains_blocked_terms(p_text text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.blocked_terms b
    where public.normalize_for_filter(p_text) ~ public.blocked_term_pattern(b.term)
  );
$$;

-- =============================================================================
-- 2) Sesiones de estudio
-- =============================================================================
create table public.study_sessions (
  id bigint generated always as identity primary key,
  match_id bigint not null references public.matches (id) on delete cascade,
  -- Quién la propuso y cuándo. Empieza cuando el otro la acepta (started_at).
  proposed_by uuid references public.users (id) on delete set null,
  proposed_at timestamptz not null default now(),
  started_at timestamptz,
  -- Primero que la terminó (falta que el otro confirme).
  end_requested_by uuid references public.users (id) on delete set null,
  end_requested_at timestamptz,
  -- Cierre definitivo: 'both' = la terminaron los dos; 'timeout' = pasaron las 24 h;
  -- 'cancelled' = la propuesta no se aceptó (nunca empezó: no se califica).
  ended_at timestamptz,
  end_reason text check (end_reason in ('both', 'timeout', 'cancelled')),
  check ((ended_at is null) = (end_reason is null)),
  check (end_requested_at is null or started_at is not null),
  check (end_reason is distinct from 'cancelled' or started_at is null)
);
-- Una sola sesión abierta por match.
create unique index study_sessions_one_open_idx on public.study_sessions (match_id) where ended_at is null;
create index study_sessions_match_idx on public.study_sessions (match_id, id desc);
comment on table public.study_sessions is
  'Sesiones de estudio de un match. Se escriben solo con las funciones *_study_session.';

-- Límite automático: 24 h desde el último paso (propuesta, inicio o pedido de terminar).
-- Si vence propuesta = se cancela; si vence empezada = se cierra ('timeout').
create function public.study_session_deadline(public.study_sessions)
returns timestamptz
language sql immutable set search_path = '' as $$
  select coalesce($1.end_requested_at, $1.started_at, $1.proposed_at) + interval '24 hours';
$$;

-- Matches del usuario actual (para RLS: se evalúa una vez por consulta).
create function public.my_match_ids()
returns setof bigint
language sql stable security definer set search_path = '' as $$
  select m.id from public.matches m where (select auth.uid()) in (m.user_one_id, m.user_two_id);
$$;

alter table public.study_sessions enable row level security;
-- Solo lectura (también para Realtime, grant al final); se escribe con las funciones.
create policy "study_sessions: ver las de mis matches" on public.study_sessions for select to authenticated
  using (match_id in (select public.my_match_ids()));

-- Cierra (por tiempo) las sesiones vencidas de un match.
create function public.close_expired_study_sessions(p_match_id bigint) returns void
language sql security definer set search_path = '' as $$
  update public.study_sessions s
  set ended_at = public.study_session_deadline(s),
      end_reason = case when s.started_at is null then 'cancelled' else 'timeout' end
  where s.match_id = p_match_id
    and s.ended_at is null
    and public.study_session_deadline(s) <= now();
$$;

-- El otro participante del match (null si el usuario actual no participa).
create function public.match_partner(p_match_id bigint) returns uuid
language sql stable security definer set search_path = '' as $$
  select case when m.user_one_id = (select auth.uid()) then m.user_two_id else m.user_one_id end
  from public.matches m
  where m.id = p_match_id and (select auth.uid()) in (m.user_one_id, m.user_two_id);
$$;

-- Propone iniciar una sesión (el otro la tiene que aceptar).
create function public.start_study_session(p_match_id bigint) returns bigint
language plpgsql security definer set search_path = '' as $$
declare
  v_other uuid := public.match_partner(p_match_id);
  v_id bigint;
begin
  if v_other is null or public.is_blocked_with(v_other) then
    raise exception 'No encontramos esta conversación';
  end if;
  perform public.close_expired_study_sessions(p_match_id);
  if exists (select 1 from public.study_sessions where match_id = p_match_id and ended_at is null) then
    raise exception 'Ya hay una sesión de estudio propuesta o en curso';
  end if;
  insert into public.study_sessions (match_id, proposed_by)
  values (p_match_id, (select auth.uid()))
  returning id into v_id;
  return v_id;
end;
$$;

-- Sesión abierta del usuario actual, bloqueada para modificarla (ya con los vencimientos al día).
create function public.lock_open_study_session(p_session_id bigint) returns public.study_sessions
language plpgsql security definer set search_path = '' as $$
declare
  v_s public.study_sessions;
begin
  select s.* into v_s from public.study_sessions s
  where s.id = p_session_id and s.match_id in (select public.my_match_ids())
  for update;
  if not found then
    raise exception 'No encontramos esta sesión';
  end if;
  perform public.close_expired_study_sessions(v_s.match_id);
  select s.* into v_s from public.study_sessions s where s.id = p_session_id;
  return v_s;
end;
$$;

-- El otro acepta la propuesta: la sesión empieza.
create function public.accept_study_session(p_session_id bigint) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_s public.study_sessions := public.lock_open_study_session(p_session_id);
begin
  if v_s.ended_at is not null then
    raise exception 'Esta propuesta ya no está vigente';
  elsif v_s.started_at is not null then
    return; -- ya había empezado
  elsif v_s.proposed_by = (select auth.uid()) then
    raise exception 'La otra persona tiene que aceptar la sesión';
  end if;
  update public.study_sessions set started_at = now() where id = p_session_id;
end;
$$;

-- Cancela una propuesta que todavía no empezó (quien la propuso, o el otro con "ahora no").
create function public.cancel_study_session(p_session_id bigint) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_s public.study_sessions := public.lock_open_study_session(p_session_id);
begin
  if v_s.ended_at is not null then
    return;
  elsif v_s.started_at is not null then
    raise exception 'La sesión ya empezó: para cerrarla, terminala';
  end if;
  update public.study_sessions set ended_at = now(), end_reason = 'cancelled' where id = p_session_id;
end;
$$;

-- Termina la sesión: la primera vez queda esperando al otro; cuando el otro también la
-- termina, se cierra. Devuelve true si quedó cerrada.
create function public.end_study_session(p_session_id bigint) returns boolean
language plpgsql security definer set search_path = '' as $$
declare
  v_me uuid := (select auth.uid());
  v_s public.study_sessions := public.lock_open_study_session(p_session_id);
begin
  if v_s.ended_at is not null then
    return v_s.end_reason <> 'cancelled';
  elsif v_s.started_at is null then
    raise exception 'La sesión todavía no empezó';
  end if;

  if v_s.end_requested_by is null then
    update public.study_sessions set end_requested_by = v_me, end_requested_at = now()
    where id = p_session_id;
    return false;
  elsif v_s.end_requested_by = v_me then
    return false; -- ya la había terminado: sigue esperando al otro
  else
    update public.study_sessions set ended_at = now(), end_reason = 'both'
    where id = p_session_id;
    return true;
  end if;
end;
$$;

-- =============================================================================
-- 3) Reseñas (alumno -> profesor y profesor -> alumno), una por sesión y por persona
-- =============================================================================
-- La tabla anterior (solo alumno -> profesor, sin sesión) se reemplaza: todavía no hay
-- datos reales (no hay proyecto en la nube).
drop table public.reviews;

create table public.reviews (
  id bigint generated always as identity primary key,
  session_id bigint not null references public.study_sessions (id) on delete cascade,
  reviewer_id uuid not null references public.users (id) on delete cascade,
  reviewee_id uuid not null references public.users (id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  comment text check (char_length(comment) between 1 and 500),
  created_at timestamptz not null default now(),
  unique (session_id, reviewer_id),
  check (reviewer_id <> reviewee_id)
);
create index reviews_reviewee_idx on public.reviews (reviewee_id, reviewer_id, created_at desc);

alter table public.reviews enable row level security;
create policy "reviews: ver todas" on public.reviews for select to authenticated using (true);
-- Sin insert/update/delete directos: se califica con submit_review().

-- Filtro de lenguaje (también protege contra inserts hechos por fuera de submit_review).
create function public.check_review_comment() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.comment := nullif(trim(new.comment), '');
  if new.comment is not null and public.contains_blocked_terms(new.comment) then
    raise exception 'Tu comentario tiene palabras ofensivas. Podés contar si no te gustó, pero con respeto.'
      using errcode = 'P0001', hint = 'offensive_language';
  end if;
  return new;
end;
$$;
create trigger reviews_check_comment before insert or update of comment on public.reviews
  for each row execute function public.check_review_comment();

-- Promedio y cantidad de reseñas de un usuario (la última de cada persona).
create function public.rating_summary(p_user_id uuid)
returns table (rating numeric, review_count integer)
language sql stable security definer set search_path = '' as $$
  select coalesce(round(avg(t.rating), 1), 0), count(*)::integer
  from (
    select distinct on (r.reviewer_id) r.rating
    from public.reviews r
    where r.reviewee_id = p_user_id
    order by r.reviewer_id, r.created_at desc
  ) t;
$$;

create function public.submit_review(p_session_id bigint, p_rating integer, p_comment text default null)
returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_me uuid := (select auth.uid());
  v_s public.study_sessions;
  v_other uuid;
begin
  select s.* into v_s from public.study_sessions s
  where s.id = p_session_id and s.match_id in (select public.my_match_ids());
  if not found then
    raise exception 'No encontramos esta sesión';
  end if;

  perform public.close_expired_study_sessions(v_s.match_id);
  select s.* into v_s from public.study_sessions s where s.id = p_session_id;
  if v_s.ended_at is null then
    raise exception 'Vas a poder calificar cuando termine la sesión de estudio';
  elsif v_s.end_reason = 'cancelled' then
    raise exception 'Esta sesión no llegó a empezar';
  end if;
  if exists (select 1 from public.reviews where session_id = p_session_id and reviewer_id = v_me) then
    raise exception 'Ya calificaste esta sesión';
  end if;
  if p_rating is null or p_rating not between 1 and 5 then
    raise exception 'Elegí de 1 a 5 estrellas';
  end if;

  v_other := public.match_partner(v_s.match_id);
  insert into public.reviews (session_id, reviewer_id, reviewee_id, rating, comment)
  values (p_session_id, v_me, v_other, p_rating, left(p_comment, 500));
end;
$$;

-- Última sesión de un match, con su estado efectivo (para la barra del chat).
create function public.get_study_session(p_match_id bigint)
returns table (
  id bigint,
  status text,
  proposed_by_me boolean,
  proposed_at timestamptz,
  started_at timestamptz,
  end_requested_by_me boolean,
  end_requested_at timestamptz,
  closes_at timestamptz,
  ended_at timestamptz,
  end_reason text,
  reviewed_by_me boolean
)
language sql stable security definer set search_path = '' as $$
  select s.id,
    case
      when coalesce(s.end_reason, case when d.deadline <= now() then
             case when s.started_at is null then 'cancelled' else 'timeout' end end) = 'cancelled'
        then 'cancelled'
      when s.ended_at is not null or d.deadline <= now() then 'closed'
      when s.started_at is null then 'proposed'
      when s.end_requested_at is not null then 'closing'
      else 'active'
    end,
    s.proposed_by = (select auth.uid()),
    s.proposed_at,
    s.started_at,
    case when s.end_requested_by is not null then s.end_requested_by = (select auth.uid()) end,
    s.end_requested_at,
    d.deadline,
    coalesce(s.ended_at, case when d.deadline <= now() then d.deadline end),
    coalesce(s.end_reason, case when d.deadline <= now() then
      case when s.started_at is null then 'cancelled' else 'timeout' end end),
    exists (
      select 1 from public.reviews r where r.session_id = s.id and r.reviewer_id = (select auth.uid())
    )
  from public.study_sessions s
  cross join lateral (select public.study_session_deadline(s) as deadline) d
  where s.match_id = p_match_id
    and s.match_id in (select public.my_match_ids())
  order by s.id desc
  limit 1;
$$;

-- Reseñas que recibió un usuario (la última de cada persona), de la más nueva a la más vieja.
create function public.user_reviews(p_user_id uuid, p_limit integer default 30)
returns table (
  id bigint,
  rating smallint,
  comment text,
  created_at timestamptz,
  reviewer_id uuid,
  reviewer_name text,
  reviewer_avatar_url text,
  reviewer_role text
)
language sql stable security definer set search_path = '' as $$
  select t.id, t.rating, t.comment, t.created_at, u.id, u.name, u.avatar_url, u.role
  from (
    select distinct on (r.reviewer_id) r.*
    from public.reviews r
    where r.reviewee_id = p_user_id
    order by r.reviewer_id, r.created_at desc
  ) t
  join public.users u on u.id = t.reviewer_id
  where (select auth.uid()) is not null
    and u.status = 'active'
    and not public.is_blocked_with(p_user_id)
  order by t.created_at desc
  limit least(greatest(coalesce(p_limit, 30), 1), 100);
$$;

-- Perfil público de cualquier usuario (alumno o profesor) con su puntaje.
create function public.get_public_profile(p_user_id uuid)
returns table (
  id uuid,
  name text,
  role text,
  avatar_url text,
  bio text,
  rating numeric,
  review_count integer
)
language sql stable security definer set search_path = '' as $$
  select u.id, u.name, u.role, u.avatar_url, coalesce(u.bio, ''), rs.rating, rs.review_count
  from public.users u
  cross join lateral public.rating_summary(u.id) rs
  where u.id = p_user_id
    and (select auth.uid()) is not null
    and u.status = 'active'
    and not public.is_blocked_with(u.id);
$$;

-- =============================================================================
-- 4) Funciones existentes que usan las reseñas
-- =============================================================================

-- Solicitudes recibidas: ahora con la bio y el puntaje del alumno (el profesor lo ve antes
-- de aceptar). Cambia el tipo de retorno: drop + create.
drop function public.incoming_requests();
create function public.incoming_requests()
returns table (
  student_id uuid,
  student_name text,
  student_avatar_url text,
  student_bio text,
  student_rating numeric,
  student_review_count integer,
  created_at timestamptz
)
language sql stable security definer set search_path = '' as $$
  select u.id, u.name, u.avatar_url, coalesce(u.bio, ''), rs.rating, rs.review_count, s.created_at
  from public.swipes s
  join public.users u on u.id = s.swiper_id
  cross join lateral public.rating_summary(u.id) rs
  where s.target_id = (select auth.uid())
    and s.action = 'like'
    and u.status = 'active'
    and not public.is_blocked_with(u.id)
    and not exists (
      select 1 from public.swipes r
      where r.swiper_id = (select auth.uid()) and r.target_id = s.swiper_id
    )
  order by s.created_at desc;
$$;

-- search_teachers: mismo cuerpo que en 20261112180000_subject_filter.sql, salvo el
-- promedio (ahora rating_summary: reviewee_id y la última reseña de cada persona).
create or replace function public.search_teachers(
  p_lat double precision default null,
  p_lng double precision default null,
  p_max_km double precision default null,
  p_query text default null,
  p_teacher_id uuid default null,
  p_only_unseen boolean default false,
  p_limit integer default 50,
  p_subject_id bigint default null
)
returns table (
  id uuid,
  name text,
  avatar_url text,
  age integer,
  subjects text[],
  hourly_rate numeric,
  rating numeric,
  review_count integer,
  bio text,
  cv text,
  distance_km double precision
)
language sql stable security definer set search_path = '' as $$
  with origin as (
    select case
      when p_lat between -90 and 90 and p_lng between -180 and 180
        then extensions.st_setsrid(extensions.st_makepoint(p_lng, p_lat), 4326)::extensions.geography
    end as g
  ),
  q as (
    select nullif(
      extensions.unaccent('extensions.unaccent'::regdictionary, lower(trim(coalesce(p_query, '')))),
      ''
    ) as text
  )
  select
    u.id,
    u.name,
    u.avatar_url,
    case when u.birth_date is not null
      then extract(year from age(u.birth_date))::integer end,
    coalesce(subj.names, '{}'::text[]),
    tp.hourly_rate,
    rs.rating,
    rs.review_count,
    coalesce(u.bio, ''),
    coalesce(tp.cv, ''),
    case when o.g is not null and tp.location is not null then
      greatest(0.05, round((extensions.st_distance(tp.location, o.g) / 1000 / 0.05)::numeric) * 0.05)::double precision
    end as distance_km
  from public.teacher_profiles tp
  join public.users u on u.id = tp.user_id
  cross join origin o
  cross join q
  left join lateral (
    select array_agg(s.name order by s.name) as names,
           string_agg(extensions.unaccent('extensions.unaccent'::regdictionary, lower(s.name)), ' ') as haystack
    from public.teacher_subjects ts
    join public.subjects s on s.id = ts.subject_id
    where ts.teacher_id = tp.user_id
  ) subj on true
  cross join lateral public.rating_summary(tp.user_id) rs
  where (select auth.uid()) is not null
    and u.status = 'active'
    and u.id <> (select auth.uid())
    and not public.is_blocked_with(u.id)
    and (p_teacher_id is null or u.id = p_teacher_id)
    and (
      p_subject_id is null
      or exists (
        select 1 from public.teacher_subjects ts
        where ts.teacher_id = tp.user_id and ts.subject_id = p_subject_id
      )
    )
    and (
      p_max_km is null or o.g is null
      or (tp.location is not null and extensions.st_dwithin(tp.location, o.g, p_max_km * 1000))
    )
    and (
      q.text is null
      or strpos(extensions.unaccent('extensions.unaccent'::regdictionary, lower(u.name)), q.text) > 0
      or strpos(coalesce(subj.haystack, ''), q.text) > 0
    )
    and (
      not p_only_unseen
      or not exists (
        select 1 from public.swipes s
        where s.swiper_id = (select auth.uid()) and s.target_id = u.id
      )
    )
  order by distance_km nulls last, u.name
  limit least(greatest(coalesce(p_limit, 50), 1), 100);
$$;

-- =============================================================================
-- 5) Permisos y Realtime
-- =============================================================================
-- Supabase da todos los permisos sobre las tablas nuevas a anon y authenticated (default
-- privileges). Se sacan y se deja solo la lectura (RLS decide qué filas).
revoke all on public.blocked_terms, public.study_sessions, public.reviews from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
grant select on public.study_sessions, public.reviews to authenticated;

-- Las funciones nuevas no son ejecutables por nadie salvo lo que se habilita abajo.
revoke execute on function
  public.normalize_for_filter(text),
  public.blocked_term_pattern(text),
  public.contains_blocked_terms(text),
  public.study_session_deadline(public.study_sessions),
  public.lock_open_study_session(bigint),
  public.accept_study_session(bigint),
  public.cancel_study_session(bigint),
  public.my_match_ids(),
  public.close_expired_study_sessions(bigint),
  public.match_partner(bigint),
  public.start_study_session(bigint),
  public.end_study_session(bigint),
  public.check_review_comment(),
  public.rating_summary(uuid),
  public.submit_review(bigint, integer, text),
  public.get_study_session(bigint),
  public.user_reviews(uuid, integer),
  public.get_public_profile(uuid),
  public.incoming_requests()
from public, anon, authenticated;

grant execute on function
  public.my_match_ids(),                       -- política RLS de study_sessions
  public.start_study_session(bigint),
  public.accept_study_session(bigint),
  public.cancel_study_session(bigint),
  public.end_study_session(bigint),
  public.submit_review(bigint, integer, text),
  public.get_study_session(bigint),
  public.user_reviews(uuid, integer),
  public.get_public_profile(uuid),
  public.incoming_requests()
to authenticated;

-- Cambios de la sesión en vivo (el otro inicia, termina o confirma).
alter publication supabase_realtime add table public.study_sessions;
