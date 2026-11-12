// Reportar y bloquear usuarios (requisito de tiendas).

import type { ReportReason } from '@/types/models';
import { authService } from './authService';
import { db, delay } from './mock/db';

export const REPORT_REASONS: { value: ReportReason; label: string }[] = [
  { value: 'inappropriate', label: 'Contenido inapropiado' },
  { value: 'harassment', label: 'Acoso o lenguaje ofensivo' },
  { value: 'fake_profile', label: 'Perfil falso' },
  { value: 'spam', label: 'Spam o publicidad' },
  { value: 'other', label: 'Otro motivo' },
];

export const moderationService = {
  async report(userId: string, reason: ReportReason, details?: string): Promise<void> {
    await delay();
    // Mock: en Supabase se inserta en la tabla `reports` para revisión manual.
    console.log('[mock] reporte', { by: authService._currentUserId(), userId, reason, details });
  },

  async block(userId: string): Promise<void> {
    await delay();
    const me = authService._currentUserId();
    if (!db.blocks.some(([a, b]) => a === me && b === userId)) db.blocks.push([me, userId]);
  },
};
