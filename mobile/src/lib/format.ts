/** 0.05 -> "50 m", 1.234 -> "1.2 km" */
export function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(1).replace(/\.0$/, '')} km`;
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
