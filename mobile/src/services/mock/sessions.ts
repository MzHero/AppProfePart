import type { StudySession } from '@/types/models';
import type { SessionService } from '../types';
import { currentUserId, db, delay, uid, type MockSession } from './db';

const DAY_MS = 86_400_000;
const listeners = new Map<string, Set<() => void>>();
const notify = (matchId: string) => listeners.get(matchId)?.forEach((l) => l());

/** Mismo cálculo que el servidor: 24 h desde el último paso (propuesta, inicio o terminar). */
const deadline = (s: MockSession) =>
  new Date(
    new Date(s.endRequestedAt ?? s.startedAt ?? s.proposedAt).getTime() + DAY_MS,
  ).toISOString();

/** Aplica el vencimiento: propuesta sin aceptar = cancelada; sesión empezada = cerrada. */
export function closeExpired(s: MockSession) {
  if (!s.endedAt && deadline(s) <= new Date().toISOString()) {
    s.endedAt = deadline(s);
    s.endReason = s.startedAt ? 'timeout' : 'cancelled';
  }
}

function myMatch(matchId: string) {
  const me = currentUserId();
  const m = db.matches.find(
    (x) =>
      x.id === matchId && x.status === 'accepted' && (x.student.id === me || x.teacher.id === me),
  );
  if (!m) throw new Error('No encontramos esta conversación');
  return m;
}

function openSession(sessionId: string): MockSession {
  const s = db.sessions.find((x) => x.id === sessionId);
  if (!s) throw new Error('No encontramos esta sesión');
  myMatch(s.matchId);
  closeExpired(s);
  return s;
}

function status(s: MockSession): StudySession['status'] {
  if (s.endReason === 'cancelled') return 'cancelled';
  if (s.endedAt) return 'closed';
  if (!s.startedAt) return 'proposed';
  return s.endRequestedBy ? 'closing' : 'active';
}

function toModel(s: MockSession, me: string): StudySession {
  closeExpired(s);
  return {
    id: s.id,
    matchId: s.matchId,
    status: status(s),
    proposedByMe: s.proposedBy === me,
    proposedAt: s.proposedAt,
    startedAt: s.startedAt,
    endRequestedBy: s.endRequestedBy === null ? null : s.endRequestedBy === me ? 'me' : 'other',
    closesAt: deadline(s),
    endedAt: s.endedAt,
    endReason: s.endReason,
    reviewedByMe: db.reviews.some((r) => r.sessionId === s.id && r.reviewerId === me),
  };
}

export const mockSessionService: SessionService = {
  async getCurrent(matchId) {
    await delay(150);
    myMatch(matchId);
    const last = db.sessions.filter((s) => s.matchId === matchId).at(-1);
    return last ? toModel(last, currentUserId()) : null;
  },

  async start(matchId) {
    await delay();
    myMatch(matchId);
    const open = db.sessions.filter((s) => s.matchId === matchId);
    open.forEach(closeExpired);
    if (open.some((s) => !s.endedAt)) {
      throw new Error('Ya hay una sesión de estudio propuesta o en curso');
    }
    db.sessions.push({
      id: uid(),
      matchId,
      proposedBy: currentUserId(),
      proposedAt: new Date().toISOString(),
      startedAt: null,
      endRequestedBy: null,
      endRequestedAt: null,
      endedAt: null,
      endReason: null,
    });
    notify(matchId);
  },

  async accept(sessionId) {
    await delay();
    const s = openSession(sessionId);
    if (s.endedAt) throw new Error('Esta propuesta ya no está vigente');
    if (s.startedAt) return;
    if (s.proposedBy === currentUserId()) {
      throw new Error('La otra persona tiene que aceptar la sesión');
    }
    s.startedAt = new Date().toISOString();
    notify(s.matchId);
  },

  async cancel(sessionId) {
    await delay();
    const s = openSession(sessionId);
    if (s.endedAt) return;
    if (s.startedAt) throw new Error('La sesión ya empezó: para cerrarla, terminala');
    s.endedAt = new Date().toISOString();
    s.endReason = 'cancelled';
    notify(s.matchId);
  },

  async end(sessionId) {
    await delay();
    const me = currentUserId();
    const s = openSession(sessionId);
    if (s.endedAt) return s.endReason !== 'cancelled';
    if (!s.startedAt) throw new Error('La sesión todavía no empezó');
    if (!s.endRequestedBy) {
      s.endRequestedBy = me;
      s.endRequestedAt = new Date().toISOString();
    } else if (s.endRequestedBy !== me) {
      s.endedAt = new Date().toISOString();
      s.endReason = 'both';
    }
    notify(s.matchId);
    return Boolean(s.endedAt);
  },

  subscribe(matchId, onChange) {
    if (!listeners.has(matchId)) listeners.set(matchId, new Set());
    listeners.get(matchId)!.add(onChange);
    return () => listeners.get(matchId)?.delete(onChange);
  },
};
