// Modelos de dominio que consume la UI.
// Los tipos de la base (services/supabase/database.types.ts) se generan con `npm run db:types`
// y los servicios mapean filas de la base -> estos modelos. La UI nunca depende de los tipos de la base.

export type Role = 'student' | 'teacher';

export interface User {
  id: string;
  role: Role;
  name: string;
  email: string;
  avatarUrl?: string;
  bio?: string;
  /** Fecha de nacimiento, formato ISO 'AAAA-MM-DD'. */
  birthDate?: string;
  /** Solo profesores */
  subjects?: string[];
  hourlyRate?: number;
  cv?: string;
  /** Solo profesores: si ya cargó su ubicación (sin ella no aparece en la búsqueda por distancia). */
  hasLocation?: boolean;
}

/** Perfil público de un profesor, tal como lo ve un alumno. */
export interface TeacherProfile {
  id: string;
  name: string;
  /** null si el profesor no cargó su fecha de nacimiento. */
  age: number | null;
  avatarUrl?: string;
  subjects: string[];
  /** null si el profesor no cargó precio. */
  hourlyRate: number | null;
  /** Promedio de reseñas, 0-5 (0 = sin reseñas). */
  rating: number;
  reviewCount: number;
  bio: string;
  cv: string;
  /**
   * Distancia aproximada al usuario, en km.
   * Regla de privacidad: el backend NUNCA devuelve coordenadas, solo esta distancia (redondeada).
   * null si no tenemos la ubicación del alumno o el profesor no cargó la suya.
   */
  distanceKm: number | null;
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

/** Materia para el filtro de "Cercanos". */
export interface Subject {
  id: string;
  name: string;
  /** Profesores con esta materia dentro de la distancia elegida. */
  teachersInRange: number;
}

export type ReportReason = 'spam' | 'inappropriate' | 'harassment' | 'fake_profile' | 'other';

export interface Coords {
  latitude: number;
  longitude: number;
}
