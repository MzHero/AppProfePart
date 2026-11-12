/** 0.05 -> "50 m", 1.234 -> "1,2 km", 334.5 -> "335 km" (coma decimal, como en Argentina). */
export function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  if (km < 10) return `${km.toFixed(1).replace(/\.0$/, '').replace('.', ',')} km`;
  return `${Math.round(km).toLocaleString('es-AR')} km`;
}

/** Hora (HH:mm) si es de hoy, si no fecha corta (dd/mm). */
export function formatChatTime(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const sameDay = d.toDateString() === today.toDateString();
  const pad = (n: number) => String(n).padStart(2, '0');
  return sameDay
    ? `${pad(d.getHours())}:${pad(d.getMinutes())}`
    : `${pad(d.getDate())}/${pad(d.getMonth() + 1)}`;
}

/** Filtros de distancia de la grilla (en km), según las pantallas de referencia. */
export const DISTANCE_FILTERS_KM = [0.05, 0.1, 0.2, 0.5] as const;

/** 15 -> "$15/h"; null si el profesor no cargó precio. */
export function formatRate(hourlyRate: number | null | undefined): string | null {
  if (hourlyRate === null || hourlyRate === undefined) return null;
  return `$${Number.isInteger(hourlyRate) ? hourlyRate : hourlyRate.toFixed(2)}/h`;
}

/** 'AAAA-MM-DD' -> 'DD/MM/AAAA' (formato que ve y escribe el usuario). */
export function isoToDisplayDate(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

/** 'DD/MM/AAAA' -> 'AAAA-MM-DD'. */
export function displayDateToIso(display: string): string {
  const [d, m, y] = display.split('/');
  return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
}
