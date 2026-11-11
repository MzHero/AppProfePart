import { Image } from 'expo-image';
import { Pressable, Text, View } from 'react-native';

import type { TeacherProfile } from '@/types/models';
import { DistanceBadge, Stars } from './ui';

export function TeacherGridCard({
  teacher,
  onPress,
}: {
  teacher: TeacherProfile;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Ver perfil de ${teacher.name}`}
      onPress={onPress}
      className="flex-1 overflow-hidden rounded-2xl border border-line bg-surface active:opacity-90">
      <View className="h-40">
        <Image
          source={{ uri: teacher.avatarUrl }}
          style={{ width: '100%', height: '100%' }}
          contentFit="cover"
          transition={150}
        />
        <View className="absolute left-1.5 top-1">
          <Stars rating={teacher.rating} />
        </View>
        <View className="absolute bottom-2 left-2">
          <DistanceBadge km={teacher.distanceKm} />
        </View>
      </View>
      <View className="gap-0.5 p-3">
        <Text className="text-base font-bold text-fg" numberOfLines={1}>
          {teacher.name}
        </Text>
        <Text className="text-sm text-fg-muted" numberOfLines={1}>
          {teacher.subjects[0]}
        </Text>
        <Text className="mt-1 text-sm font-semibold text-success">${teacher.hourlyRate}/h</Text>
      </View>
    </Pressable>
  );
}
