// Punto único de acceso a datos. Las pantallas importan desde acá (vía hooks),
// nunca desde Supabase ni desde ./mock directamente.
export { authService } from './authService';
export type { ProfileUpdate, SignUpInput } from './authService';
export { chatService } from './chatService';
export { matchService } from './matchService';
export { moderationService, REPORT_REASONS } from './moderationService';
export { teacherService } from './teacherService';
export type { NearbyFilters } from './teacherService';
