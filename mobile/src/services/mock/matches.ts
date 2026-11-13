import type { Match } from '@/types/models';
import type { MatchService } from '../types';
import { currentUserId, db, delay, uid } from './db';
import { ratingSummary } from './reviews';

const matchListeners = new Set<() => void>();

export const mockMatchService: MatchService = {
  async like(teacherId) {
    await delay();
    const me = currentUserId();
    if (db.matches.some((m) => m.student.id === me && m.teacher.id === teacherId)) return;
    const match: Match = {
      id: uid(),
      status: 'pending',
      createdAt: new Date().toISOString(),
      student: db.publicUser(me),
      teacher: db.publicUser(teacherId),
    };
    db.matches.push(match);
  },

  async pass(teacherId) {
    await delay(100);
    db.passes.push([currentUserId(), teacherId]);
  },

  async listIncoming() {
    await delay();
    const me = currentUserId();
    return db.matches
      .filter((m) => m.teacher.id === me && m.status === 'pending')
      .map((m) => ({
        ...m,
        student: {
          ...m.student,
          bio: db.users.find((u) => u.id === m.student.id)?.bio ?? '',
          ...ratingSummary(m.student.id),
        },
      }));
  },

  async listOutgoingPending() {
    await delay();
    const me = currentUserId();
    return db.matches.filter((m) => m.student.id === me && m.status === 'pending');
  },

  async respond(studentId, accept) {
    await delay();
    const me = currentUserId();
    const m = db.matches.find(
      (x) => x.teacher.id === me && x.student.id === studentId && x.status === 'pending',
    );
    if (!m) throw new Error('Solicitud no encontrada');
    m.status = accept ? 'accepted' : 'rejected';
    if (accept) matchListeners.forEach((l) => l());
    return { matchId: accept ? m.id : null };
  },

  onNewMatch(callback) {
    matchListeners.add(callback);
    return () => matchListeners.delete(callback);
  },

  async getById(matchId) {
    await delay(150);
    const me = currentUserId();
    const m = db.matches.find(
      (x) => x.id === matchId && (x.student.id === me || x.teacher.id === me),
    );
    if (!m) throw new Error('Conversación no encontrada');
    return m;
  },
};
