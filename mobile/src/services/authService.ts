// Autenticación y cuenta propia.
// Hoy: mock en memoria. Mañana: Supabase Auth. La firma de estas funciones es el contrato con la UI.

import type { Role, User } from '@/types/models';
import { db, delay, uid } from './mock/db';

let currentUserId: string | null = null;

const toUser = ({ password: _password, ...u }: (typeof db.users)[number]): User => u;

export interface SignUpInput {
  name: string;
  email: string;
  password: string;
  role: Role;
}

export type ProfileUpdate = Partial<
  Pick<User, 'name' | 'bio' | 'avatarUrl' | 'age' | 'subjects' | 'hourlyRate' | 'cv'>
>;

export const authService = {
  async getSession(): Promise<User | null> {
    await delay(150);
    const u = db.users.find((x) => x.id === currentUserId);
    return u ? toUser(u) : null;
  },

  async signIn(email: string, password: string): Promise<User> {
    await delay();
    const u = db.users.find((x) => x.email.toLowerCase() === email.trim().toLowerCase());
    if (!u || u.password !== password) throw new Error('Email o contraseña incorrectos');
    currentUserId = u.id;
    return toUser(u);
  },

  async signUp(input: SignUpInput): Promise<User> {
    await delay();
    if (db.users.some((x) => x.email.toLowerCase() === input.email.toLowerCase())) {
      throw new Error('Ya existe una cuenta con ese email');
    }
    const u = { id: uid(), ...input, subjects: input.role === 'teacher' ? [] : undefined };
    db.users.push(u);
    currentUserId = u.id;
    return toUser(u);
  },

  async signOut(): Promise<void> {
    await delay(100);
    currentUserId = null;
  },

  async updateProfile(changes: ProfileUpdate): Promise<User> {
    await delay();
    const u = db.users.find((x) => x.id === currentUserId);
    if (!u) throw new Error('Sesión expirada');
    Object.assign(u, changes);
    const t = db.teachers.find((x) => x.id === u.id);
    if (t) Object.assign(t, changes);
    return toUser(u);
  },

  /** Requisito de Apple: eliminar la cuenta desde la app. */
  async deleteAccount(): Promise<void> {
    await delay();
    const i = db.users.findIndex((x) => x.id === currentUserId);
    if (i >= 0) db.users.splice(i, 1);
    currentUserId = null;
  },

  /** Uso interno de otros servicios mock. */
  _currentUserId(): string {
    if (!currentUserId) throw new Error('No hay sesión');
    return currentUserId;
  },
};
