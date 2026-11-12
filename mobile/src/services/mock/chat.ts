import type { Message } from '@/types/models';
import type { ChatService } from '../types';
import { currentUserId, db, delay, uid } from './db';

type Listener = (msg: Message) => void;
const listeners = new Map<string, Set<Listener>>();

const isBlocked = (me: string, other: string) =>
  db.blocks.some(([a, b]) => (a === me && b === other) || (a === other && b === me));

export const mockChatService: ChatService = {
  async listConversations() {
    await delay();
    const me = currentUserId();
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

  async getMessages(matchId) {
    await delay(200);
    return db.messages.filter((m) => m.matchId === matchId);
  },

  async sendMessage(matchId, text) {
    await delay(150);
    const me = currentUserId();
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

  subscribe(matchId, onMessage) {
    if (!listeners.has(matchId)) listeners.set(matchId, new Set());
    listeners.get(matchId)!.add(onMessage);
    return () => listeners.get(matchId)?.delete(onMessage);
  },
};
