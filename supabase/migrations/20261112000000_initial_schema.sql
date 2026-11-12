-- =============================================================================
-- Particuldando — esquema inicial (Supabase)
--
-- Basado en database/schema.sql (Maximo Bayones). Cambios respecto de ese dump:
--   * users.id es el uuid de auth.users: el login lo maneja Supabase Auth, por eso
--     no hay password_hash. La fila de public.users se crea sola al registrarse
--     (trigger on_auth_user_created).
--   * users: + role (student|teacher), + birth_date, + bio (antes solo en
--     teacher_profiles; ahora la usan alumnos y profesores).
--   * + blocks y + reports (moderación, requisito de App Store / Play Store).
--   * subjects: nombre único sin distinguir mayúsculas.
--   * ON DELETE CASCADE en las relaciones con users, para poder eliminar la cuenta.
--   * PostGIS en el schema "extensions" (convención de Supabase).
--
-- Flujo de match (sobre las tablas de Maximo):
--   alumno da like  -> swipes (alumno -> profe, 'like')            = solicitud pendiente
--   profe acepta    -> swipes (profe -> alumno, 'like')            -> trigger crea matches + conversations
--   profe rechaza   -> swipes (profe -> alumno, 'pass')
--
-- Seguridad:
--   * RLS en todas las tablas. anon no tiene acceso a nada.
--   * Permisos por columna: nadie lee email/birth_date ajenos ni teacher_profiles.location.
--   * La ubicación exacta NUNCA sale de la base: las funciones devuelven distance_km
--     redondeada, y la ubicación del profesor se guarda redondeada (~100 m).
--   * Las lecturas con lógica (distancias, solicitudes, chats) son funciones RPC.
-- =============================================================================

create extension if not exists postgis with schema extensions;
create extension if not exists unaccent with schema extensions;

-- -----------------------------------------------------------------------------
-- Tablas
-- -----------------------------------------------------------------------------

create table public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null unique,
  name text not null check (char_length(name) between 1 and 100),
  role text not null check (role in ('student', 'teacher')),
  birth_date date check (birth_date > '1900-01-01' and birth_date < current_date),
  bio text check (char_length(bio) <= 280),
  avatar_url text,
  status text not null default 'active' check (status in ('active', 'suspended', 'deleted')),
  created_at timestamptz not null default now()
);
comment on table public.users is 'Perfil público de cada cuenta. id = auth.users.id.';

create table public.teacher_profiles (
  user_id uuid primary key references public.users (id) on delete cascade,
  cv text check (char_length(cv) <= 1000),
  hourly_rate numeric(10, 2) check (hourly_rate >= 0),
  -- Guardada redondeada (~100 m) por set_my_location. Nunca se expone al cliente.
  location extensions.geography(Point, 4326),
  updated_at timestamptz not null default now()
);
create index teacher_profiles_location_gist on public.teacher_profiles using gist (location);

create table public.subjects (
  id bigint generated always as identity primary key,
  name text not null check (char_length(name) between 1 and 60)
);
create unique index subjects_name_lower_key on public.subjects (lower(name));

create table public.teacher_subjects (
  teacher_id uuid not null references public.teacher_profiles (user_id) on delete cascade,
  subject_id bigint not null references public.subjects (id) on delete cascade,
  primary key (teacher_id, subject_id)
);
create index teacher_subjects_subject_idx on public.teacher_subjects (subject_id);

create table public.swipes (
  id bigint generated always as identity primary key,
  swiper_id uuid not null references public.users (id) on delete cascade,
  target_id uuid not null references public.users (id) on delete cascade,
  action text not null check (action in ('like', 'pass')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (swiper_id, target_id),
  check (swiper_id <> target_id)
);
create index swipes_target_idx on public.swipes (target_id, action);

create table public.matches (
  id bigint generated always as identity primary key,
  user_one_id uuid not null references public.users (id) on delete cascade,
  user_two_id uuid not null references public.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_one_id, user_two_id),
  check (user_one_id < user_two_id)
);
create index matches_user_two_idx on public.matches (user_two_id);

create table public.conversations (
  id bigint generated always as identity primary key,
  match_id bigint not null unique references public.matches (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.messages (
  id bigint generated always as identity primary key,
  conversation_id bigint not null references public.conversations (id) on delete cascade,
  sender_id uuid not null references public.users (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 2000),
  sent_at timestamptz not null default now(),
  read_at timestamptz
);
create index messages_conversation_sent_idx on public.messages (conversation_id, sent_at);

create table public.reviews (
  id bigint generated always as identity primary key,
  reviewer_id uuid not null references public.users (id) on delete cascade,
  teacher_id uuid not null references public.teacher_profiles (user_id) on delete cascade,
  match_id bigint references public.matches (id) on delete set null,
  rating smallint not null check (rating between 1 and 5),
  comment text check (char_length(comment) <= 1000),
  created_at timestamptz not null default now(),
  unique (reviewer_id, teacher_id)
);
create index reviews_teacher_idx on public.reviews (teacher_id);

create table public.blocks (
  blocker_id uuid not null references public.users (id) on delete cascade,
  blocked_id uuid not null references public.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);
create index blocks_blocked_idx on public.blocks (blocked_id);

create table public.reports (
  id bigint generated always as identity primary key,
  reporter_id uuid not null references public.users (id) on delete cascade,
  reported_id uuid not null references public.users (id) on delete cascade,
  reason text not null check (reason in ('spam', 'inappropriate', 'harassment', 'fake_profile', 'other')),
  details text check (char_length(details) <= 500),
  status text not null default 'open' check (status in ('open', 'reviewed', 'dismissed')),
  created_at timestamptz not null default now(),
  check (reporter_id <> reported_id)
);
comment on table public.reports is 'Reportes de usuarios. Solo se revisan con service_role (panel admin).';

-- -----------------------------------------------------------------------------
-- Funciones auxiliares (usadas por RLS y RPC)
-- -----------------------------------------------------------------------------

create function public.set_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger teacher_profiles_set_updated_at before update on public.teacher_profiles
  for each row execute function public.set_updated_at();

-- ¿Hay un bloqueo (en cualquier sentido) entre el usuario actual y p_other?
-- Solo responde sobre el usuario actual: no permite averiguar bloqueos entre terceros.
create function public.is_blocked_with(p_other uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.blocks b
    where (b.blocker_id = (select auth.uid()) and b.blocked_id = p_other)
       or (b.blocker_id = p_other and b.blocked_id = (select auth.uid()))
  );
$$;

-- ¿El usuario actual participa de la conversación (y no hay bloqueo de por medio)?
create function public.is_conversation_participant(p_conversation_id bigint) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1
    from public.conversations c
    join public.matches m on m.id = c.match_id
    where c.id = p_conversation_id
      and (select auth.uid()) in (m.user_one_id, m.user_two_id)
      and not public.is_blocked_with(
        case when m.user_one_id = (select auth.uid()) then m.user_two_id else m.user_one_id end
      )
  );
$$;

-- Reglas del swipe: el alumno likea profesores; el profesor solo puede responder
-- (like = aceptar, pass = rechazar) a alumnos que lo likearon.
create function public.can_swipe(p_target uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1
    from public.users me
    join public.users t on t.id = p_target
    where me.id = (select auth.uid())
      and me.status = 'active' and t.status = 'active'
      and not public.is_blocked_with(t.id)
      and (
        (me.role = 'student' and t.role = 'teacher')
        or (
          me.role = 'teacher' and t.role = 'student'
          and exists (
            select 1 from public.swipes s
            where s.swiper_id = t.id and s.target_id = me.id and s.action = 'like'
          )
        )
      )
  );
$$;

-- -----------------------------------------------------------------------------
-- Triggers de negocio
-- -----------------------------------------------------------------------------

-- Al registrarse en Supabase Auth se crea el perfil. Datos tomados de
-- options.data del signUp: { name, role, birth_date }.
create function public.handle_new_auth_user() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_role text := coalesce(new.raw_user_meta_data ->> 'role', 'student');
  v_name text := nullif(trim(new.raw_user_meta_data ->> 'name'), '');
  v_birth date;
begin
  if v_role not in ('student', 'teacher') then
    v_role := 'student';
  end if;
  begin
    v_birth := nullif(new.raw_user_meta_data ->> 'birth_date', '')::date;
  exception when others then
    v_birth := null;
  end;

  insert into public.users (id, email, name, role, birth_date)
  values (new.id, new.email, coalesce(v_name, split_part(new.email, '@', 1)), v_role, v_birth);

  if v_role = 'teacher' then
    insert into public.teacher_profiles (user_id) values (new.id);
  end if;
  return new;
end;
$$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_auth_user();

-- Like recíproco -> match + conversación.
create function public.handle_swipe() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_match_id bigint;
begin
  if new.action = 'like' and exists (
    select 1 from public.swipes s
    where s.swiper_id = new.target_id and s.target_id = new.swiper_id and s.action = 'like'
  ) then
    insert into public.matches (user_one_id, user_two_id)
    values (least(new.swiper_id, new.target_id), greatest(new.swiper_id, new.target_id))
    on conflict (user_one_id, user_two_id) do nothing
    returning id into v_match_id;

    if v_match_id is not null then
      insert into public.conversations (match_id) values (v_match_id);
    end if;
  end if;
  return new;
end;
$$;

create trigger swipes_after_write after insert or update of action on public.swipes
  for each row execute function public.handle_swipe();

-- -----------------------------------------------------------------------------
-- Permisos y RLS
-- -----------------------------------------------------------------------------

alter table public.users enable row level security;
alter table public.teacher_profiles enable row level security;
alter table public.subjects enable row level security;
alter table public.teacher_subjects enable row level security;
alter table public.swipes enable row level security;
alter table public.matches enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.reviews enable row level security;
alter table public.blocks enable row level security;
alter table public.reports enable row level security;

-- Partir de cero: sin acceso para anon ni authenticated; luego permisos explícitos.
revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;

-- users: columnas públicas (sin email ni birth_date). El perfil propio completo
-- se lee con get_my_profile().
grant select (id, name, role, bio, avatar_url, status, created_at) on public.users to authenticated;
grant update (name, bio, avatar_url, birth_date) on public.users to authenticated;
create policy "users: ver activos o a uno mismo" on public.users for select to authenticated
  using (status = 'active' or id = (select auth.uid()));
create policy "users: editar el propio" on public.users for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- teacher_profiles: location no se puede leer ni escribir directo (ver set_my_location).
grant select (user_id, cv, hourly_rate, updated_at) on public.teacher_profiles to authenticated;
grant update (cv, hourly_rate) on public.teacher_profiles to authenticated;
create policy "teacher_profiles: ver todos" on public.teacher_profiles for select to authenticated
  using (true);
create policy "teacher_profiles: editar el propio" on public.teacher_profiles for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- subjects / teacher_subjects: lectura libre; escritura vía set_my_subjects().
grant select on public.subjects, public.teacher_subjects to authenticated;
create policy "subjects: ver todas" on public.subjects for select to authenticated using (true);
create policy "teacher_subjects: ver todas" on public.teacher_subjects for select to authenticated using (true);

-- swipes: cada uno ve los que hizo y los que recibió. Escritura vía swipe().
grant select, insert on public.swipes to authenticated;
grant update (action, updated_at) on public.swipes to authenticated;
create policy "swipes: ver propios y recibidos" on public.swipes for select to authenticated
  using ((select auth.uid()) in (swiper_id, target_id));
create policy "swipes: crear propios" on public.swipes for insert to authenticated
  with check (swiper_id = (select auth.uid()) and public.can_swipe(target_id));
create policy "swipes: cambiar propios" on public.swipes for update to authenticated
  using (swiper_id = (select auth.uid()))
  with check (swiper_id = (select auth.uid()) and public.can_swipe(target_id));

-- matches / conversations: solo lectura para los participantes (los crea el trigger).
grant select on public.matches, public.conversations to authenticated;
create policy "matches: ver propios" on public.matches for select to authenticated
  using ((select auth.uid()) in (user_one_id, user_two_id));
create policy "conversations: ver propias" on public.conversations for select to authenticated
  using (public.is_conversation_participant(id));

-- messages: leer y escribir en conversaciones propias; marcar como leído lo recibido.
grant select, insert (conversation_id, sender_id, body) on public.messages to authenticated;
grant update (read_at) on public.messages to authenticated;
create policy "messages: ver de mis conversaciones" on public.messages for select to authenticated
  using (public.is_conversation_participant(conversation_id));
create policy "messages: enviar en mis conversaciones" on public.messages for insert to authenticated
  with check (sender_id = (select auth.uid()) and public.is_conversation_participant(conversation_id));
create policy "messages: marcar leídos los recibidos" on public.messages for update to authenticated
  using (sender_id <> (select auth.uid()) and public.is_conversation_participant(conversation_id))
  with check (sender_id <> (select auth.uid()) and public.is_conversation_participant(conversation_id));

-- reviews: lectura libre; solo reseña quien tuvo match con el profesor.
grant select, insert (reviewer_id, teacher_id, match_id, rating, comment) on public.reviews to authenticated;
grant update (rating, comment) on public.reviews to authenticated;
grant delete on public.reviews to authenticated;
create policy "reviews: ver todas" on public.reviews for select to authenticated using (true);
create policy "reviews: crear con match" on public.reviews for insert to authenticated
  with check (
    reviewer_id = (select auth.uid())
    and exists (
      select 1 from public.matches m
      where m.user_one_id = least(reviewer_id, teacher_id)
        and m.user_two_id = greatest(reviewer_id, teacher_id)
    )
  );
create policy "reviews: editar la propia" on public.reviews for update to authenticated
  using (reviewer_id = (select auth.uid())) with check (reviewer_id = (select auth.uid()));
create policy "reviews: borrar la propia" on public.reviews for delete to authenticated
  using (reviewer_id = (select auth.uid()));

-- blocks: cada uno gestiona sus bloqueos.
grant select, insert (blocker_id, blocked_id), delete on public.blocks to authenticated;
create policy "blocks: ver propios" on public.blocks for select to authenticated
  using (blocker_id = (select auth.uid()));
create policy "blocks: crear propios" on public.blocks for insert to authenticated
  with check (blocker_id = (select auth.uid()));
create policy "blocks: quitar propios" on public.blocks for delete to authenticated
  using (blocker_id = (select auth.uid()));

-- reports: solo crear. Se revisan con service_role.
grant insert (reporter_id, reported_id, reason, details) on public.reports to authenticated;
create policy "reports: crear propios" on public.reports for insert to authenticated
  with check (reporter_id = (select auth.uid()));

-- -----------------------------------------------------------------------------
-- Funciones RPC (las llama la app con supabase.rpc)
-- -----------------------------------------------------------------------------

-- Búsqueda de profesores: grilla por distancia, mazo de swipe y perfil individual.
-- Devuelve distance_km redondeada a 50 m (mínimo 50 m), nunca coordenadas.
create function public.search_teachers(
  p_lat double precision default null,
  p_lng double precision default null,
  p_max_km double precision default null,
  p_query text default null,
  p_teacher_id uuid default null,
  p_only_unseen boolean default false,
  p_limit integer default 50
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

-- Like / pass. Devuelve si se creó un match (cuando el profesor acepta).
create function public.swipe(p_target uuid, p_action text)
returns table (matched boolean, match_id bigint)
language plpgsql security invoker set search_path = '' as $$
declare
  v_me uuid := (select auth.uid());
begin
  insert into public.swipes (swiper_id, target_id, action)
  values (v_me, p_target, p_action)
  on conflict (swiper_id, target_id)
  do update set action = excluded.action, updated_at = now();

  return query
    select true, m.id
    from public.matches m
    where m.user_one_id = least(v_me, p_target) and m.user_two_id = greatest(v_me, p_target)
    union all
    select false, null::bigint
    where not exists (
      select 1 from public.matches m
      where m.user_one_id = least(v_me, p_target) and m.user_two_id = greatest(v_me, p_target)
    );
end;
$$;

-- Profesor: alumnos que lo likearon y todavía no respondió.
create function public.incoming_requests()
returns table (student_id uuid, student_name text, student_avatar_url text, created_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select u.id, u.name, u.avatar_url, s.created_at
  from public.swipes s
  join public.users u on u.id = s.swiper_id
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

-- Alumno: profesores que likeó y todavía no respondieron.
create function public.my_pending_requests()
returns table (teacher_id uuid, teacher_name text, teacher_avatar_url text, created_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select u.id, u.name, u.avatar_url, s.created_at
  from public.swipes s
  join public.users u on u.id = s.target_id
  where s.swiper_id = (select auth.uid())
    and s.action = 'like'
    and u.role = 'teacher'
    and u.status = 'active'
    and not public.is_blocked_with(u.id)
    and not exists (
      select 1 from public.swipes r
      where r.swiper_id = s.target_id and r.target_id = (select auth.uid())
    )
  order by s.created_at desc;
$$;

-- Lista de chats con el último mensaje.
create function public.my_conversations()
returns table (
  match_id bigint,
  conversation_id bigint,
  other_id uuid,
  other_name text,
  other_avatar_url text,
  other_role text,
  last_message_id bigint,
  last_message_body text,
  last_message_sender_id uuid,
  last_message_sent_at timestamptz,
  created_at timestamptz
)
language sql stable security definer set search_path = '' as $$
  select m.id, c.id, o.id, o.name, o.avatar_url, o.role,
         lm.id, lm.body, lm.sender_id, lm.sent_at, m.created_at
  from public.matches m
  join public.conversations c on c.match_id = m.id
  join public.users o
    on o.id = case when m.user_one_id = (select auth.uid()) then m.user_two_id else m.user_one_id end
  left join lateral (
    select msg.id, msg.body, msg.sender_id, msg.sent_at
    from public.messages msg
    where msg.conversation_id = c.id
    order by msg.sent_at desc, msg.id desc
    limit 1
  ) lm on true
  where (select auth.uid()) in (m.user_one_id, m.user_two_id)
    and o.status = 'active'
    and not public.is_blocked_with(o.id)
  order by coalesce(lm.sent_at, m.created_at) desc;
$$;

-- Un match puntual (encabezado del chat).
create function public.get_match(p_match_id bigint)
returns table (
  match_id bigint,
  conversation_id bigint,
  created_at timestamptz,
  student_id uuid,
  student_name text,
  student_avatar_url text,
  teacher_id uuid,
  teacher_name text,
  teacher_avatar_url text
)
language sql stable security definer set search_path = '' as $$
  -- a = user_one, b = user_two; el alumno es el que tiene role 'student'.
  select m.id, c.id, m.created_at,
         case when a.role = 'student' then a.id else b.id end,
         case when a.role = 'student' then a.name else b.name end,
         case when a.role = 'student' then a.avatar_url else b.avatar_url end,
         case when a.role = 'student' then b.id else a.id end,
         case when a.role = 'student' then b.name else a.name end,
         case when a.role = 'student' then b.avatar_url else a.avatar_url end
  from public.matches m
  join public.conversations c on c.match_id = m.id
  join public.users a on a.id = m.user_one_id
  join public.users b on b.id = m.user_two_id
  where m.id = p_match_id
    and (select auth.uid()) in (m.user_one_id, m.user_two_id)
    and not public.is_blocked_with(
      case when m.user_one_id = (select auth.uid()) then m.user_two_id else m.user_one_id end
    );
$$;

-- Perfil propio completo (incluye email y birth_date, que no son públicos).
create function public.get_my_profile()
returns table (
  id uuid,
  email text,
  name text,
  role text,
  birth_date date,
  bio text,
  avatar_url text,
  subjects text[],
  hourly_rate numeric,
  cv text,
  has_location boolean
)
language sql stable security definer set search_path = '' as $$
  select u.id, u.email, u.name, u.role, u.birth_date, u.bio, u.avatar_url,
         case when tp.user_id is null then null else coalesce(subj.names, '{}'::text[]) end,
         tp.hourly_rate, tp.cv, tp.location is not null
  from public.users u
  left join public.teacher_profiles tp on tp.user_id = u.id
  left join lateral (
    select array_agg(s.name order by s.name) as names
    from public.teacher_subjects ts join public.subjects s on s.id = ts.subject_id
    where ts.teacher_id = u.id
  ) subj on true
  where u.id = (select auth.uid());
$$;

-- Profesor: reemplaza sus materias (crea las que no existan).
create function public.set_my_subjects(p_names text[]) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_me uuid := (select auth.uid());
  v_names text[];
begin
  if not exists (select 1 from public.teacher_profiles where user_id = v_me) then
    raise exception 'Solo los profesores pueden cargar materias' using errcode = '42501';
  end if;

  select coalesce(array_agg(distinct n), '{}') into v_names
  from (
    select trim(x) as n from unnest(coalesce(p_names, '{}')) as x
    where char_length(trim(x)) between 1 and 60
  ) t;

  if cardinality(v_names) > 15 then
    raise exception 'Máximo 15 materias' using errcode = '22023';
  end if;

  insert into public.subjects (name)
  select n from unnest(v_names) as n
  on conflict ((lower(name))) do nothing;

  delete from public.teacher_subjects ts
  where ts.teacher_id = v_me
    and ts.subject_id not in (
      select s.id from public.subjects s where lower(s.name) in (select lower(n) from unnest(v_names) n)
    );

  insert into public.teacher_subjects (teacher_id, subject_id)
  select v_me, s.id from public.subjects s
  where lower(s.name) in (select lower(n) from unnest(v_names) n)
  on conflict do nothing;
end;
$$;

-- Profesor: guarda su ubicación redondeada a 3 decimales (~100 m).
create function public.set_my_location(p_lat double precision, p_lng double precision) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if p_lat is null or p_lng is null or p_lat not between -90 and 90 or p_lng not between -180 and 180 then
    raise exception 'Ubicación inválida' using errcode = '22023';
  end if;
  update public.teacher_profiles
  set location = extensions.st_setsrid(
        extensions.st_makepoint(round(p_lng::numeric, 3)::double precision, round(p_lat::numeric, 3)::double precision),
        4326
      )::extensions.geography
  where user_id = (select auth.uid());
end;
$$;

-- Eliminar la cuenta (requisito de Apple). Borra auth.users y todo cae en cascada.
-- Las fotos del bucket "avatars" las borra la app antes de llamar a esta función.
create function public.delete_my_account() returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_me uuid := (select auth.uid());
begin
  if v_me is null then
    raise exception 'No autenticado' using errcode = '42501';
  end if;
  delete from auth.users where id = v_me;
end;
$$;

-- Ninguna función es ejecutable por anon; solo las RPC y helpers de RLS por authenticated.
revoke execute on all functions in schema public from public, anon, authenticated;
grant execute on function
  public.is_blocked_with(uuid),
  public.is_conversation_participant(bigint),
  public.can_swipe(uuid),
  public.search_teachers(double precision, double precision, double precision, text, uuid, boolean, integer),
  public.swipe(uuid, text),
  public.incoming_requests(),
  public.my_pending_requests(),
  public.my_conversations(),
  public.get_match(bigint),
  public.get_my_profile(),
  public.set_my_subjects(text[]),
  public.set_my_location(double precision, double precision),
  public.delete_my_account()
to authenticated;

-- -----------------------------------------------------------------------------
-- Realtime (chat) y Storage (fotos de perfil)
-- -----------------------------------------------------------------------------

alter publication supabase_realtime add table public.messages;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

-- Cada usuario escribe solo en su carpeta: avatars/<user_id>/...
create policy "avatars: subir en carpeta propia" on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "avatars: reemplazar en carpeta propia" on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "avatars: borrar en carpeta propia" on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "avatars: listar carpeta propia" on storage.objects for select to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
