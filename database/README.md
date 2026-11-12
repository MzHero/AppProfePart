# database/

`schema.sql` es el dump original del esquema (PostgreSQL + PostGIS, PR #1). Se conserva como
referencia, pero **ya no es la fuente de verdad**.

El esquema vigente vive en las migraciones de Supabase:

- `supabase/migrations/20261112000000_initial_schema.sql`: este esquema adaptado a Supabase
  (login con Supabase Auth, RLS, funciones RPC, Realtime, Storage).
- `supabase/seed.sql`: datos de prueba para desarrollo local.

Diferencias con `schema.sql`:

| `schema.sql` | Migración de Supabase |
|---|---|
| `users.id bigint` + `password_hash` | `users.id uuid` = `auth.users.id` (el login lo maneja Supabase Auth) |
| sin rol | `users.role` (`student` / `teacher`) |
| sin fecha de nacimiento | `users.birth_date` |
| `teacher_profiles.bio` | `users.bio` (la usan alumnos y profesores) |
| sin moderación | tablas `blocks` y `reports` |
| `subjects.name` único | único sin distinguir mayúsculas |
| FKs sin `ON DELETE` | `ON DELETE CASCADE` (para poder eliminar la cuenta) |
| sin seguridad | RLS en todas las tablas + permisos por columna |

Para cambiar el esquema, no edites ningún `.sql` existente: creá una migración nueva con
`npx supabase@3.1.0 migration new <nombre>` (ver `CLAUDE.md`).
