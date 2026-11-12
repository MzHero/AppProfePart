import { Image } from 'expo-image';
import { Info } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';

import { formatRate } from '@/lib/format';
import type { TeacherProfile } from '@/types/models';
import { DistanceBadge, Stars, SubjectTag } from './ui';

/** Tarjeta del mazo de swipe (ver "Images/Pantalla_swipe.png"). */
export function TeacherSwipeCard({
  teacher,
  onInfo,
}: {
  teacher: TeacherProfile;
  onInfo: () => void;
}) {
  return (
    <View className="flex-1 overflow-hidden rounded-3xl bg-surface shadow-lg">
      <View className="flex-1 bg-brand-soft">
        {/* La foto no recibe toques: así el arrastre de la tarjeta funciona desde cualquier
            punto (en web, apretar sobre un <img> inicia el "arrastrar imagen" del navegador). */}
        <View pointerEvents="none" style={{ width: '100%', height: '100%' }}>
          <Image
            source={teacher.avatarUrl ? { uri: teacher.avatarUrl } : undefined}
            style={{ width: '100%', height: '100%' }}
            contentFit="cover"
          />
        </View>
        <View className="absolute bottom-3 left-3 gap-1">
          {teacher.distanceKm !== null ? <DistanceBadge km={teacher.distanceKm} /> : null}
          <Stars rating={teacher.rating} size="md" />
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Ver perfil completo"
          onPress={onInfo}
          hitSlop={8}
          className="absolute bottom-3 right-3 h-10 w-10 items-center justify-center rounded-full bg-brand">
          <Info size={20} color="#fff" />
        </Pressable>
      </View>
      <View className="gap-3 p-5">
        <View className="flex-row items-baseline justify-between">
          <Text className="flex-1 text-xl font-bold text-fg" numberOfLines={1}>
            {teacher.age !== null ? `${teacher.name}, ${teacher.age}` : teacher.name}
          </Text>
          {formatRate(teacher.hourlyRate) ? (
            <Text className="text-lg font-bold text-success">{formatRate(teacher.hourlyRate)}</Text>
          ) : null}
        </View>
        <View className="flex-row flex-wrap gap-2">
          {teacher.subjects.map((s) => (
            <SubjectTag key={s} label={s} />
          ))}
        </View>
        <Text className="text-base leading-6 text-fg" numberOfLines={3}>
          {teacher.bio}
        </Text>
      </View>
    </View>
  );
}
