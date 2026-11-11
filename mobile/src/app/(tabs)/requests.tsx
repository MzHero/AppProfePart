// Profesor: solicitudes recibidas (aceptar / rechazar).
import { Image } from 'expo-image';
import { Check, X } from 'lucide-react-native';
import { FlatList, Pressable, RefreshControl, Text, View } from 'react-native';

import {
  EmptyState,
  ErrorState,
  InitialAvatar,
  LoadingView,
  Screen,
  ScreenTitle,
} from '@/components/ui';
import { useIncomingRequests, useRespondRequest } from '@/hooks/queries';
import { formatChatTime } from '@/lib/format';
import { useAppTheme } from '@/providers/AppThemeProvider';

export default function RequestsScreen() {
  const { colors } = useAppTheme();
  const { data, isLoading, isError, refetch, isRefetching } = useIncomingRequests();
  const respond = useRespondRequest();

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
            const busy = respond.isPending && respond.variables?.matchId === item.id;
            return (
              <View className="flex-row items-center gap-3 rounded-2xl border border-line bg-surface p-3">
                {item.student.avatarUrl ? (
                  <Image
                    source={{ uri: item.student.avatarUrl }}
                    style={{ width: 52, height: 52, borderRadius: 26 }}
                  />
                ) : (
                  <InitialAvatar name={item.student.name} size={52} />
                )}
                <View className="flex-1">
                  <Text className="text-base font-bold text-fg">{item.student.name}</Text>
                  <Text className="text-sm text-fg-muted">
                    Quiere tomar clases · {formatChatTime(item.createdAt)}
                  </Text>
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Rechazar a ${item.student.name}`}
                  disabled={busy}
                  onPress={() => respond.mutate({ matchId: item.id, accept: false })}
                  className="h-11 w-11 items-center justify-center rounded-full bg-accent-soft">
                  <X size={22} color={colors.accent} />
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Aceptar a ${item.student.name}`}
                  disabled={busy}
                  onPress={() => respond.mutate({ matchId: item.id, accept: true })}
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
    </Screen>
  );
}
