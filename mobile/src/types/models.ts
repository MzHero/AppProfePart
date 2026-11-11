// Modelos de dominio que consume la UI.
// Cuando exista Supabase, los tipos de la base se generan con `supabase gen types typescript`
// y los servicios mapean filas de la base -> estos modelos. La UI nunca depende de los tipos de la base.

export type Role = 'student' | 'teacher';

export interface User {
  id: string;
  role: Role;
  name: string;
  email: string;
  avatarUrl?: string;
  bio?: string;
  age?: number;
  /** Solo profesores */
  subjects?: string[];
  hourlyRate?: number;
  cv?: string;
}

/** Perfil público de un profesor, tal como lo ve un alumno. */
export interface TeacherProfile {
  id: string;
  name: string;
  age: number;
  avatarUrl: string;
  subjects: string[];
  hourlyRate: number;
  /** 0-5 */
  rating: number;
  bio: string;
  cv: string;
  /**
   * Distancia aproximada al usuario, en km.
   * Regla de privacidad: el backend NUNCA devuelve coordenadas, solo esta distancia.
   */
  distanceKm: number;
}

/** Datos mínimos de la otra persona en un match/chat. */
export interface PublicUser {
  id: string;
  name: string;
  avatarUrl?: string;
  role: Role;
}

export type MatchStatus = 'pending' | 'accepted' | 'rejected';

export interface Match {
  id: string;
  status: MatchStatus;
  createdAt: string;
  student: PublicUser;
  teacher: PublicUser;
}

export interface Message {
  id: string;
  matchId: string;
  senderId: string;
  text: string;
  createdAt: string;
}

export interface Conversation {
  matchId: string;
  other: PublicUser;
  lastMessage?: Message;
}

export type ReportReason = 'spam' | 'inappropriate' | 'harassment' | 'fake_profile' | 'other';

export interface Coords {
  latitude: number;
  longitude: number;
}
