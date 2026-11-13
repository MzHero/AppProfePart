#!/usr/bin/env bash
# Resetea la base LOCAL de Supabase: borra todo, aplica las migraciones y carga los seeds
# (alumnos de prueba, 16 profes del Obelisco y 13 de Tandil).
#
# Opcional: con una ubicación, mueve a los 16 profes del Obelisco alrededor de esa ubicación
# (mismas distancias y direcciones: 30 m, 90 m, ... 12 km) para probar "Cercanos" desde donde
# estés. La ubicación NO se guarda en el repo: solo se usa en tu base local.
#
# Uso (desde cualquier carpeta):
#   ./supabase/scripts/reset-local.sh                # reset normal
#   ./supabase/scripts/reset-local.sh -37.31 -59.08  # reset + profes alrededor de esa ubicación
#
# Después, en el teléfono: Perfil -> "Reiniciar avisos y animaciones" (solo en desarrollo).
set -euo pipefail
cd "$(dirname "$0")/../.."

DB_CONTAINER="supabase_db_$(sed -n 's/^project_id = "\(.*\)"/\1/p' supabase/config.toml)"

echo "→ Reseteando la base local (migraciones + seeds)..."
npx --yes supabase@3.1.0 db reset

if [ $# -eq 2 ]; then
  echo "→ Moviendo a los profes del Obelisco alrededor de ($1, $2)..."
  docker exec -i "$DB_CONTAINER" psql -U postgres -v ON_ERROR_STOP=1 -q \
    -v lat="$1" -v lng="$2" <<'SQL'
-- Mismo desplazamiento en metros respecto del Obelisco, con el nuevo centro.
update public.teacher_profiles
set location = extensions.st_setsrid(extensions.st_makepoint(
      :lng + (extensions.st_x(location::extensions.geometry) - (-58.3816))
             * cos(radians(-34.6037)) / cos(radians(:lat)),
      :lat + (extensions.st_y(location::extensions.geometry) - (-34.6037))
    ), 4326)::extensions.geography
where extensions.st_dwithin(
  location,
  extensions.st_setsrid(extensions.st_makepoint(-58.3816, -34.6037), 4326)::extensions.geography,
  20000
);
SQL
fi

echo "→ Esperando a que Realtime (chat y matches en vivo) esté listo..."
sleep 10

docker exec "$DB_CONTAINER" psql -U postgres -qtA -c \
  "select '✔ ' || count(*) || ' profesores, ' || (select count(*) from public.users where role = 'student') || ' alumnos' from public.users where role = 'teacher'"
echo "Listo. En el teléfono: cerrá sesión (o Perfil → \"Reiniciar avisos y animaciones\") y volvé a entrar."
