// Flujo de match sobre la tabla swipes:
//   alumno like -> pendiente; profe like -> match (lo crea un trigger); profe pass -> rechazo.
import type { Match } from '@/types/models';
import type { MatchService } from '../types';
import { getCachedProfile } from './auth';
import { requireUserId, supabase } from './client';
import { check, checkMaybe } from './errors';
import { publicUser } from './mappers';

async function me() {
  const id = await requireUserId();
  const p = getCachedProfile();
  return publicUser(id, p?.name ?? '', p?.avatarUrl, p?.role ?? 'student');
}

async function swipe(target: string, action: 'like' | 'pass') {
  const rows = check(await supabase().rpc('swipe', { p_target: target, p_action: action }));
  const matchId = rows[0]?.matched ? rows[0].match_id : null;
  return matchId === null ? null : String(matchId);
}

export const supabaseMatchService: MatchService = {
  async like(teacherId) {
    await swipe(teacherId, 'like');
  },

  async pass(teacherId) {
    await swipe(teacherId, 'pass');
  },

  async listIncoming() {
    const teacher = await me();
    const rows = check(await supabase().rpc('incoming_requests'));
    return rows.map((r): Match => ({
      id: `request-${r.student_id}`,
      status: 'pending',
      createdAt: r.created_at,
      student: {
        ...publicUser(r.student_id, r.student_name, r.student_avatar_url, 'student'),
        bio: r.student_bio ?? '',
        rating: Number(r.student_rating ?? 0),
        reviewCount: r.student_review_count ?? 0,
      },
      teacher,
    }));
  },

  async listOutgoingPending() {
    const student = await me();
    const rows = check(await supabase().rpc('my_pending_requests'));
    return rows.map((r): Match => ({
      id: `request-${r.teacher_id}`,
      status: 'pending',
      createdAt: r.created_at,
      student,
      teacher: publicUser(r.teacher_id, r.teacher_name, r.teacher_avatar_url, 'teacher'),
    }));
  },

  async respond(studentId, accept) {
    return { matchId: await swipe(studentId, accept ? 'like' : 'pass') };
  },

  onNewMatch(callback) {
    // RLS de matches: Realtime solo entrega los matches donde participa el usuario.
    const sb = supabase();
    const channel = sb
      .channel(`my-matches-${Date.now()}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'matches' }, () =>
        callback(),
      )
      .subscribe();
    return () => {
      sb.removeChannel(channel);
    };
  },

  async getById(matchId) {
    const row = checkMaybe(
      await supabase()
        .rpc('get_match', { p_match_id: Number(matchId) })
        .maybeSingle(),
    );
    if (!row) throw new Error('Conversación no encontrada');
    return {
      id: String(row.match_id),
      status: 'accepted',
      createdAt: row.created_at,
      student: publicUser(row.student_id, row.student_name, row.student_avatar_url, 'student'),
      teacher: publicUser(row.teacher_id, row.teacher_name, row.teacher_avatar_url, 'teacher'),
    };
  },
};
