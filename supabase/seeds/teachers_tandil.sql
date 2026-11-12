-- Profesores de prueba en TANDIL (provincia de Buenos Aires).
-- Solo desarrollo LOCAL. Contraseña de todos: 123456. Se carga después de seed.sql.
-- Idempotente: se puede volver a correr sobre una base existente sin duplicar nada.
--
-- Están en puntos públicos y conocidos de la ciudad (coordenadas aproximadas), repartidos
-- para probar distancias cortas y largas según dónde estés:
--   Centro (Plaza Independencia) · Campus UNICEN · Parque Independencia · Lago del Fuerte ·
--   Terminal · Estación de trenes · Hospital Santamarina · Villa Italia · Piedra Movediza ·
--   Cerro El Centinela · Villa del Lago.
-- Dos de ellos están en la misma manzana de la plaza (a ~40 y ~120 m) para probar los filtros
-- chicos (50 / 100 / 200 m) estando en el centro.

create temporary table tmp_tandil (
  id uuid,
  email text,
  name text,
  birth_date date,
  avatar text,
  bio text,
  cv text,
  hourly_rate numeric,
  subjects text[],
  lat double precision,
  lng double precision
);

insert into tmp_tandil values
  ('cccccccc-0000-0000-0000-000000000001', 'sofiaq@particuldando.com', 'Sofía Quiroga', '1996-02-11',
   'https://randomuser.me/api/portraits/women/57.jpg',
   'Matemática y Física para secundaria, a dos cuadras de la plaza.',
   'Profesora de Matemática (ISFD N° 10 Tandil).', 13,
   array['Matemática', 'Física I'], -37.32135, -59.13310),          -- Plaza Independencia (~40 m)
  ('cccccccc-0000-0000-0000-000000000002', 'matias@particuldando.com', 'Matías Iturralde', '1993-06-27',
   'https://randomuser.me/api/portraits/men/41.jpg',
   'Inglés para chicos y adultos, con material propio.',
   'Profesor de Inglés (UNICEN). Certificación Cambridge C2.', 15,
   array['Inglés B2', 'Inglés C1'], -37.32275, -59.13240),          -- Centro (~120 m de la plaza)
  ('cccccccc-0000-0000-0000-000000000003', 'florencia@particuldando.com', 'Florencia Arrieta', '1998-10-04',
   'https://randomuser.me/api/portraits/women/26.jpg',
   'Programación y Algoritmos para Ingeniería de Sistemas.',
   'Estudiante avanzada de Ingeniería de Sistemas (UNICEN). Ayudante en Programación I.', 18,
   array['Programación', 'Algoritmos', 'Python'], -37.32630, -59.08380), -- Campus UNICEN
  ('cccccccc-0000-0000-0000-000000000004', 'ignacio@particuldando.com', 'Ignacio Ferreyra', '1990-03-15',
   'https://randomuser.me/api/portraits/men/64.jpg',
   'Análisis Matemático y Álgebra para primer año.',
   'Licenciado en Matemática (UNICEN). Docente en Exactas.', 20,
   array['Análisis Matemático I', 'Álgebra'], -37.32510, -59.08720), -- Campus UNICEN
  ('cccccccc-0000-0000-0000-000000000005', 'rocio@particuldando.com', 'Rocío Bustamante', '1995-12-09',
   'https://randomuser.me/api/portraits/women/79.jpg',
   'Química y Biología para el ingreso a Veterinaria.',
   'Médica Veterinaria (UNICEN).', 16,
   array['Química', 'Biología'], -37.33200, -59.14000),             -- Parque Independencia
  ('cccccccc-0000-0000-0000-000000000006', 'julian@particuldando.com', 'Julián Echeverría', '1988-08-30',
   'https://randomuser.me/api/portraits/men/18.jpg',
   'Guitarra criolla y eléctrica, todos los niveles.',
   'Músico y profesor de guitarra, 12 años de experiencia.', 14,
   array['Guitarra', 'Teoría musical'], -37.34180, -59.13550),      -- Lago del Fuerte
  ('cccccccc-0000-0000-0000-000000000007', 'carla@particuldando.com', 'Carla Montes', '1992-04-22',
   'https://randomuser.me/api/portraits/women/50.jpg',
   'Contabilidad e Impuestos para Ciencias Económicas.',
   'Contadora Pública (UNICEN).', 19,
   array['Contabilidad', 'Economía'], -37.31220, -59.14070),        -- Terminal de ómnibus
  ('cccccccc-0000-0000-0000-000000000008', 'bruno@particuldando.com', 'Bruno Lagos', '1999-01-18',
   'https://randomuser.me/api/portraits/men/29.jpg',
   'Física para secundaria y CBC, con mucha práctica.',
   'Estudiante de Física (UNICEN).', 11,
   array['Física I', 'Física II'], -37.30930, -59.12430),           -- Estación de trenes
  ('cccccccc-0000-0000-0000-000000000009', 'valeria@particuldando.com', 'Valeria Sáenz', '1986-07-07',
   'https://randomuser.me/api/portraits/women/8.jpg',
   'Biología y Anatomía para carreras de salud.',
   'Licenciada en Enfermería. Docente en la Escuela de Salud.', 17,
   array['Biología', 'Anatomía'], -37.31750, -59.14840),            -- Hospital Santamarina
  ('cccccccc-0000-0000-0000-000000000010', 'gaston@particuldando.com', 'Gastón Peralta', '1991-11-02',
   'https://randomuser.me/api/portraits/men/71.jpg',
   'Historia y Geografía con salidas por la ciudad.',
   'Profesor de Historia (ISFD N° 10).', 10,
   array['Historia', 'Geografía'], -37.33300, -59.12000),           -- Villa Italia
  ('cccccccc-0000-0000-0000-000000000011', 'luciana@particuldando.com', 'Luciana Ferro', '1997-05-29',
   'https://randomuser.me/api/portraits/women/36.jpg',
   'Portugués e Italiano para viajes y estudio.',
   'Traductora. Viví 3 años en Florianópolis.', 15,
   array['Portugués', 'Italiano'], -37.30670, -59.16660),           -- Piedra Movediza
  ('cccccccc-0000-0000-0000-000000000012', 'ramiro@particuldando.com', 'Ramiro Ibáñez', '1984-09-13',
   'https://randomuser.me/api/portraits/men/90.jpg',
   'Dibujo técnico y AutoCAD para Arquitectura e Ingeniería.',
   'Arquitecto. 10 años con AutoCAD y Revit.', 21,
   array['Dibujo técnico', 'AutoCAD'], -37.36100, -59.14500),       -- Cerro El Centinela
  ('cccccccc-0000-0000-0000-000000000013', 'abril@particuldando.com', 'Abril Correa', '2000-03-08',
   'https://randomuser.me/api/portraits/women/72.jpg',
   'Apoyo escolar para primaria y primeros años de secundaria.',
   'Estudiante del Profesorado de Educación Primaria.', 9,
   array['Apoyo escolar', 'Lengua y Literatura'], -37.35000, -59.15200); -- Villa del Lago

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
from tmp_tandil t
on conflict (id) do nothing;

insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
select gen_random_uuid(), t.id, t.id::text,
       jsonb_build_object('sub', t.id::text, 'email', t.email, 'email_verified', true),
       'email', now(), now(), now()
from tmp_tandil t
on conflict (provider_id, provider) do nothing;

update public.users u
set avatar_url = t.avatar, bio = t.bio
from tmp_tandil t
where u.id = t.id;

update public.teacher_profiles tp
set hourly_rate = t.hourly_rate,
    cv = t.cv,
    location = extensions.st_setsrid(extensions.st_makepoint(t.lng, t.lat), 4326)::extensions.geography
from tmp_tandil t
where tp.user_id = t.id;

insert into public.subjects (name)
select distinct s from tmp_tandil t, unnest(t.subjects) as s
on conflict ((lower(name))) do nothing;

insert into public.teacher_subjects (teacher_id, subject_id)
select t.id, sub.id
from tmp_tandil t
cross join unnest(t.subjects) as s
join public.subjects sub on lower(sub.name) = lower(s)
on conflict do nothing;

-- Reseñas variadas de los alumnos de prueba.
insert into public.reviews (reviewer_id, teacher_id, rating, comment)
select r.reviewer, r.teacher, r.rating, r.comment
from (values
  ('11111111-1111-1111-1111-111111111111'::uuid, 'cccccccc-0000-0000-0000-000000000001'::uuid, 5, 'Me salvó el parcial.'),
  ('22222222-2222-2222-2222-222222222222'::uuid, 'cccccccc-0000-0000-0000-000000000002'::uuid, 4, null),
  ('11111111-1111-1111-1111-111111111111'::uuid, 'cccccccc-0000-0000-0000-000000000003'::uuid, 5, 'Re clara explicando.'),
  ('22222222-2222-2222-2222-222222222222'::uuid, 'cccccccc-0000-0000-0000-000000000004'::uuid, 4, null),
  ('11111111-1111-1111-1111-111111111111'::uuid, 'cccccccc-0000-0000-0000-000000000005'::uuid, 3, null),
  ('22222222-2222-2222-2222-222222222222'::uuid, 'cccccccc-0000-0000-0000-000000000006'::uuid, 5, null),
  ('11111111-1111-1111-1111-111111111111'::uuid, 'cccccccc-0000-0000-0000-000000000007'::uuid, 4, null),
  ('22222222-2222-2222-2222-222222222222'::uuid, 'cccccccc-0000-0000-0000-000000000008'::uuid, 3, null),
  ('11111111-1111-1111-1111-111111111111'::uuid, 'cccccccc-0000-0000-0000-000000000009'::uuid, 5, null),
  ('22222222-2222-2222-2222-222222222222'::uuid, 'cccccccc-0000-0000-0000-000000000010'::uuid, 4, null),
  ('11111111-1111-1111-1111-111111111111'::uuid, 'cccccccc-0000-0000-0000-000000000011'::uuid, 4, null),
  ('22222222-2222-2222-2222-222222222222'::uuid, 'cccccccc-0000-0000-0000-000000000012'::uuid, 3, null)
) as r (reviewer, teacher, rating, comment)
on conflict (reviewer_id, teacher_id) do nothing;

drop table tmp_tandil;
