// Búsqueda de profesores (grilla por distancia y mazo de swipe).
// En Supabase: una función RPC con PostGIS que recibe las coordenadas del alumno
// y devuelve SOLO la distancia en km (nunca las coordenadas del profesor).

import type { Coords, TeacherProfile } from '@/types/models';
import { authService } from './authService';
import { db, delay } from './mock/db';

export interface NearbyFilters {
  maxDistanceKm: number;
  query?: string;
  coords?: Coords | null;
}

const isBlocked = (me: string, other: string) =>
  db.blocks.some(([a, b]) => (a === me && b === other) || (a === other && b === me));

const visibleTeachers = () => {
  const me = authService._currentUserId();
  return db.teachers.filter((t) => t.id !== me && !isBlocked(me, t.id));
};

const normalize = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();

export const teacherService = {
  async listNearby({ maxDistanceKm, query }: NearbyFilters): Promise<TeacherProfile[]> {
    await delay();
    const q = normalize(query?.trim() ?? '');
    return visibleTeachers()
      .filter((t) => t.distanceKm <= maxDistanceKm)
      .filter(
        (t) =>
          !q || normalize(t.name).includes(q) || t.subjects.some((s) => normalize(s).includes(q)),
      )
      .sort((a, b) => a.distanceKm - b.distanceKm)
      .map((t) => ({ ...t }));
  },

  /** Profesores que el alumno todavía no likeó ni descartó. */
  async getSwipeDeck(): Promise<TeacherProfile[]> {
    await delay();
    const me = authService._currentUserId();
    const seen = new Set([
      ...db.matches.filter((m) => m.student.id === me).map((m) => m.teacher.id),
      ...db.passes.filter(([s]) => s === me).map(([, t]) => t),
    ]);
    return visibleTeachers()
      .filter((t) => !seen.has(t.id))
      .map((t) => ({ ...t }));
  },

  async getById(id: string): Promise<TeacherProfile> {
    await delay(200);
    const t = visibleTeachers().find((x) => x.id === id);
    if (!t) throw new Error('Profesor no disponible');
    return { ...t };
  },
};
