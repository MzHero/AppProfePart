// Contrato entre la UI y la capa de datos. Lo implementan:
//   - services/supabase/*  (backend real)
//   - services/mock/*      (datos en memoria, cuando no hay Supabase configurado)
// Cambiar una firma acá obliga a actualizar las dos implementaciones.

import type {
  Conversation,
  Coords,
  Match,
  Message,
  ReportReason,
  Role,
  Subject,
  TeacherProfile,
  User,
} from '@/types/models';

export interface SignUpInput {
  name: string;
  email: string;
  password: string;
  role: Role;
}

export interface SignUpResult {
  /** null si hay que confirmar el email antes de poder entrar. */
  user: User | null;
  needsEmailConfirmation: boolean;
}

export type ProfileUpdate = Partial<
  Pick<User, 'name' | 'bio' | 'birthDate' | 'subjects' | 'hourlyRate' | 'cv'>
>;

export interface AuthService {
  getSession(): Promise<User | null>;
  /** Cambios de sesión hechos fuera de la app (token vencido, sesión cerrada). Devuelve unsubscribe. */
  onAuthChange(callback: (user: User | null) => void): () => void;
  signIn(email: string, password: string): Promise<User>;
  signUp(input: SignUpInput): Promise<SignUpResult>;
  signOut(): Promise<void>;
  updateProfile(changes: ProfileUpdate): Promise<User>;
  /** Sube la foto (uri local de expo-image-picker) y la guarda como avatar. */
  uploadAvatar(localUri: string): Promise<User>;
  /** Requisito de Apple: eliminar la cuenta desde la app. */
  deleteAccount(): Promise<void>;
}

export interface NearbyFilters {
  maxDistanceKm: number;
  query?: string;
  /** Materia elegida en el desplegable (null = todas). */
  subjectId?: string | null;
  coords?: Coords | null;
}

export interface TeacherService {
  listNearby(filters: NearbyFilters): Promise<TeacherProfile[]>;
  /** Materias que tienen profesores, con cuántos hay dentro de la distancia elegida. */
  listSubjects(filters: Pick<NearbyFilters, 'maxDistanceKm' | 'coords'>): Promise<Subject[]>;
  /** Profesores que el alumno todavía no likeó ni descartó. */
  getSwipeDeck(coords?: Coords | null): Promise<TeacherProfile[]>;
  getById(id: string, coords?: Coords | null): Promise<TeacherProfile>;
  /** Profesor: guarda su ubicación (el backend la redondea y nunca la expone). */
  updateMyLocation(coords: Coords): Promise<void>;
}

export interface MatchService {
  /** Alumno da like a un profesor -> solicitud pendiente. */
  like(teacherId: string): Promise<void>;
  /** Alumno descarta un profesor en el swipe. */
  pass(teacherId: string): Promise<void>;
  /** Profesor: solicitudes pendientes recibidas. */
  listIncoming(): Promise<Match[]>;
  /** Alumno: solicitudes enviadas que siguen pendientes. */
  listOutgoingPending(): Promise<Match[]>;
  /** Profesor acepta o rechaza la solicitud de un alumno. */
  respond(studentId: string, accept: boolean): Promise<{ matchId: string | null }>;
  getById(matchId: string): Promise<Match>;
  /** Avisa en tiempo real cuando se crea un match del usuario (un profe lo aceptó). */
  onNewMatch(callback: () => void): () => void;
}

export interface ChatService {
  listConversations(): Promise<Conversation[]>;
  /** Mensajes de un match, del más viejo al más nuevo. */
  getMessages(matchId: string): Promise<Message[]>;
  sendMessage(matchId: string, text: string): Promise<Message>;
  /**
   * Mensajes nuevos en tiempo real. Devuelve unsubscribe.
   * `onReady` se llama cada vez que la suscripción queda activa (al abrir y al reconectar):
   * hay que recargar los mensajes, porque los enviados antes de ese momento no llegan por acá.
   */
  subscribe(matchId: string, onMessage: (msg: Message) => void, onReady?: () => void): () => void;
}

export interface ModerationService {
  report(userId: string, reason: ReportReason, details?: string): Promise<void>;
  block(userId: string): Promise<void>;
}

export const REPORT_REASONS: { value: ReportReason; label: string }[] = [
  { value: 'inappropriate', label: 'Contenido inapropiado' },
  { value: 'harassment', label: 'Acoso o lenguaje ofensivo' },
  { value: 'fake_profile', label: 'Perfil falso' },
  { value: 'spam', label: 'Spam o publicidad' },
  { value: 'other', label: 'Otro motivo' },
];
