// Alumno: cuando un profesor acepta su solicitud, muestra la animación de match.
// Se entera en tiempo real (Realtime sobre matches) y también al volver a la app.
// Los matches ya festejados se guardan en el dispositivo para no repetir la animación.
import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

import { queryKeys, useConversations } from '@/hooks/queries';
import { getItem, setItem, storageKeys } from '@/lib/storage';
import { useCurrentUser } from '@/providers/SessionProvider';
import { matchService } from '@/services';
import type { Conversation } from '@/types/models';
import { MatchCelebration } from './MatchCelebration';

export function StudentMatchWatcher() {
  const user = useCurrentUser();
  const qc = useQueryClient();
  const { data: conversations, refetch } = useConversations();
  // undefined = cargando; null = primera vez en este dispositivo (sin base guardada).
  const [celebrated, setCelebrated] = useState<string[] | null | undefined>(undefined);
  const storageKey = storageKeys.celebratedMatches(user.id);

  useEffect(() => {
    getItem<string[]>(storageKey).then(setCelebrated);
  }, [storageKey]);

  // Match nuevo en tiempo real, o al volver a la app: recargar los chats.
  useEffect(() => {
    const unsubscribe = matchService.onNewMatch(() => {
      qc.invalidateQueries({ queryKey: queryKeys.conversations });
      qc.invalidateQueries({ queryKey: queryKeys.outgoing });
    });
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') refetch();
    });
    return () => {
      unsubscribe();
      sub.remove();
    };
  }, [qc, refetch]);

  // Primera vez en este dispositivo: los matches que ya existían no se festejan.
  useEffect(() => {
    if (celebrated !== null || !conversations) return;
    const base = conversations.map((c) => c.matchId);
    setItem(storageKey, base).then(() => setCelebrated(base));
  }, [celebrated, conversations, storageKey]);

  // El primer match todavía no festejado (se muestran de a uno).
  const current: Conversation | null =
    conversations && celebrated
      ? (conversations.find((c) => !celebrated.includes(c.matchId)) ?? null)
      : null;

  const dismiss = () => {
    if (!current || !celebrated) return;
    const next = [...celebrated, current.matchId];
    setCelebrated(next);
    setItem(storageKey, next);
  };

  if (!current) return null;
  return (
    <MatchCelebration
      visible
      me={{ name: user.name, avatarUrl: user.avatarUrl }}
      other={{ name: current.other.name, avatarUrl: current.other.avatarUrl }}
      subtitle={`${current.other.name} aceptó tu solicitud. Ya pueden chatear.`}
      onClose={dismiss}
      onChat={() => {
        const matchId = current.matchId;
        dismiss();
        router.push({ pathname: '/chat/[matchId]', params: { matchId } });
      }}
    />
  );
}
