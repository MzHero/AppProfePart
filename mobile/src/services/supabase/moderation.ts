import type { ModerationService } from '../types';
import { requireUserId, supabase } from './client';
import { toAppError } from './errors';

export const supabaseModerationService: ModerationService = {
  async report(userId, reason, details) {
    const reporterId = await requireUserId();
    const { error } = await supabase()
      .from('reports')
      .insert({ reporter_id: reporterId, reported_id: userId, reason, details: details ?? null });
    if (error) throw toAppError(error);
  },

  async block(userId) {
    const blockerId = await requireUserId();
    const { error } = await supabase()
      .from('blocks')
      .insert({ blocker_id: blockerId, blocked_id: userId });
    // 23505 = ya estaba bloqueado: no es un error para el usuario.
    if (error && error.code !== '23505') throw toAppError(error);
  },
};
