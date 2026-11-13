// Hooks de datos (TanStack Query). Las pantallas usan estos hooks; los hooks usan los servicios.
import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import {
  chatService,
  matchService,
  moderationService,
  reviewService,
  sessionService,
  teacherService,
  type NearbyFilters,
} from '@/services';
import type { Coords, Message, ReportReason, TeacherProfile } from '@/types/models';

/** Coordenadas redondeadas (~100 m) para las claves de caché: no refetchear por centímetros. */
const coordsKey = (c?: Coords | null) =>
  c ? `${c.latitude.toFixed(3)},${c.longitude.toFixed(3)}` : 'sin-ubicacion';

export const queryKeys = {
  nearby: (f: Omit<NearbyFilters, 'coords'>, c?: Coords | null) =>
    ['teachers', 'nearby', f, coordsKey(c)] as const,
  subjects: (maxDistanceKm: number, c?: Coords | null) =>
    ['teachers', 'subjects', maxDistanceKm, coordsKey(c)] as const,
  teacher: (id: string, c?: Coords | null) => ['teachers', id, coordsKey(c)] as const,
  swipeDeck: (c?: Coords | null) => ['teachers', 'swipe-deck', coordsKey(c)] as const,
  incoming: ['matches', 'incoming'] as const,
  outgoing: ['matches', 'outgoing'] as const,
  match: (id: string) => ['matches', id] as const,
  conversations: ['conversations'] as const,
  messages: (matchId: string) => ['messages', matchId] as const,
  session: (matchId: string) => ['sessions', matchId] as const,
  reviews: (userId: string) => ['reviews', userId] as const,
  profile: (userId: string) => ['profiles', userId] as const,
};

// ---------- Profesores ----------

// `enabled`: pasar false mientras se resuelve el permiso de ubicación, para no consultar
// dos veces (sin y con coordenadas).

export function useNearbyTeachers(filters: NearbyFilters, enabled = true) {
  const { coords, ...key } = filters;
  return useQuery({
    queryKey: queryKeys.nearby(key, coords),
    queryFn: () => teacherService.listNearby(filters),
    enabled,
  });
}

/** Materias para el desplegable de "Cercanos", con cuántos profesores hay en el radio. */
export function useSubjects(maxDistanceKm: number, coords?: Coords | null, enabled = true) {
  return useQuery({
    queryKey: queryKeys.subjects(maxDistanceKm, coords),
    queryFn: () => teacherService.listSubjects({ maxDistanceKm, coords }),
    enabled,
  });
}

export function useTeacher(id: string, coords?: Coords | null, enabled = true) {
  const qc = useQueryClient();
  return useQuery({
    queryKey: queryKeys.teacher(id, coords),
    queryFn: () => teacherService.getById(id, coords),
    enabled,
    // Se muestra al instante con los datos que ya trajo la grilla o el mazo,
    // mientras se actualiza en segundo plano.
    placeholderData: () => findCachedTeacher(qc, id),
  });
}

function findCachedTeacher(qc: QueryClient, id: string): TeacherProfile | undefined {
  for (const [, data] of qc.getQueriesData<TeacherProfile[]>({ queryKey: ['teachers'] })) {
    if (!Array.isArray(data)) continue;
    const found = data.find((t) => t.id === id);
    if (found) return found;
  }
  return undefined;
}

/** Carga el mazo de "Descubrir" en segundo plano (desde "Cercanos"), para que abra al instante. */
export function usePrefetchSwipeDeck(coords?: Coords | null, enabled = true) {
  const qc = useQueryClient();
  useEffect(() => {
    if (!enabled) return;
    qc.prefetchQuery({
      queryKey: queryKeys.swipeDeck(coords),
      queryFn: () => teacherService.getSwipeDeck(coords),
      staleTime: Infinity,
    });
  }, [qc, coords, enabled]);
}

export function useSwipeDeck(coords?: Coords | null, enabled = true) {
  return useQuery({
    // Incluye la ubicación: si el usuario se mueve, las distancias del mazo se recalculan.
    queryKey: queryKeys.swipeDeck(coords),
    queryFn: () => teacherService.getSwipeDeck(coords),
    enabled,
    // El mazo se consume localmente; no refrescar en segundo plano para no reordenar tarjetas.
    staleTime: Infinity,
  });
}

/** Profesor: guarda su ubicación para aparecer en las búsquedas por distancia. */
export function useUpdateMyLocation() {
  return useMutation({ mutationFn: (coords: Coords) => teacherService.updateMyLocation(coords) });
}

// ---------- Matches ----------

export function useLikeTeacher() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (teacherId: string) => matchService.like(teacherId),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.outgoing }),
  });
}

export function usePassTeacher() {
  return useMutation({ mutationFn: (teacherId: string) => matchService.pass(teacherId) });
}

export function useIncomingRequests() {
  return useQuery({ queryKey: queryKeys.incoming, queryFn: () => matchService.listIncoming() });
}

export function useOutgoingPending() {
  return useQuery({
    queryKey: queryKeys.outgoing,
    queryFn: () => matchService.listOutgoingPending(),
  });
}

export function useRespondRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ studentId, accept }: { studentId: string; accept: boolean }) =>
      matchService.respond(studentId, accept),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.incoming });
      qc.invalidateQueries({ queryKey: queryKeys.conversations });
    },
  });
}

export function useMatch(matchId: string) {
  return useQuery({
    queryKey: queryKeys.match(matchId),
    queryFn: () => matchService.getById(matchId),
  });
}

// ---------- Chat ----------

export function useConversations() {
  return useQuery({
    queryKey: queryKeys.conversations,
    queryFn: () => chatService.listConversations(),
  });
}

/** Mensajes + suscripción en tiempo real (Supabase Realtime). */
export function useMessages(matchId: string) {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: queryKeys.messages(matchId),
    queryFn: () => chatService.getMessages(matchId),
  });

  useEffect(() => {
    return chatService.subscribe(
      matchId,
      (msg) => {
        qc.setQueryData<Message[]>(queryKeys.messages(matchId), (prev = []) =>
          prev.some((m) => m.id === msg.id) ? prev : [...prev, msg],
        );
        qc.invalidateQueries({ queryKey: queryKeys.conversations });
      },
      // Suscripción activa (o reconectada): recargar para no perder mensajes del intervalo.
      () => qc.invalidateQueries({ queryKey: queryKeys.messages(matchId) }),
    );
  }, [matchId, qc]);

  return query;
}

export function useSendMessage(matchId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (text: string) => chatService.sendMessage(matchId, text),
    // Se agrega ya, sin esperar el evento de tiempo real (que llega después y se descarta por id).
    onSuccess: (msg) => {
      qc.setQueryData<Message[]>(queryKeys.messages(matchId), (prev = []) =>
        prev.some((m) => m.id === msg.id) ? prev : [...prev, msg],
      );
      qc.invalidateQueries({ queryKey: queryKeys.conversations });
    },
  });
}

// ---------- Sesiones de estudio y reseñas ----------

/** Última sesión del match, actualizada en tiempo real cuando el otro la inicia o la termina. */
export function useStudySession(matchId: string) {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: queryKeys.session(matchId),
    queryFn: () => sessionService.getCurrent(matchId),
  });

  useEffect(
    () =>
      sessionService.subscribe(matchId, () =>
        qc.invalidateQueries({ queryKey: queryKeys.session(matchId) }),
      ),
    [matchId, qc],
  );

  // El vencimiento (24 h) no genera ningún evento: recargar justo cuando vence.
  const open = query.data && query.data.status !== 'closed' && query.data.status !== 'cancelled';
  const closesAt = open ? query.data?.closesAt : undefined;
  useEffect(() => {
    if (!closesAt) return;
    const ms = new Date(closesAt).getTime() - Date.now();
    if (ms > 2_147_000_000) return; // fuera del rango de setTimeout
    const timer = setTimeout(
      () => qc.invalidateQueries({ queryKey: queryKeys.session(matchId) }),
      Math.max(ms, 0) + 1000,
    );
    return () => clearTimeout(timer);
  }, [closesAt, matchId, qc]);

  return query;
}

export function useStartSession(matchId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => sessionService.start(matchId),
    onSettled: () => qc.invalidateQueries({ queryKey: queryKeys.session(matchId) }),
  });
}

export function useAcceptSession(matchId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (sessionId: string) => sessionService.accept(sessionId),
    onSettled: () => qc.invalidateQueries({ queryKey: queryKeys.session(matchId) }),
  });
}

export function useCancelSession(matchId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (sessionId: string) => sessionService.cancel(sessionId),
    onSettled: () => qc.invalidateQueries({ queryKey: queryKeys.session(matchId) }),
  });
}

export function useEndSession(matchId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (sessionId: string) => sessionService.end(sessionId),
    onSettled: () => qc.invalidateQueries({ queryKey: queryKeys.session(matchId) }),
  });
}

export function useSubmitReview(matchId: string, revieweeId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { sessionId: string; rating: number; comment?: string }) =>
      reviewService.submit(v.sessionId, v.rating, v.comment),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.session(matchId) });
      qc.invalidateQueries({ queryKey: queryKeys.reviews(revieweeId) });
      qc.invalidateQueries({ queryKey: queryKeys.profile(revieweeId) });
      // El promedio aparece en la grilla, el mazo y las solicitudes.
      qc.invalidateQueries({ queryKey: ['teachers'] });
      qc.invalidateQueries({ queryKey: queryKeys.incoming });
    },
  });
}

export function useUserReviews(userId: string) {
  return useQuery({
    queryKey: queryKeys.reviews(userId),
    queryFn: () => reviewService.listFor(userId),
  });
}

export function usePublicProfile(userId: string) {
  return useQuery({
    queryKey: queryKeys.profile(userId),
    queryFn: () => reviewService.getProfile(userId),
  });
}

// ---------- Moderación ----------

export function useReportUser() {
  return useMutation({
    mutationFn: (v: { userId: string; reason: ReportReason; details?: string }) =>
      moderationService.report(v.userId, v.reason, v.details),
  });
}

export function useBlockUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => moderationService.block(userId),
    // Un bloqueo afecta grilla, swipe y chats.
    onSuccess: () => qc.invalidateQueries(),
  });
}
