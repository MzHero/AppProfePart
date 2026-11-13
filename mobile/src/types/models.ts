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
  /** Solo en solicitudes recibidas: el profesor ve el puntaje del alumno antes de aceptar. */
  bio?: string;
  rating?: number;
  reviewCount?: number;
}

/** Perfil público de un alumno o profesor, con su puntaje. */
export interface PublicProfile {
  id: string;
  name: string;
  role: Role;
  avatarUrl?: string;
  bio: string;
  /** Promedio 0-5 (0 = sin reseñas). Cuenta la última reseña de cada persona. */
  rating: number;
  reviewCount: number;
}

/** Reseña que recibió un usuario después de una sesión de estudio. */
export interface Review {
  id: string;
  rating: number;
  comment?: string;
  createdAt: string;
  reviewer: PublicUser;
}

/**
 * Sesión de estudio de un match:
 *   proposed  -> uno la propuso, falta que el otro la acepte (o se cancela a las 24 h)
 *   active    -> en curso
 *   closing   -> uno la terminó, falta que el otro confirme (o que pasen 24 h)
 *   closed    -> cerrada por los dos o por tiempo: ya se puede calificar
 *   cancelled -> la propuesta no se aceptó (nunca empezó)
 */
export type StudySessionStatus = 'proposed' | 'active' | 'closing' | 'closed' | 'cancelled';

export interface StudySession {
  id: string;
  matchId: string;
  status: StudySessionStatus;
  proposedByMe: boolean;
  proposedAt: string;
  /** Cuándo la aceptó el otro (null mientras es una propuesta). */
  startedAt: string | null;
  /** Quién la terminó primero (null si nadie todavía). */
  endRequestedBy: 'me' | 'other' | null;
  /** Límite automático: la propuesta se cancela o la sesión se cierra sola en este momento. */
  closesAt: string;
  endedAt: string | null;
  /** 'both' = la cerraron los dos; 'timeout' = se cerró sola a las 24 h; 'cancelled' = no empezó. */
  endReason: 'both' | 'timeout' | 'cancelled' | null;
  reviewedByMe: boolean;
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
  /** Cuándo se creó el match (ISO). */
  createdAt: string;
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
