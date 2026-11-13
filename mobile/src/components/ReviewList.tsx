// Reseñas que recibió un usuario (alumno o profesor), con su promedio.
import { ActivityIndicator, Text, View } from 'react-native';

import { useUserReviews } from '@/hooks/queries';
import { formatShortDate } from '@/lib/format';
import { useAppTheme } from '@/providers/AppThemeProvider';
import { Avatar, RatingSummary, Stars } from './ui';

export function ReviewList({
  userId,
  rating,
  reviewCount,
}: {
  userId: string;
  rating: number;
  reviewCount: number;
}) {
  const { colors } = useAppTheme();
  const { data, isLoading, isError } = useUserReviews(userId);

  return (
    <View className="gap-3">
      <View className="gap-1">
        <Text className="text-base font-bold text-fg">Reseñas</Text>
        <RatingSummary rating={rating} reviewCount={reviewCount} />
      </View>

      {isLoading ? (
        <ActivityIndicator color={colors.brand} />
      ) : isError ? (
        <Text className="text-sm text-fg-muted">No pudimos cargar las reseñas.</Text>
      ) : data && data.length > 0 ? (
        data.map((r) => (
          <View key={r.id} className="gap-2 rounded-2xl border border-line bg-background p-3">
            <View className="flex-row items-center gap-2">
              <Avatar uri={r.reviewer.avatarUrl} name={r.reviewer.name} size={32} />
              <View className="flex-1">
                <Text className="text-sm font-semibold text-fg">{r.reviewer.name}</Text>
                <Text className="text-xs text-fg-soft">{formatShortDate(r.createdAt)}</Text>
              </View>
              <Stars rating={r.rating} />
            </View>
            {r.comment ? <Text className="text-sm leading-5 text-fg">{r.comment}</Text> : null}
          </View>
        ))
      ) : (
        <Text className="text-sm text-fg-muted">
          Las reseñas aparecen cuando alguien termina una sesión de estudio.
        </Text>
      )}
    </View>
  );
}
