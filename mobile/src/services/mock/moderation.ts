import type { ModerationService } from '../types';
import { currentUserId, db, delay } from './db';

export const mockModerationService: ModerationService = {
  async report(userId, reason, details) {
    await delay();
    console.log('[mock] reporte', { by: currentUserId(), userId, reason, details });
  },

  async block(userId) {
    await delay();
    const me = currentUserId();
    if (!db.blocks.some(([a, b]) => a === me && b === userId)) db.blocks.push([me, userId]);
  },
};
