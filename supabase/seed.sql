-- Datos de prueba para desarrollo LOCAL (supabase start / supabase db reset).
-- NO se aplica en producción. Contraseña de todos: 123456
--
--   alumno@particuldando.com   Milton (alumno) — match aceptado con Martín, con un mensaje
--   sofia@particuldando.com    Sofía (alumna)  — solicitud pendiente a Martín
--   profe@particuldando.com    Martín Benítez (profesor)
--   lucia@particuldando.com    Lucía Fernández (profesora)
--   esteban@particuldando.com  Esteban Rojas (profesor)
--   renata@ / bautista@       Renata y Bautista (alumnos): ya tomaron clase con los profes de
--                              seeds/*.sql y les dejaron reseñas (no hace falta usarlos)
--
-- Los profesores están a ~45/95/190 m al norte del Obelisco (-34.6037, -58.3816), dentro de los filtros 50/100/200 m.
-- Más profesores a otras distancias: seeds/teachers_distances.sql
-- Para verlos con distancia en la app, simular esa ubicación en el emulador / navegador.

-- Usuarios de Auth (el trigger on_auth_user_created crea public.users y teacher_profiles).
with seed (id, email, meta) as (
  values
    ('11111111-1111-1111-1111-111111111111'::uuid, 'alumno@particuldando.com',
     '{"name": "Milton", "role": "student", "birth_date": "2005-03-14"}'::jsonb),
    ('22222222-2222-2222-2222-222222222222'::uuid, 'sofia@particuldando.com',
     '{"name": "Sofía Paz", "role": "student", "birth_date": "2006-08-02"}'::jsonb),
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1'::uuid, 'profe@particuldando.com',
     '{"name": "Martín Benítez", "role": "teacher", "birth_date": "1998-05-20"}'::jsonb),
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2'::uuid, 'lucia@particuldando.com',
     '{"name": "Lucía Fernández", "role": "teacher", "birth_date": "1994-01-11"}'::jsonb),
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3'::uuid, 'esteban@particuldando.com',
     '{"name": "Esteban Rojas", "role": "teacher", "birth_date": "2001-09-30"}'::jsonb),
    ('dddddddd-0000-0000-0000-000000000001'::uuid, 'renata@particuldando.com',
     '{"name": "Renata Ruiz", "role": "student", "birth_date": "2004-06-21"}'::jsonb),
    ('dddddddd-0000-0000-0000-000000000002'::uuid, 'bautista@particuldando.com',
     '{"name": "Bautista Herrera", "role": "student", "birth_date": "2003-11-05"}'::jsonb)
),
new_users as (
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, recovery_token, email_change, email_change_token_new
  )
  select '00000000-0000-0000-0000-000000000000', id, 'authenticated', 'authenticated', email,
         extensions.crypt('123456', extensions.gen_salt('bf')), now(),
         '{"provider": "email", "providers": ["email"]}', meta, now(), now(), '', '', '', ''
  from seed
  returning id, email
)
insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
select gen_random_uuid(), id, id::text,
       jsonb_build_object('sub', id::text, 'email', email, 'email_verified', true),
       'email', now(), now(), now()
from new_users;

-- Perfiles
update public.users set
  avatar_url = 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600',
  bio = 'Clases prácticas con resolución paso a paso de ejercicios.'
where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1';
update public.users set
  avatar_url = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=600',
  bio = 'Hago que las matemáticas difíciles se entiendan en la primera clase.'
where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2';
update public.users set
  avatar_url = 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=600',
  bio = 'Enfoque 100% conversacional e intensivo para entrevistas y exámenes.'
where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3';

update public.teacher_profiles set
  hourly_rate = 15,
  cv = 'Licenciado en Ciencias Físicas (UBA). 5 años dictando clases particulares y preparación para exámenes de ingreso.',
  location = extensions.st_setsrid(extensions.st_makepoint(-58.3816, -34.6033), 4326)::extensions.geography
where user_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1';
update public.teacher_profiles set
  hourly_rate = 20,
  cv = 'Ingeniera Electrónica con posgrado en docencia universitaria.',
  location = extensions.st_setsrid(extensions.st_makepoint(-58.3816, -34.60285), 4326)::extensions.geography
where user_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2';
update public.teacher_profiles set
  hourly_rate = 18,
  cv = 'Profesor de lengua inglesa certificado por Cambridge.',
  location = extensions.st_setsrid(extensions.st_makepoint(-58.3816, -34.6020), 4326)::extensions.geography
where user_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3';

-- Materias
insert into public.subjects (name) values
  ('Física I'), ('Química'), ('Matemática'), ('Cálculo'), ('Álgebra Lineal'),
  ('Inglés C1'), ('First Certificate');

insert into public.teacher_subjects (teacher_id, subject_id)
select t.teacher_id, s.id
from (values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1'::uuid, 'Física I'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1'::uuid, 'Química'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1'::uuid, 'Matemática'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2'::uuid, 'Cálculo'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2'::uuid, 'Álgebra Lineal'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3'::uuid, 'Inglés C1'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3'::uuid, 'First Certificate')
) as t (teacher_id, subject)
join public.subjects s on s.name = t.subject;

-- Milton <-> Martín: like recíproco (el trigger crea el match y la conversación).
insert into public.swipes (swiper_id, target_id, action) values
  ('11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1', 'like'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1', '11111111-1111-1111-1111-111111111111', 'like');

-- Sofía -> Martín: solicitud pendiente.
insert into public.swipes (swiper_id, target_id, action) values
  ('22222222-2222-2222-2222-222222222222', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1', 'like');

insert into public.messages (conversation_id, sender_id, body, sent_at)
select c.id, 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1', 'Hola! ¿Cuándo te viene bien la clase?', now() - interval '10 minutes'
from public.conversations c
join public.matches m on m.id = c.match_id
where m.user_one_id = least('11111111-1111-1111-1111-111111111111'::uuid, 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1'::uuid);

-- Sofía también tomó clases con Lucía y Esteban (matches viejos, para que tenga reseñas:
-- Martín las ve antes de aceptar su solicitud).
insert into public.swipes (swiper_id, target_id, action) values
  ('22222222-2222-2222-2222-222222222222', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2', 'like'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2', '22222222-2222-2222-2222-222222222222', 'like'),
  ('22222222-2222-2222-2222-222222222222', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3', 'like'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3', '22222222-2222-2222-2222-222222222222', 'like');

-- Sesiones de estudio ya cerradas por los dos, con reseñas en ambos sentidos.
create temp table seed_reviews (
  student uuid, teacher uuid, days_ago int,
  student_rating int, student_comment text,  -- alumno -> profesor
  teacher_rating int, teacher_comment text   -- profesor -> alumno
);
insert into seed_reviews values
  ('11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1', 3,
   4, 'Muy claro explicando. A veces va un poco rápido.',
   5, 'Muy buena predisposición, viene con las dudas preparadas.'),
  ('22222222-2222-2222-2222-222222222222', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2', 6,
   5, 'Excelente, explica con mucha paciencia.',
   5, 'Muy responsable y puntual.'),
  ('22222222-2222-2222-2222-222222222222', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3', 10,
   3, null,
   4, 'Buena alumna. Llegó un poco tarde a la clase.');

with s as (
  insert into public.study_sessions (match_id, proposed_by, proposed_at, started_at, end_requested_by, end_requested_at, ended_at, end_reason)
  select m.id, r.teacher,
         now() - make_interval(days => r.days_ago),
         now() - make_interval(days => r.days_ago) + interval '5 minutes',
         r.teacher, now() - make_interval(days => r.days_ago) + interval '2 hours',
         now() - make_interval(days => r.days_ago) + interval '2 hours 5 minutes', 'both'
  from seed_reviews r
  join public.matches m on m.user_one_id = least(r.student, r.teacher) and m.user_two_id = greatest(r.student, r.teacher)
  returning id, match_id, ended_at
)
insert into public.reviews (session_id, reviewer_id, reviewee_id, rating, comment, created_at)
select s.id, x.reviewer, x.reviewee, x.rating, x.comment, s.ended_at + interval '1 hour'
from s
join public.matches m on m.id = s.match_id
join seed_reviews r on least(r.student, r.teacher) = m.user_one_id and greatest(r.student, r.teacher) = m.user_two_id
cross join lateral (values
  (r.student, r.teacher, r.student_rating, r.student_comment),
  (r.teacher, r.student, r.teacher_rating, r.teacher_comment)
) as x (reviewer, reviewee, rating, comment);

drop table seed_reviews;
