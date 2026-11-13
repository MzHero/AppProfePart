// Perfil público de un usuario con sus reseñas. Lo usa el profesor para ver a un alumno antes
// de aceptarlo (desde Solicitudes) y desde el chat. Los perfiles de profesor van a teacher/[id].
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { EllipsisVertical } from 'lucide-react-native';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MatchCelebration } from '@/components/MatchCelebration';
import { ReportBlockSheet } from '@/components/ReportBlockSheet';
import { ReviewList } from '@/components/ReviewList';
import { Avatar, Button, ErrorState, LoadingView, RatingSummary } from '@/components/ui';
import { useIncomingRequests, usePublicProfile, useRespondRequest } from '@/hooks/queries';
import { useAppTheme } from '@/providers/AppThemeProvider';
import { useCurrentUser } from '@/providers/SessionProvider';

export default function UserProfileScreen() {
  const { colors } = useAppTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const me = useCurrentUser();
  const insets = useSafeAreaInsets();
  const { data: profile, isLoading, isError, refetch } = usePublicProfile(id);
  const incoming = useIncomingRequests();
  const respond = useRespondRequest();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [matchId, setMatchId] = useState<string | null>(null);

  if (isLoading) return <LoadingView />;
  if (isError || !profile)
    return <ErrorState message="Este perfil no está disponible." onRetry={refetch} />;

  // Profesor mirando a un alumno que le mandó una solicitud: puede responder desde acá.
  const pendingRequest =
    me.role === 'teacher' && incoming.data?.some((m) => m.student.id === profile.id);

  const answer = (accept: boolean) =>
    respond.mutate(
      { studentId: profile.id, accept },
      {
        onSuccess: ({ matchId: newMatchId }) => {
          if (accept && newMatchId) setMatchId(newMatchId);
          else router.back();
        },
        onError: (e) => Alert.alert('No se pudo responder', e.message),
      },
    );

  return (
    <>
      <Stack.Screen
        options={{
          title: profile.name,
          headerRight: () => (
            <Pressable
              onPress={() => setSheetOpen(true)}
              hitSlop={10}
              accessibilityLabel="Reportar o bloquear">
              <EllipsisVertical size={22} color={colors.fg} />
            </Pressable>
          ),
        }}
      />
      <ScrollView
        className="flex-1 bg-surface"
        contentContainerStyle={{ padding: 20, gap: 24, paddingBottom: insets.bottom + 24 }}>
        <View className="items-center gap-2">
          <Avatar uri={profile.avatarUrl} name={profile.name} size={96} />
          <Text className="text-2xl font-bold text-fg">{profile.name}</Text>
          <Text className="text-sm text-fg-muted">
            {profile.role === 'student' ? 'Alumno/a' : 'Profesor/a'}
          </Text>
          <RatingSummary rating={profile.rating} reviewCount={profile.reviewCount} size="md" />
        </View>

        {profile.bio ? <Text className="text-base leading-6 text-fg">{profile.bio}</Text> : null}

        {pendingRequest ? (
          <View className="gap-2">
            <Text className="text-sm text-fg-muted">
              {profile.name} quiere tomar clases con vos.
            </Text>
            <Button
              label="Aceptar solicitud"
              variant="brand"
              loading={respond.isPending && respond.variables?.accept === true}
              disabled={respond.isPending}
              onPress={() => answer(true)}
            />
            <Button
              label="Rechazar"
              variant="outline"
              loading={respond.isPending && respond.variables?.accept === false}
              disabled={respond.isPending}
              onPress={() => answer(false)}
            />
          </View>
        ) : null}

        <ReviewList userId={profile.id} rating={profile.rating} reviewCount={profile.reviewCount} />
      </ScrollView>

      <ReportBlockSheet
        visible={sheetOpen}
        onClose={() => setSheetOpen(false)}
        userId={profile.id}
        userName={profile.name}
        onBlocked={() => router.back()}
      />
      {matchId ? (
        <MatchCelebration
          visible
          me={{ name: me.name, avatarUrl: me.avatarUrl }}
          other={{ name: profile.name, avatarUrl: profile.avatarUrl }}
          subtitle={`Aceptaste a ${profile.name}. Escribile para coordinar la primera clase.`}
          onClose={() => {
            setMatchId(null);
            router.back();
          }}
          onChat={() => {
            const id = matchId;
            setMatchId(null);
            router.replace({ pathname: '/chat/[matchId]', params: { matchId: id } });
          }}
        />
      ) : null}
    </>
  );
}
