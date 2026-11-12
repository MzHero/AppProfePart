// Búsqueda de profesores con la función search_teachers (PostGIS en el servidor).
// Se envían las coordenadas del alumno; vuelve solo la distancia redondeada.
import type { Coords } from '@/types/models';
import type { TeacherService } from '../types';
import { supabase } from './client';
import { check, checkOk } from './errors';
import { toTeacher } from './mappers';

const origin = (coords?: Coords | null) =>
  coords ? { p_lat: coords.latitude, p_lng: coords.longitude } : {};

export const supabaseTeacherService: TeacherService = {
  async listNearby({ maxDistanceKm, query, subjectId, coords }) {
    const rows = check(
      await supabase().rpc('search_teachers', {
        ...origin(coords),
        // Sin ubicación no se puede filtrar por distancia: se listan todos.
        ...(coords && { p_max_km: maxDistanceKm }),
        ...(query?.trim() && { p_query: query.trim() }),
        ...(subjectId && { p_subject_id: Number(subjectId) }),
      }),
    );
    return rows.map(toTeacher);
  },

  async listSubjects({ maxDistanceKm, coords }) {
    const rows = check(
      await supabase().rpc('available_subjects', {
        ...origin(coords),
        ...(coords && { p_max_km: maxDistanceKm }),
      }),
    );
    return rows.map((r) => ({
      id: String(r.id),
      name: r.name,
      teachersInRange: r.teachers_in_range ?? 0,
    }));
  },

  async getSwipeDeck(coords) {
    const rows = check(
      await supabase().rpc('search_teachers', {
        ...origin(coords),
        p_only_unseen: true,
        p_limit: 30,
      }),
    );
    return rows.map(toTeacher);
  },

  async getById(id, coords) {
    const rows = check(
      await supabase().rpc('search_teachers', { ...origin(coords), p_teacher_id: id }),
    );
    if (!rows[0]) throw new Error('Profesor no disponible');
    return toTeacher(rows[0]);
  },

  async updateMyLocation(coords) {
    checkOk(
      await supabase().rpc('set_my_location', {
        p_lat: coords.latitude,
        p_lng: coords.longitude,
      }),
    );
  },
};
