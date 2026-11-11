// Perfil completo de un profesor (desde la grilla o el botón "i" del swipe).
import { Image } from 'expo-image';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { BookOpen, EllipsisVertical, MapPin } from 'lucide-react-native';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ReportBlockSheet } from '@/components/ReportBlockSheet';
import { Button, ErrorState, LoadingView, Stars, SubjectTag } from '@/components/ui';
import { useLikeTeacher, useOutgoingPending, useTeacher } from '@/hooks/queries';
import { formatDistance } from '@/lib/format';
import { useCurrentUser } from '@/providers/SessionProvider';
import { useAppTheme } from '@/providers/AppThemeProvider';

export default function TeacherDetailScreen() {
  const { colors } = useAppTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const user = useCurrentUser();
  const insets = useSafeAreaInsets();
  const { data: teacher, isLoading, isError, refetch } = useTeacher(id);
  const { data: pending } = useOutgoingPending();
  const like = useLikeTeacher();
  const [sheetOpen, setSheetOpen] = useState(false);

  if (isLoading) return <LoadingView />;
  if (isError || !teacher)
    return <ErrorState message="Este perfil no está disponible." onRetry={refetch} />;

  const alreadyRequested = like.isSuccess || pending?.some((m) => m.teacher.id === teacher.id);

  const sendRequest = () =>
    like.mutate(teacher.id, {
      onSuccess: () =>
        Alert.alert('Solicitud enviada', `Te avisamos cuando ${teacher.name} responda.`),
      onError: (e) => Alert.alert('No se pudo enviar', e.message),
    });

  return (
    <>
      <Stack.Screen
        options={{
          title: teacher.name,
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
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}>
        <Image
          source={{ uri: teacher.avatarUrl }}
          style={{ width: '100%', height: 320 }}
          contentFit="cover"
        />

        <View className="gap-5 p-5">
          <View className="gap-1">
            <Stars rating={teacher.rating} size="md" />
            <View className="flex-row items-baseline justify-between">
              <Text className="flex-1 text-2xl font-bold text-fg">
                {teacher.name} ({teacher.age} años)
              </Text>
              <Text className="text-xl font-bold text-success">${teacher.hourlyRate}/h</Text>
            </View>
            <View className="flex-row items-center gap-1">
              <MapPin size={16} color={colors.fgMuted} />
              <Text className="text-sm text-fg-muted">
                Aprox. a {formatDistance(teacher.distanceKm)} de vos
              </Text>
            </View>
          </View>

          <Text className="text-base leading-6 text-fg">{teacher.bio}</Text>

          <View className="gap-2">
            <View className="flex-row items-center gap-2">
              <BookOpen size={18} color={colors.brand} />
              <Text className="text-base font-bold text-fg">Materias</Text>
            </View>
            <View className="flex-row flex-wrap gap-2">
              {teacher.subjects.map((s) => (
                <SubjectTag key={s} label={s} />
              ))}
            </View>
          </View>

          <View className="gap-2">
            <Text className="text-base font-bold text-fg">Trayectoria y CV</Text>
            <Text className="text-base leading-6 text-fg-muted">{teacher.cv}</Text>
          </View>

          <Text className="text-xs text-fg-soft">
            El precio y el pago de las clases se acuerdan directamente con el profesor.
          </Text>

          {user.role === 'student' ? (
            <Button
              label={alreadyRequested ? 'Solicitud enviada' : 'Me interesa'}
              disabled={alreadyRequested}
              loading={like.isPending}
              onPress={sendRequest}
            />
          ) : null}
        </View>
      </ScrollView>

      <ReportBlockSheet
        visible={sheetOpen}
        onClose={() => setSheetOpen(false)}
        userId={teacher.id}
        userName={teacher.name}
        onBlocked={() => router.back()}
      />
    </>
  );
}
