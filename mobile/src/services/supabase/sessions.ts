// Sesiones de estudio: todo pasa por funciones RPC (la tabla es de solo lectura para la app).
import type { SessionService } from '../types';
import { supabase } from './client';
import { check, checkMaybe, checkOk } from './errors';
import { toStudySession } from './mappers';

export const supabaseSessionService: SessionService = {
  async getCurrent(matchId) {
    const row = checkMaybe(
      await supabase()
        .rpc('get_study_session', { p_match_id: Number(matchId) })
        .maybeSingle(),
    );
    return row ? toStudySession(row, matchId) : null;
  },

  async start(matchId) {
    check(await supabase().rpc('start_study_session', { p_match_id: Number(matchId) }));
  },

  async accept(sessionId) {
    checkOk(await supabase().rpc('accept_study_session', { p_session_id: Number(sessionId) }));
  },

  async cancel(sessionId) {
    checkOk(await supabase().rpc('cancel_study_session', { p_session_id: Number(sessionId) }));
  },

  async end(sessionId) {
    const { data, error } = await supabase().rpc('end_study_session', {
      p_session_id: Number(sessionId),
    });
    checkMaybe({ data, error });
    return Boolean(data);
  },

  subscribe(matchId, onChange) {
    // RLS de study_sessions: Realtime solo entrega las sesiones de los matches del usuario.
    const sb = supabase();
    const channel = sb
      .channel(`study-sessions-${matchId}-${Date.now()}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'study_sessions', filter: `match_id=eq.${matchId}` },
        () => onChange(),
      )
      // La suscripción queda activa después de SUBSCRIBED: recargar en ese momento para no
      // perder un cambio hecho en el medio (mismo caso que el chat).
      .on('system', {}, (p: { extension?: string; status?: string }) => {
        if (p?.extension === 'postgres_changes' && p?.status === 'ok') onChange();
      })
      .subscribe();
    return () => {
      sb.removeChannel(channel);
    };
  },
};
