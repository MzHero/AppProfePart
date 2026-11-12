-- Filtro por materia en "Cercanos" (desplegable).
--   * search_teachers: nuevo parámetro p_subject_id (materia exacta).
--   * available_subjects: materias con al menos un profesor visible, con cuántos hay
--     dentro del radio elegido (para mostrar el número en el desplegable).

-- Agregar un parámetro cambia la firma: hay que borrar la función y recrearla
-- (con CREATE OR REPLACE quedarían dos versiones y PostgREST no sabría cuál usar).
drop function public.search_teachers(
  double precision, double precision, double precision, text, uuid, boolean, integer
);

create function public.search_teachers(
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
    coalesce(round(rv.avg_rating, 1), 0),
    coalesce(rv.cnt, 0)::integer,
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
  left join lateral (
    select avg(r.rating) as avg_rating, count(*) as cnt
    from public.reviews r where r.teacher_id = tp.user_id
  ) rv on true
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

-- Materias para el desplegable: solo las que tienen algún profesor visible para el usuario.
-- teachers_in_range = cuántos de esos profesores están dentro del radio (todos si no hay ubicación).
create function public.available_subjects(
  p_lat double precision default null,
  p_lng double precision default null,
  p_max_km double precision default null
)
returns table (id bigint, name text, teachers_in_range integer)
language sql stable security definer set search_path = '' as $$
  with origin as (
    select case
      when p_lat between -90 and 90 and p_lng between -180 and 180
        then extensions.st_setsrid(extensions.st_makepoint(p_lng, p_lat), 4326)::extensions.geography
    end as g
  )
  select
    s.id,
    s.name,
    count(*) filter (
      where p_max_km is null or o.g is null
        or (tp.location is not null and extensions.st_dwithin(tp.location, o.g, p_max_km * 1000))
    )::integer
  from public.subjects s
  join public.teacher_subjects ts on ts.subject_id = s.id
  join public.teacher_profiles tp on tp.user_id = ts.teacher_id
  join public.users u on u.id = tp.user_id
  cross join origin o
  where (select auth.uid()) is not null
    and u.status = 'active'
    and u.id <> (select auth.uid())
    and not public.is_blocked_with(u.id)
  group by s.id, s.name
  order by s.name;
$$;

revoke execute on function
  public.search_teachers(double precision, double precision, double precision, text, uuid, boolean, integer, bigint),
  public.available_subjects(double precision, double precision, double precision)
from public, anon;
grant execute on function
  public.search_teachers(double precision, double precision, double precision, text, uuid, boolean, integer, bigint),
  public.available_subjects(double precision, double precision, double precision)
to authenticated;
