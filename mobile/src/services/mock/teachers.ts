import type { TeacherService } from '../types';
import { currentUserId, db, delay } from './db';

const isBlocked = (me: string, other: string) =>
  db.blocks.some(([a, b]) => (a === me && b === other) || (a === other && b === me));

const visibleTeachers = () => {
  const me = currentUserId();
  return db.teachers.filter((t) => t.id !== me && !isBlocked(me, t.id));
};

const normalize = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();

export const mockTeacherService: TeacherService = {
  async listNearby({ maxDistanceKm, query, subjectId }) {
    await delay();
    const q = normalize(query?.trim() ?? '');
    return (
      visibleTeachers()
        .filter((t) => t.distanceKm <= maxDistanceKm)
        // En el mock, el id de la materia es su nombre.
        .filter((t) => !subjectId || t.subjects.includes(subjectId))
        .filter(
          (t) =>
            !q || normalize(t.name).includes(q) || t.subjects.some((s) => normalize(s).includes(q)),
        )
        .sort((a, b) => a.distanceKm - b.distanceKm)
        .map((t) => ({ ...t }))
    );
  },

  async listSubjects({ maxDistanceKm }) {
    await delay(150);
    const counts = new Map<string, number>();
    for (const t of visibleTeachers()) {
      for (const s of t.subjects) {
        counts.set(s, (counts.get(s) ?? 0) + (t.distanceKm <= maxDistanceKm ? 1 : 0));
      }
    }
    return [...counts]
      .map(([name, n]) => ({ id: name, name, teachersInRange: n }))
      .sort((a, b) => a.name.localeCompare(b.name, 'es'));
  },

  async getSwipeDeck() {
    await delay();
    const me = currentUserId();
    const seen = new Set([
      ...db.matches.filter((m) => m.student.id === me).map((m) => m.teacher.id),
      ...db.passes.filter(([s]) => s === me).map(([, t]) => t),
    ]);
    return visibleTeachers()
      .filter((t) => !seen.has(t.id))
      .map((t) => ({ ...t }));
  },

  async getById(id) {
    await delay(200);
    const t = visibleTeachers().find((x) => x.id === id);
    if (!t) throw new Error('Profesor no disponible');
    return { ...t };
  },

  async updateMyLocation() {
    await delay(100);
    const u = db.users.find((x) => x.id === currentUserId());
    if (u) u.hasLocation = true;
  },
};
