import type { ReviewService } from '../types';
import { supabase } from './client';
import { check, checkMaybe, checkOk } from './errors';
import { toPublicProfile, toReview } from './mappers';

export const supabaseReviewService: ReviewService = {
  async submit(sessionId, rating, comment) {
    checkOk(
      await supabase().rpc('submit_review', {
        p_session_id: Number(sessionId),
        p_rating: rating,
        p_comment: comment?.trim() || undefined,
      }),
    );
  },

  async listFor(userId) {
    const rows = check(await supabase().rpc('user_reviews', { p_user_id: userId }));
    return rows.map(toReview);
  },

  async getProfile(userId) {
    const row = checkMaybe(
      await supabase().rpc('get_public_profile', { p_user_id: userId }).maybeSingle(),
    );
    if (!row) throw new Error('Este perfil no está disponible');
    return toPublicProfile(row);
  },
};
