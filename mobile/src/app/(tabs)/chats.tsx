// Lista de conversaciones. Pantalla de referencia: "Images/PantallaChat.png"
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Clock } from 'lucide-react-native';
import { FlatList, Pressable, RefreshControl, Text, View } from 'react-native';

import {
  EmptyState,
  ErrorState,
  InitialAvatar,
  LoadingView,
  Screen,
  ScreenTitle,
} from '@/components/ui';
import { useConversations, useOutgoingPending } from '@/hooks/queries';
import { formatChatTime } from '@/lib/format';
import { useCurrentUser } from '@/providers/SessionProvider';
import { useAppTheme } from '@/providers/AppThemeProvider';

export default function ChatsScreen() {
  const { colors } = useAppTheme();
  const user = useCurrentUser();
  const { data, isLoading, isError, refetch, isRefetching } = useConversations();

  return (
    <Screen>
      <ScreenTitle>Mensajes</ScreenTitle>
      {isLoading ? (
        <LoadingView />
      ) : isError ? (
        <ErrorState onRetry={refetch} />
      ) : (
        <FlatList
          data={data}
          keyExtractor={(c) => c.matchId}
          contentContainerClassName="gap-3 px-4 pb-6 flex-grow"
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={() => void refetch()}
              tintColor={colors.brand}
            />
          }
          ListHeaderComponent={user.role === 'student' ? <PendingRequests /> : undefined}
          renderItem={({ item }) => (
            <Pressable
              accessibilityRole="button"
              onPress={() =>
                router.push({ pathname: '/chat/[matchId]', params: { matchId: item.matchId } })
              }
              className="flex-row items-center gap-3 rounded-2xl border border-line bg-surface p-3 active:opacity-80">
              {item.other.avatarUrl ? (
                <Image
                  source={{ uri: item.other.avatarUrl }}
                  style={{ width: 56, height: 56, borderRadius: 28 }}
                />
              ) : (
                <InitialAvatar name={item.other.name} />
              )}
              <View className="flex-1 gap-0.5">
                <View className="flex-row items-center justify-between">
                  <Text className="flex-1 text-base font-bold text-fg" numberOfLines={1}>
                    {item.other.name}
                  </Text>
                  {item.lastMessage ? (
                    <Text className="text-sm text-fg">
                      {formatChatTime(item.lastMessage.createdAt)}
                    </Text>
                  ) : null}
                </View>
                <Text className="text-sm text-fg-muted" numberOfLines={1}>
                  {item.lastMessage?.text ?? '¡Nuevo match! Empezá la conversación'}
                </Text>
              </View>
            </Pressable>
          )}
          ListEmptyComponent={
            <EmptyState
              title="Todavía no tenés chats"
              description={
                user.role === 'student'
                  ? 'Cuando un profesor acepte tu solicitud, vas a poder escribirle acá.'
                  : 'Aceptá solicitudes para empezar a chatear con alumnos.'
              }
            />
          }
        />
      )}
    </Screen>
  );
}

/** Alumno: solicitudes enviadas que el profesor todavía no respondió. */
function PendingRequests() {
  const { colors } = useAppTheme();
  const { data } = useOutgoingPending();
  if (!data?.length) return null;
  return (
    <View className="mb-2 gap-2">
      <Text className="text-xs font-semibold uppercase tracking-wide text-fg-muted">
        Esperando respuesta
      </Text>
      {data.map((m) => (
        <View
          key={m.id}
          className="flex-row items-center gap-3 rounded-2xl border border-dashed border-line-brand bg-surface/60 p-3">
          <Clock size={18} color={colors.fgMuted} />
          <Text className="flex-1 text-sm text-fg-muted" numberOfLines={1}>
            {m.teacher.name}
          </Text>
        </View>
      ))}
    </View>
  );
}
