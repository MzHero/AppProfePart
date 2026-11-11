// Flujo de match: el alumno da like -> 'pending' -> el profesor acepta o rechaza.
// Si se acepta, se habilita el chat.

import type { Match } from '@/types/models';
import { authService } from './authService';
import { db, delay, uid } from './mock/db';

export const matchService = {
  /** Alumno da like a un profesor. Idempotente: si ya existe el match, lo devuelve. */
  async like(teacherId: string): Promise<Match> {
    await delay();
    const me = authService._currentUserId();
    const existing = db.matches.find((m) => m.student.id === me && m.teacher.id === teacherId);
    if (existing) return existing;
    const match: Match = {
      id: uid(),
      status: 'pending',
      createdAt: new Date().toISOString(),
      student: db.publicUser(me),
      teacher: db.publicUser(teacherId),
    };
    db.matches.push(match);
    return match;
  },

  /** Alumno descarta un profesor en el swipe. */
  async pass(teacherId: string): Promise<void> {
    await delay(100);
    db.passes.push([authService._currentUserId(), teacherId]);
  },

  /** Profesor: solicitudes pendientes recibidas. */
  async listIncoming(): Promise<Match[]> {
    await delay();
    const me = authService._currentUserId();
    return db.matches.filter((m) => m.teacher.id === me && m.status === 'pending');
  },

  /** Alumno: solicitudes enviadas que siguen pendientes. */
  async listOutgoingPending(): Promise<Match[]> {
    await delay();
    const me = authService._currentUserId();
    return db.matches.filter((m) => m.student.id === me && m.status === 'pending');
  },

  async respond(matchId: string, accept: boolean): Promise<Match> {
    await delay();
    const me = authService._currentUserId();
    const m = db.matches.find((x) => x.id === matchId && x.teacher.id === me);
    if (!m) throw new Error('Solicitud no encontrada');
    m.status = accept ? 'accepted' : 'rejected';
    return m;
  },

  async getById(matchId: string): Promise<Match> {
    await delay(150);
    const me = authService._currentUserId();
    const m = db.matches.find(
      (x) => x.id === matchId && (x.student.id === me || x.teacher.id === me),
    );
    if (!m) throw new Error('Conversación no encontrada');
    return m;
  },
};
