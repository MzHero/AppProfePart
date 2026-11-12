import { Image } from 'expo-image';
import { Pressable, Text, View } from 'react-native';

import { formatRate } from '@/lib/format';
import type { TeacherProfile } from '@/types/models';
import { DistanceBadge, Stars } from './ui';

export function TeacherGridCard({
  teacher,
  onPress,
  highlightSubject,
}: {
  teacher: TeacherProfile;
  onPress: () => void;
  /** Materia filtrada: se muestra esa en vez de la primera del profesor. */
  highlightSubject?: string;
}) {
  const subject =
    highlightSubject && teacher.subjects.includes(highlightSubject)
      ? highlightSubject
      : teacher.subjects[0];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Ver perfil de ${teacher.name}`}
      onPress={onPress}
      className="flex-1 overflow-hidden rounded-2xl border border-line bg-surface active:opacity-90">
      <View className="h-40 bg-brand-soft">
        <Image
          source={teacher.avatarUrl ? { uri: teacher.avatarUrl } : undefined}
          style={{ width: '100%', height: '100%' }}
          contentFit="cover"
          transition={150}
        />
        <View className="absolute left-1.5 top-1">
          <Stars rating={teacher.rating} />
        </View>
        {teacher.distanceKm !== null ? (
          <View className="absolute bottom-2 left-2">
            <DistanceBadge km={teacher.distanceKm} />
          </View>
        ) : null}
      </View>
      <View className="gap-0.5 p-3">
        <Text className="text-base font-bold text-fg" numberOfLines={1}>
          {teacher.name}
        </Text>
        <Text className="text-sm text-fg-muted" numberOfLines={1}>
          {subject}
          {teacher.subjects.length > 1 ? ` +${teacher.subjects.length - 1}` : ''}
        </Text>
        {formatRate(teacher.hourlyRate) ? (
          <Text className="mt-1 text-sm font-semibold text-success">
            {formatRate(teacher.hourlyRate)}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}
