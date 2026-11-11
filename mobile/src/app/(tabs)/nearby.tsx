// Búsqueda por distancia y materia. Pantalla de referencia: "Images /pantalla_por_ubi.png"
import { router } from 'expo-router';
import { Search, SlidersHorizontal } from 'lucide-react-native';
import { useDeferredValue, useState } from 'react';
import {
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';

import { TeacherGridCard } from '@/components/TeacherGridCard';
import { Chip, EmptyState, ErrorState, LoadingView, Screen } from '@/components/ui';
import { useNearbyTeachers } from '@/hooks/queries';
import { useCurrentLocation } from '@/hooks/useCurrentLocation';
import { DISTANCE_FILTERS_KM, formatDistance } from '@/lib/format';
import { useAppTheme } from '@/providers/AppThemeProvider';

export default function NearbyScreen() {
  const { colors } = useAppTheme();
  const [maxDistanceKm, setMaxDistanceKm] = useState<number>(
    DISTANCE_FILTERS_KM[DISTANCE_FILTERS_KM.length - 1],
  );
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query);
  const { coords, status: locationStatus } = useCurrentLocation();
  const { data, isLoading, isError, refetch, isRefetching } = useNearbyTeachers({
    maxDistanceKm,
    query: deferredQuery,
    coords,
  });

  return (
    <Screen>
      <View className="gap-3 border-b border-line bg-surface px-4 pb-3 pt-3">
        <View className="flex-row items-center gap-2">
          <View className="h-12 flex-1 flex-row items-center gap-2 rounded-2xl border border-line-brand bg-muted px-3">
            <Search size={20} color={colors.fgMuted} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Buscar materia o profe..."
              placeholderTextColor={colors.fgSoft}
              className="flex-1 text-base text-fg"
              returnKeyType="search"
              autoCorrect={false}
            />
          </View>
          {/* TODO: abrir filtros avanzados (precio, rating, modalidad) */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Filtros"
            className="h-12 w-12 items-center justify-center rounded-2xl border border-line bg-muted">
            <SlidersHorizontal size={20} color={colors.fg} />
          </Pressable>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerClassName="gap-2">
          {DISTANCE_FILTERS_KM.map((km) => (
            <Chip
              key={km}
              label={formatDistance(km)}
              active={maxDistanceKm === km}
              onPress={() => setMaxDistanceKm(km)}
            />
          ))}
        </ScrollView>
        {locationStatus === 'denied' ? (
          <Text className="text-xs text-fg-muted">
            Sin permiso de ubicación: las distancias pueden no ser precisas.
          </Text>
        ) : null}
      </View>

      {isLoading ? (
        <LoadingView />
      ) : isError ? (
        <ErrorState onRetry={refetch} />
      ) : (
        <FlatList
          // Con cantidad impar se agrega un hueco para que la última tarjeta no ocupe todo el ancho.
          data={data && data.length % 2 ? [...data, null] : data}
          keyExtractor={(t) => t?.id ?? 'spacer'}
          numColumns={2}
          columnWrapperClassName="gap-3"
          contentContainerClassName="gap-3 p-4 flex-grow"
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={() => void refetch()}
              tintColor={colors.brand}
            />
          }
          renderItem={({ item }) =>
            item ? (
              <TeacherGridCard
                teacher={item}
                onPress={() => router.push({ pathname: '/teacher/[id]', params: { id: item.id } })}
              />
            ) : (
              <View className="flex-1" />
            )
          }
          ListEmptyComponent={
            <EmptyState
              title="No hay profesores en este radio"
              description="Probá ampliar la distancia o buscar otra materia."
            />
          }
        />
      )}
    </Screen>
  );
}
