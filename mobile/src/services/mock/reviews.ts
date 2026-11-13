import { hasOffensiveLanguage, OFFENSIVE_LANGUAGE_MESSAGE } from '@/lib/moderation';
import type { Review } from '@/types/models';
import type { ReviewService } from '../types';
import { currentUserId, db, delay, uid, type MockReview } from './db';
import { closeExpired } from './sessions';

/** La última reseña de cada persona sobre el usuario, de la más nueva a la más vieja. */
function latestPerReviewer(userId: string): MockReview[] {
  const byReviewer = new Map<string, MockReview>();
  for (const r of db.reviews) {
    if (r.revieweeId !== userId) continue;
    const prev = byReviewer.get(r.reviewerId);
    if (!prev || prev.createdAt < r.createdAt) byReviewer.set(r.reviewerId, r);
  }
  return [...byReviewer.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/** Promedio (1 decimal) y cantidad, como rating_summary() en el servidor. */
export function ratingSummary(userId: string) {
  const list = latestPerReviewer(userId);
  const avg = list.length ? list.reduce((sum, r) => sum + r.rating, 0) / list.length : 0;
  return { rating: Math.round(avg * 10) / 10, reviewCount: list.length };
}

export const mockReviewService: ReviewService = {
  async submit(sessionId, rating, comment) {
    await delay();
    const me = currentUserId();
    const s = db.sessions.find((x) => x.id === sessionId);
    const match = s && db.matches.find((m) => m.id === s.matchId);
    if (!s || !match || (match.student.id !== me && match.teacher.id !== me)) {
      throw new Error('No encontramos esta sesión');
    }
    closeExpired(s);
    if (!s.endedAt) throw new Error('Vas a poder calificar cuando termine la sesión de estudio');
    if (s.endReason === 'cancelled') throw new Error('Esta sesión no llegó a empezar');
    if (db.reviews.some((r) => r.sessionId === sessionId && r.reviewerId === me)) {
      throw new Error('Ya calificaste esta sesión');
    }
    const text = comment?.trim() || undefined;
    if (text && hasOffensiveLanguage(text)) throw new Error(OFFENSIVE_LANGUAGE_MESSAGE);

    const revieweeId = match.student.id === me ? match.teacher.id : match.student.id;
    db.reviews.push({
      id: uid(),
      sessionId,
      reviewerId: me,
      revieweeId,
      rating,
      comment: text,
      createdAt: new Date().toISOString(),
    });
    // Los profes del mock guardan su puntaje (lo usa la grilla).
    const teacher = db.teachers.find((t) => t.id === revieweeId);
    if (teacher) Object.assign(teacher, ratingSummary(revieweeId));
  },

  async listFor(userId) {
    await delay(200);
    return latestPerReviewer(userId).map((r): Review => ({
      id: r.id,
      rating: r.rating,
      comment: r.comment,
      createdAt: r.createdAt,
      reviewer: db.publicUser(r.reviewerId),
    }));
  },

  async getProfile(userId) {
    await delay(150);
    const u = db.publicUser(userId);
    const full = db.users.find((x) => x.id === userId) ?? db.teachers.find((x) => x.id === userId);
    return { ...u, bio: full?.bio ?? '', ...ratingSummary(userId) };
  },
};
