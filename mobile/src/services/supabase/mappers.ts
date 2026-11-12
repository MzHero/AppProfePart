// Filas de la base -> modelos de la UI (types/models.ts).
// Nota: los tipos generados marcan como no nulas las columnas que devuelven las funciones,
// aunque pueden venir null (age, hourly_rate, distance_km...). Acá se normalizan.

import type { Message, PublicUser, Role, TeacherProfile, User } from '@/types/models';
import type { Database } from './database.types';

type Fn = Database['public']['Functions'];
type Row<K extends keyof Fn> = Fn[K]['Returns'] extends (infer R)[] ? R : never;
/** Fila tal como puede venir en realidad: cualquier columna puede ser null. */
type Nullable<T> = { [K in keyof T]: T[K] | null };

const orNull = <T>(v: T | null | undefined): T | null => (v === undefined ? null : v);
const orUndef = <T>(v: T | null | undefined): T | undefined => (v === null ? undefined : v);

export function toTeacher(row: Row<'search_teachers'>): TeacherProfile {
  const r = row as Nullable<Row<'search_teachers'>>;
  return {
    id: r.id ?? '',
    name: r.name ?? '',
    age: orNull(r.age),
    avatarUrl: orUndef(r.avatar_url),
    subjects: r.subjects ?? [],
    hourlyRate: r.hourly_rate === null ? null : Number(r.hourly_rate),
    rating: Number(r.rating ?? 0),
    reviewCount: r.review_count ?? 0,
    bio: r.bio ?? '',
    cv: r.cv ?? '',
    distanceKm: r.distance_km === null ? null : Number(r.distance_km),
  };
}

export function toUser(row: Row<'get_my_profile'>): User {
  const r = row as Nullable<Row<'get_my_profile'>>;
  const isTeacher = r.role === 'teacher';
  return {
    id: r.id ?? '',
    role: r.role as Role,
    name: r.name ?? '',
    email: r.email ?? '',
    avatarUrl: orUndef(r.avatar_url),
    bio: orUndef(r.bio),
    birthDate: orUndef(r.birth_date),
    subjects: isTeacher ? (r.subjects ?? []) : undefined,
    hourlyRate: isTeacher && r.hourly_rate !== null ? Number(r.hourly_rate) : undefined,
    cv: isTeacher ? orUndef(r.cv) : undefined,
    hasLocation: isTeacher ? Boolean(r.has_location) : undefined,
  };
}

export function publicUser(
  id: string,
  name: string,
  avatarUrl: string | null | undefined,
  role: Role,
): PublicUser {
  return { id, name, avatarUrl: orUndef(avatarUrl), role };
}

export function toMessage(
  r: { id: number; sender_id: string; body: string; sent_at: string },
  matchId: string,
): Message {
  return {
    id: String(r.id),
    matchId,
    senderId: r.sender_id,
    text: r.body,
    createdAt: r.sent_at,
  };
}
