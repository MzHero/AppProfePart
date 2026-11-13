// Punto único de acceso a datos. Las pantallas importan desde acá (vía hooks),
// nunca desde Supabase ni desde ./mock directamente.
//
// Si mobile/.env.local define EXPO_PUBLIC_SUPABASE_URL y EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
// se usa Supabase; si no, los datos mock en memoria.
import { mockAuthService } from './mock/auth';
import { mockChatService } from './mock/chat';
import { mockMatchService } from './mock/matches';
import { mockModerationService } from './mock/moderation';
import { mockReviewService } from './mock/reviews';
import { mockSessionService } from './mock/sessions';
import { mockTeacherService } from './mock/teachers';
import { supabaseAuthService } from './supabase/auth';
import { supabaseChatService } from './supabase/chat';
import { isSupabaseConfigured } from './supabase/client';
import { supabaseMatchService } from './supabase/matches';
import { supabaseModerationService } from './supabase/moderation';
import { supabaseReviewService } from './supabase/reviews';
import { supabaseSessionService } from './supabase/sessions';
import { supabaseTeacherService } from './supabase/teachers';
import type {
  AuthService,
  ChatService,
  MatchService,
  ModerationService,
  ReviewService,
  SessionService,
  TeacherService,
} from './types';

export const backend: 'supabase' | 'mock' = isSupabaseConfigured ? 'supabase' : 'mock';

export const authService: AuthService = isSupabaseConfigured
  ? supabaseAuthService
  : mockAuthService;
export const teacherService: TeacherService = isSupabaseConfigured
  ? supabaseTeacherService
  : mockTeacherService;
export const matchService: MatchService = isSupabaseConfigured
  ? supabaseMatchService
  : mockMatchService;
export const chatService: ChatService = isSupabaseConfigured
  ? supabaseChatService
  : mockChatService;
export const moderationService: ModerationService = isSupabaseConfigured
  ? supabaseModerationService
  : mockModerationService;
export const sessionService: SessionService = isSupabaseConfigured
  ? supabaseSessionService
  : mockSessionService;
export const reviewService: ReviewService = isSupabaseConfigured
  ? supabaseReviewService
  : mockReviewService;

export { REPORT_REASONS } from './types';
export type { NearbyFilters, ProfileUpdate, SignUpInput, SignUpResult } from './types';
