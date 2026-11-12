// Chat entre alumno y profesor (solo para matches aceptados).
// En Supabase: tabla `messages` + Supabase Realtime para `subscribe`.

import type { Conversation, Message } from '@/types/models';
import { authService } from './authService';
import { db, delay, uid } from './mock/db';

type Listener = (msg: Message) => void;
const listeners = new Map<string, Set<Listener>>();

const isBlocked = (me: string, other: string) =>
  db.blocks.some(([a, b]) => (a === me && b === other) || (a === other && b === me));

export const chatService = {
  async listConversations(): Promise<Conversation[]> {
    await delay();
    const me = authService._currentUserId();
    return db.matches
      .filter((m) => m.status === 'accepted' && (m.student.id === me || m.teacher.id === me))
      .map((m) => {
        const other = m.student.id === me ? m.teacher : m.student;
        const msgs = db.messages.filter((x) => x.matchId === m.id);
        return { matchId: m.id, other, lastMessage: msgs[msgs.length - 1] };
      })
      .filter((c) => !isBlocked(me, c.other.id))
      .sort((a, b) =>
        (b.lastMessage?.createdAt ?? '').localeCompare(a.lastMessage?.createdAt ?? ''),
      );
  },

  /** Mensajes de un match, del más viejo al más nuevo. */
  async getMessages(matchId: string): Promise<Message[]> {
    await delay(200);
    return db.messages.filter((m) => m.matchId === matchId);
  },

  async sendMessage(matchId: string, text: string): Promise<Message> {
    await delay(150);
    const me = authService._currentUserId();
    const match = db.matches.find((m) => m.id === matchId);
    if (!match || match.status !== 'accepted') throw new Error('El chat no está habilitado');
    const other = match.student.id === me ? match.teacher.id : match.student.id;
    if (isBlocked(me, other)) throw new Error('No podés enviar mensajes a este usuario');
    const msg: Message = {
      id: uid(),
      matchId,
      senderId: me,
      text,
      createdAt: new Date().toISOString(),
    };
    db.messages.push(msg);
    listeners.get(matchId)?.forEach((l) => l(msg));
    return msg;
  },

  /** Escucha mensajes nuevos. Devuelve la función para desuscribirse. */
  subscribe(matchId: string, onMessage: Listener): () => void {
    if (!listeners.has(matchId)) listeners.set(matchId, new Set());
    listeners.get(matchId)!.add(onMessage);
    return () => listeners.get(matchId)?.delete(onMessage);
  },
};
