-- Profesores de prueba a distintas distancias del Obelisco (-34.6037, -58.3816).
-- Solo desarrollo LOCAL. Contraseña de todos: 123456. Se carga después de seed.sql.
-- Es idempotente: se puede volver a correr sobre una base existente sin duplicar nada.
--
-- Con la ubicación simulada en el Obelisco, cada filtro de la grilla debería mostrar:
--   50 m  -> Valentina (30 m) + Martín
--   100 m -> + Joaquín (90 m), Lucía
--   200 m -> + Camila (140 m), Federico (190 m), Esteban
--   500 m -> + Martina (260 m), Nicolás (340 m), Agustina (470 m)
--   Fuera de todos los filtros (solo en "Descubrir" o sin permiso de ubicación):
--            Tomás (650 m), Julieta (1,2 km), Lucas (2,5 km), Carolina (5 km), Diego (12 km)
--   Paula: sin ubicación, sin precio y sin fecha de nacimiento (caso de perfil incompleto).
--
-- La distancia que muestra la app sale redondeada a 50 m (ej. 140 m -> "150 m").

create temporary table tmp_teachers (
  id uuid,
  email text,
  name text,
  birth_date date,
  avatar text,
  bio text,
  cv text,
  hourly_rate numeric,
  subjects text[],
  north_m double precision, -- metros al norte del Obelisco (negativo = sur); null = sin ubicación
  east_m double precision   -- metros al este (negativo = oeste)
);

insert into tmp_teachers values
  ('bbbbbbbb-0000-0000-0000-000000000001', 'valentina@particuldando.com', 'Valentina Gómez', '1997-04-12',
   'https://randomuser.me/api/portraits/women/44.jpg',
   'Matemática para secundaria con ejercicios de parcial resueltos.',
   'Profesora de Matemática (ISP Joaquín V. González).', 12,
   array['Matemática', 'Física I'], 0, 30),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'joaquin@particuldando.com', 'Joaquín Pereyra', '1995-11-03',
   'https://randomuser.me/api/portraits/men/32.jpg',
   'Aprendé a programar desde cero con proyectos reales.',
   'Desarrollador backend, 6 años en la industria. Ayudante en Algoritmos (UBA).', 25,
   array['Programación', 'Python', 'Algoritmos'], -90, 0),
  ('bbbbbbbb-0000-0000-0000-000000000003', 'camila@particuldando.com', 'Camila Torres', '1999-02-20',
   'https://randomuser.me/api/portraits/women/65.jpg',
   'Química y Biología para el CBC y el secundario.',
   'Estudiante avanzada de Bioquímica (UBA).', 16,
   array['Química', 'Biología'], 0, -140),
  ('bbbbbbbb-0000-0000-0000-000000000004', 'federico@particuldando.com', 'Federico Díaz', '1988-07-30',
   'https://randomuser.me/api/portraits/men/75.jpg',
   'Historia y Geografía con mapas, líneas de tiempo y mucha charla.',
   'Profesor de Historia, 10 años en escuelas secundarias.', 10,
   array['Historia', 'Geografía'], 134, 134),
  ('bbbbbbbb-0000-0000-0000-000000000005', 'martina@particuldando.com', 'Martina López', '1996-09-14',
   'https://randomuser.me/api/portraits/women/12.jpg',
   'Inglés conversacional y preparación de exámenes internacionales.',
   'Traductora pública de inglés. Certificación CAE.', 14,
   array['Inglés B2', 'Conversación en inglés'], -260, 0),
  ('bbbbbbbb-0000-0000-0000-000000000006', 'nicolas@particuldando.com', 'Nicolás Romero', '1990-01-25',
   'https://randomuser.me/api/portraits/men/46.jpg',
   'Contabilidad y Economía para carreras de Ciencias Económicas.',
   'Contador Público (UBA). Docente en la FCE.', 20,
   array['Contabilidad', 'Economía'], 0, -340),
  ('bbbbbbbb-0000-0000-0000-000000000007', 'agustina@particuldando.com', 'Agustina Sosa', '1994-05-08',
   'https://randomuser.me/api/portraits/women/68.jpg',
   'Clases de piano para todas las edades, desde la primera nota.',
   'Pianista egresada del Conservatorio Manuel de Falla.', 18,
   array['Piano', 'Teoría musical'], 0, 470),
  ('bbbbbbbb-0000-0000-0000-000000000008', 'tomas@particuldando.com', 'Tomás Medina', '1992-12-01',
   'https://randomuser.me/api/portraits/men/22.jpg',
   'Análisis Matemático y Álgebra para primer año de ingeniería.',
   'Ingeniero Civil (UTN). Ayudante de cátedra en Análisis I.', 22,
   array['Análisis Matemático I', 'Álgebra'], 650, 0),
  ('bbbbbbbb-0000-0000-0000-000000000009', 'julieta@particuldando.com', 'Julieta Herrera', '1993-03-17',
   'https://randomuser.me/api/portraits/women/90.jpg',
   'Portugués para viajes, trabajo o el CELPE-Bras.',
   'Profesora de Portugués, viví 5 años en San Pablo.', 15,
   array['Portugués'], -849, -849),
  ('bbbbbbbb-0000-0000-0000-000000000010', 'lucas@particuldando.com', 'Lucas Acosta', '1987-08-22',
   'https://randomuser.me/api/portraits/men/52.jpg',
   'Física universitaria explicada con experimentos simples.',
   'Licenciado en Física (UBA). Investigador del CONICET.', 24,
   array['Física II', 'Electromagnetismo'], 0, 2500),
  ('bbbbbbbb-0000-0000-0000-000000000011', 'carolina@particuldando.com', 'Carolina Vega', '1985-10-05',
   'https://randomuser.me/api/portraits/women/33.jpg',
   'Lengua y Literatura: comprensión lectora y escritura.',
   'Licenciada en Letras. Correctora literaria.', 11,
   array['Lengua y Literatura'], 5000, 0),
  ('bbbbbbbb-0000-0000-0000-000000000012', 'diego@particuldando.com', 'Diego Ríos', '1991-06-19',
   'https://randomuser.me/api/portraits/men/85.jpg',
   'Dibujo técnico y AutoCAD para arquitectura y diseño.',
   'Arquitecto (FADU). 8 años usando AutoCAD y Revit.', 19,
   array['Dibujo técnico', 'AutoCAD'], 0, -12000),
  ('bbbbbbbb-0000-0000-0000-000000000013', 'paula@particuldando.com', 'Paula Méndez', null,
   'https://randomuser.me/api/portraits/women/21.jpg',
   'Apoyo escolar para primaria.',
   null, null,
   array['Apoyo escolar'], null, null);

-- Cuentas de Auth (el trigger crea public.users y teacher_profiles).
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change, email_change_token_new
)
select '00000000-0000-0000-0000-000000000000', t.id, 'authenticated', 'authenticated', t.email,
       extensions.crypt('123456', extensions.gen_salt('bf')), now(),
       '{"provider": "email", "providers": ["email"]}',
       jsonb_build_object('name', t.name, 'role', 'teacher', 'birth_date', t.birth_date),
       now(), now(), '', '', '', ''
from tmp_teachers t
on conflict (id) do nothing;

insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
select gen_random_uuid(), t.id, t.id::text,
       jsonb_build_object('sub', t.id::text, 'email', t.email, 'email_verified', true),
       'email', now(), now(), now()
from tmp_teachers t
on conflict (provider_id, provider) do nothing;

-- Perfil público.
update public.users u
set avatar_url = t.avatar, bio = t.bio
from tmp_teachers t
where u.id = t.id;

-- Precio, CV y ubicación. Metros -> grados: 1° lat ≈ 111.320 m; 1° lng ≈ 111.320 m · cos(lat).
update public.teacher_profiles tp
set hourly_rate = t.hourly_rate,
    cv = t.cv,
    location = case when t.north_m is null then null else
      extensions.st_setsrid(
        extensions.st_makepoint(
          -58.3816 + t.east_m / (111320 * cos(radians(-34.6037))),
          -34.6037 + t.north_m / 111320
        ),
        4326
      )::extensions.geography
    end
from tmp_teachers t
where tp.user_id = t.id;

-- Materias.
insert into public.subjects (name)
select distinct s from tmp_teachers t, unnest(t.subjects) as s
on conflict ((lower(name))) do nothing;

insert into public.teacher_subjects (teacher_id, subject_id)
select t.id, sub.id
from tmp_teachers t
cross join unnest(t.subjects) as s
join public.subjects sub on lower(sub.name) = lower(s)
on conflict do nothing;

-- Reseñas: Renata y Bautista (alumnos de seed.sql) ya tomaron una clase con estos profes.
-- Una reseña necesita una sesión de estudio cerrada, y la sesión, un match (like recíproco).
create temp table tmp_reviews (student uuid, teacher uuid, rating int, comment text);
insert into tmp_reviews values
  ('dddddddd-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', 5, 'Súper paciente.'),
  ('dddddddd-0000-0000-0000-000000000002', 'bbbbbbbb-0000-0000-0000-000000000001', 4, null),
  ('dddddddd-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000002', 5, 'Explica muy bien.'),
  ('dddddddd-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000003', 3, null),
  ('dddddddd-0000-0000-0000-000000000002', 'bbbbbbbb-0000-0000-0000-000000000004', 4, null),
  ('dddddddd-0000-0000-0000-000000000002', 'bbbbbbbb-0000-0000-0000-000000000005', 5, 'Aprobé el First.'),
  ('dddddddd-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000006', 2, 'Llegó tarde.'),
  ('dddddddd-0000-0000-0000-000000000002', 'bbbbbbbb-0000-0000-0000-000000000007', 5, null),
  ('dddddddd-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000008', 4, null),
  ('dddddddd-0000-0000-0000-000000000002', 'bbbbbbbb-0000-0000-0000-000000000009', 3, null),
  ('dddddddd-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000010', 5, null),
  ('dddddddd-0000-0000-0000-000000000002', 'bbbbbbbb-0000-0000-0000-000000000011', 4, null),
  ('dddddddd-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000012', 3, null);

insert into public.swipes (swiper_id, target_id, action)
select student, teacher, 'like' from tmp_reviews
union all
select teacher, student, 'like' from tmp_reviews
on conflict do nothing;

with s as (
  insert into public.study_sessions (match_id, proposed_by, proposed_at, started_at, end_requested_by, end_requested_at, ended_at, end_reason)
  select m.id, r.teacher, now() - interval '8 days', now() - interval '8 days' + interval '5 minutes', r.teacher,
         now() - interval '8 days' + interval '2 hours', now() - interval '8 days' + interval '3 hours', 'both'
  from tmp_reviews r
  join public.matches m on m.user_one_id = least(r.student, r.teacher) and m.user_two_id = greatest(r.student, r.teacher)
  where not exists (select 1 from public.study_sessions x where x.match_id = m.id)
  returning id, match_id
)
insert into public.reviews (session_id, reviewer_id, reviewee_id, rating, comment)
select s.id, r.student, r.teacher, r.rating, r.comment
from s
join public.matches m on m.id = s.match_id
join tmp_reviews r on m.user_one_id = least(r.student, r.teacher) and m.user_two_id = greatest(r.student, r.teacher);

drop table tmp_reviews;

drop table tmp_teachers;
