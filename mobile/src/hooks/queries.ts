// Hooks de datos (TanStack Query). Las pantallas usan estos hooks; los hooks usan los servicios.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import {
  chatService,
  matchService,
  moderationService,
  teacherService,
  type NearbyFilters,
} from '@/services';
import type { Message, ReportReason } from '@/types/models';

export const queryKeys = {
  nearby: (f: Omit<NearbyFilters, 'coords'>) => ['teachers', 'nearby', f] as const,
  teacher: (id: string) => ['teachers', id] as const,
  swipeDeck: ['teachers', 'swipe-deck'] as const,
  incoming: ['matches', 'incoming'] as const,
  outgoing: ['matches', 'outgoing'] as const,
  match: (id: string) => ['matches', id] as const,
  conversations: ['conversations'] as const,
  messages: (matchId: string) => ['messages', matchId] as const,
};

// ---------- Profesores ----------

export function useNearbyTeachers(filters: NearbyFilters) {
  const { coords, ...key } = filters;
  return useQuery({
    queryKey: queryKeys.nearby(key),
    queryFn: () => teacherService.listNearby(filters),
  });
}

export function useTeacher(id: string) {
  return useQuery({ queryKey: queryKeys.teacher(id), queryFn: () => teacherService.getById(id) });
}

export function useSwipeDeck() {
  return useQuery({
    queryKey: queryKeys.swipeDeck,
    queryFn: () => teacherService.getSwipeDeck(),
    // El mazo se consume localmente; no refrescar en segundo plano para no reordenar tarjetas.
    staleTime: Infinity,
  });
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
    mutationFn: ({ matchId, accept }: { matchId: string; accept: boolean }) =>
      matchService.respond(matchId, accept),
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

/** Mensajes + suscripción en tiempo real (Supabase Realtime en el futuro). */
export function useMessages(matchId: string) {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: queryKeys.messages(matchId),
    queryFn: () => chatService.getMessages(matchId),
  });

  useEffect(() => {
    return chatService.subscribe(matchId, (msg) => {
      qc.setQueryData<Message[]>(queryKeys.messages(matchId), (prev = []) =>
        prev.some((m) => m.id === msg.id) ? prev : [...prev, msg],
      );
      qc.invalidateQueries({ queryKey: queryKeys.conversations });
    });
  }, [matchId, qc]);

  return query;
}

export function useSendMessage(matchId: string) {
  return useMutation({ mutationFn: (text: string) => chatService.sendMessage(matchId, text) });
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
