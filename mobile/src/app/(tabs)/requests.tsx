// Profesor: solicitudes recibidas (aceptar / rechazar).
import { router } from 'expo-router';
import { Check, X } from 'lucide-react-native';
import { useState } from 'react';
import { Alert, FlatList, Pressable, RefreshControl, Text, View } from 'react-native';

import { MatchCelebration } from '@/components/MatchCelebration';
import {
  Avatar,
  EmptyState,
  ErrorState,
  LoadingView,
  RatingSummary,
  Screen,
  ScreenTitle,
} from '@/components/ui';
import { useIncomingRequests, useRespondRequest } from '@/hooks/queries';
import { formatChatTime } from '@/lib/format';
import { useRefetchOnFocus } from '@/hooks/useRefetchOnFocus';
import { useAppTheme } from '@/providers/AppThemeProvider';
import { useCurrentUser } from '@/providers/SessionProvider';
import type { PublicUser } from '@/types/models';

export default function RequestsScreen() {
  const { colors } = useAppTheme();
  const { data, isLoading, isError, refetch, isRefetching } = useIncomingRequests();
  useRefetchOnFocus(refetch);
  const respond = useRespondRequest();
  const me = useCurrentUser();
  const [match, setMatch] = useState<{ matchId: string; student: PublicUser } | null>(null);

  const answer = (student: PublicUser, accept: boolean) =>
    respond.mutate(
      { studentId: student.id, accept },
      {
        onSuccess: ({ matchId }) => {
          if (accept && matchId) setMatch({ matchId, student });
        },
        onError: (e) => Alert.alert('No se pudo responder', e.message),
      },
    );

  return (
    <Screen>
      <ScreenTitle>Solicitudes</ScreenTitle>
      {isLoading ? (
        <LoadingView />
      ) : isError ? (
        <ErrorState onRetry={refetch} />
      ) : (
        <FlatList
          data={data}
          keyExtractor={(m) => m.id}
          contentContainerClassName="gap-3 px-4 pb-6 flex-grow"
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={() => void refetch()}
              tintColor={colors.brand}
            />
          }
          renderItem={({ item }) => {
            const busy = respond.isPending && respond.variables?.studentId === item.student.id;
            return (
              <View className="flex-row items-center gap-3 rounded-2xl border border-line bg-surface p-3">
                {/* Tocar al alumno abre su perfil con sus reseñas (antes de aceptar). */}
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Ver el perfil y las reseñas de ${item.student.name}`}
                  onPress={() =>
                    router.push({ pathname: '/user/[id]', params: { id: item.student.id } })
                  }
                  className="flex-1 flex-row items-center gap-3 active:opacity-70">
                  <Avatar uri={item.student.avatarUrl} name={item.student.name} size={52} />
                  <View className="flex-1 gap-0.5">
                    <Text className="text-base font-bold text-fg">{item.student.name}</Text>
                    <RatingSummary
                      rating={item.student.rating ?? 0}
                      reviewCount={item.student.reviewCount ?? 0}
                    />
                    <Text className="text-xs text-fg-soft">
                      Quiere tomar clases · {formatChatTime(item.createdAt)} · Ver perfil
                    </Text>
                  </View>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Rechazar a ${item.student.name}`}
                  disabled={busy}
                  onPress={() => answer(item.student, false)}
                  className="h-11 w-11 items-center justify-center rounded-full bg-accent-soft">
                  <X size={22} color={colors.accent} />
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Aceptar a ${item.student.name}`}
                  disabled={busy}
                  onPress={() => answer(item.student, true)}
                  className="h-11 w-11 items-center justify-center rounded-full bg-success-soft">
                  <Check size={22} color={colors.success} />
                </Pressable>
              </View>
            );
          }}
          ListEmptyComponent={
            <EmptyState
              title="No tenés solicitudes pendientes"
              description="Cuando un alumno te dé like, vas a verlo acá."
            />
          }
        />
      )}
      {match ? (
        <MatchCelebration
          visible
          me={{ name: me.name, avatarUrl: me.avatarUrl }}
          other={{ name: match.student.name, avatarUrl: match.student.avatarUrl }}
          subtitle={`Aceptaste a ${match.student.name}. Escribile para coordinar la primera clase.`}
          onClose={() => setMatch(null)}
          onChat={() => {
            const { matchId } = match;
            setMatch(null);
            router.push({ pathname: '/chat/[matchId]', params: { matchId } });
          }}
        />
      ) : null}
    </Screen>
  );
}
