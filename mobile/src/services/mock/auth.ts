import type { User } from '@/types/models';
import type { AuthService } from '../types';
import { db, delay, session, uid } from './db';

const toUser = ({ password: _password, ...u }: (typeof db.users)[number]): User => u;

const listeners = new Set<(user: User | null) => void>();

const me = () => {
  const u = db.users.find((x) => x.id === session.userId);
  if (!u) throw new Error('Sesión expirada');
  return u;
};

export const mockAuthService: AuthService = {
  async getSession() {
    await delay(150);
    const u = db.users.find((x) => x.id === session.userId);
    return u ? toUser(u) : null;
  },

  onAuthChange(callback) {
    listeners.add(callback);
    return () => listeners.delete(callback);
  },

  async signIn(email, password) {
    await delay();
    const u = db.users.find((x) => x.email.toLowerCase() === email.trim().toLowerCase());
    if (!u || u.password !== password) throw new Error('Email o contraseña incorrectos');
    session.userId = u.id;
    return toUser(u);
  },

  async signUp(input) {
    await delay();
    if (db.users.some((x) => x.email.toLowerCase() === input.email.toLowerCase())) {
      throw new Error('Ya existe una cuenta con ese email');
    }
    const u = { id: uid(), ...input, subjects: input.role === 'teacher' ? [] : undefined };
    db.users.push(u);
    session.userId = u.id;
    return { user: toUser(u), needsEmailConfirmation: false };
  },

  async signOut() {
    await delay(100);
    session.userId = null;
  },

  async updateProfile(changes) {
    await delay();
    const u = me();
    Object.assign(u, changes);
    const t = db.teachers.find((x) => x.id === u.id);
    if (t) Object.assign(t, changes);
    return toUser(u);
  },

  async uploadAvatar(localUri) {
    await delay();
    const u = me();
    u.avatarUrl = localUri; // mock: se usa la uri local tal cual
    const t = db.teachers.find((x) => x.id === u.id);
    if (t) t.avatarUrl = localUri;
    return toUser(u);
  },

  async deleteAccount() {
    await delay();
    const i = db.users.findIndex((x) => x.id === session.userId);
    if (i >= 0) db.users.splice(i, 1);
    session.userId = null;
  },
};
