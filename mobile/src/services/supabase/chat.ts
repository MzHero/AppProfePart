// Chat: tabla messages + Supabase Realtime (respeta RLS: solo llegan mensajes de mis chats).
// La UI identifica cada chat por matchId; acá se traduce a conversation_id.
import type { RealtimeChannel } from '@supabase/supabase-js';

import type { Role } from '@/types/models';
import type { ChatService } from '../types';
import { requireUserId, supabase } from './client';
import { check } from './errors';
import { publicUser, toMessage } from './mappers';

const MESSAGE_COLUMNS = 'id, sender_id, body, sent_at';
/** Cuántos mensajes recientes se cargan al abrir un chat. */
const HISTORY_LIMIT = 200;

const conversationIds = new Map<string, number>();

async function getConversationId(matchId: string): Promise<number> {
  const cached = conversationIds.get(matchId);
  if (cached) return cached;
  const row = check(
    await supabase().from('conversations').select('id').eq('match_id', Number(matchId)).single(),
  );
  conversationIds.set(matchId, row.id);
  return row.id;
}

export const supabaseChatService: ChatService = {
  async listConversations() {
    const rows = check(await supabase().rpc('my_conversations'));
    return rows.map((r) => {
      const matchId = String(r.match_id);
      conversationIds.set(matchId, r.conversation_id);
      return {
        matchId,
        createdAt: r.created_at,
        other: publicUser(r.other_id, r.other_name, r.other_avatar_url, r.other_role as Role),
        lastMessage: r.last_message_id
          ? toMessage(
              {
                id: r.last_message_id,
                sender_id: r.last_message_sender_id,
                body: r.last_message_body,
                sent_at: r.last_message_sent_at,
              },
              matchId,
            )
          : undefined,
      };
    });
  },

  async getMessages(matchId) {
    const conversationId = await getConversationId(matchId);
    const rows = check(
      await supabase()
        .from('messages')
        .select(MESSAGE_COLUMNS)
        .eq('conversation_id', conversationId)
        .order('sent_at', { ascending: false })
        .order('id', { ascending: false })
        .limit(HISTORY_LIMIT),
    );
    return rows.reverse().map((r) => toMessage(r, matchId));
  },

  async sendMessage(matchId, text) {
    const [conversationId, senderId] = await Promise.all([
      getConversationId(matchId),
      requireUserId(),
    ]);
    const row = check(
      await supabase()
        .from('messages')
        .insert({ conversation_id: conversationId, sender_id: senderId, body: text })
        .select(MESSAGE_COLUMNS)
        .single(),
    );
    return toMessage(row, matchId);
  },

  subscribe(matchId, onMessage, onReady) {
    let channel: RealtimeChannel | null = null;
    let cancelled = false;

    getConversationId(matchId)
      .then((conversationId) => {
        if (cancelled) return;
        channel = supabase()
          .channel(`messages:${conversationId}`)
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'messages',
              filter: `conversation_id=eq.${conversationId}`,
            },
            (payload) =>
              onMessage(
                toMessage(
                  payload.new as { id: number; sender_id: string; body: string; sent_at: string },
                  matchId,
                ),
              ),
          )
          // El estado SUBSCRIBED llega antes de que Realtime esté escuchando Postgres:
          // lo que se envíe en ese intervalo se pierde. Este aviso marca cuándo ya está activo.
          .on('system', {}, (payload: { extension?: string; status?: string }) => {
            if (payload.extension === 'postgres_changes' && payload.status === 'ok') onReady?.();
          })
          .subscribe();
      })
      .catch(() => {});

    return () => {
      cancelled = true;
      if (channel) supabase().removeChannel(channel);
    };
  },
};
