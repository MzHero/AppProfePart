// Búsqueda por distancia y materia. Pantalla de referencia: "Images/pantalla_por_ubi.png"
import { router } from 'expo-router';
import { Search, SlidersHorizontal, X } from 'lucide-react-native';
import { useCallback, useDeferredValue, useState } from 'react';
import {
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';

import { SubjectDropdown } from '@/components/SubjectDropdown';
import { TeacherGridCard } from '@/components/TeacherGridCard';
import { Chip, EmptyState, ErrorState, LoadingView, Screen } from '@/components/ui';
import { useNearbyTeachers, usePrefetchSwipeDeck, useSubjects } from '@/hooks/queries';
import { refreshLocation, useCurrentLocation } from '@/hooks/useCurrentLocation';
import { useRefetchOnFocus } from '@/hooks/useRefetchOnFocus';
import { DISTANCE_FILTERS_KM, formatDistance } from '@/lib/format';
import { useAppTheme } from '@/providers/AppThemeProvider';

export default function NearbyScreen() {
  const { colors } = useAppTheme();
  const [maxDistanceKm, setMaxDistanceKm] = useState<number>(
    DISTANCE_FILTERS_KM[DISTANCE_FILTERS_KM.length - 1],
  );
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query);
  const [subjectId, setSubjectId] = useState<string | null>(null);
  const [subjectsOpen, setSubjectsOpen] = useState(false);
  const { coords, status: locationStatus } = useCurrentLocation();
  const locating = locationStatus === 'loading';
  const { data, isLoading, isError, refetch, isRefetching } = useNearbyTeachers(
    { maxDistanceKm, query: deferredQuery, subjectId, coords },
    !locating,
  );
  const subjects = useSubjects(maxDistanceKm, coords, !locating);
  usePrefetchSwipeDeck(coords, !locating);
  const refetchSubjects = subjects.refetch;
  const selectedSubject = subjects.data?.find((s) => s.id === subjectId);
  const pickSubject = (id: string | null) => {
    setSubjectId(id);
    setSubjectsOpen(false);
  };
  // Al volver a la pestaña: renovar la ubicación si es vieja y recargar la lista.
  useRefetchOnFocus(
    useCallback(() => {
      refreshLocation();
      refetch();
      refetchSubjects();
    }, [refetch, refetchSubjects]),
  );
  // Deslizar para actualizar: fuerza una lectura nueva de la ubicación.
  const onPullRefresh = useCallback(async () => {
    await refreshLocation(true);
    refetch();
  }, [refetch]);

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
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Filtrar por materia"
            accessibilityState={{ expanded: subjectsOpen }}
            onPress={() => setSubjectsOpen((v) => !v)}
            className={`h-12 w-12 items-center justify-center rounded-2xl border ${subjectId || subjectsOpen ? 'border-brand bg-brand' : 'border-line bg-muted'}`}>
            <SlidersHorizontal size={20} color={subjectId || subjectsOpen ? '#fff' : colors.fg} />
          </Pressable>
        </View>
        {subjectsOpen ? (
          <SubjectDropdown
            subjects={subjects.data}
            isLoading={locating || subjects.isLoading}
            selectedId={subjectId}
            onSelect={pickSubject}
          />
        ) : null}
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
        {subjectId ? (
          <View className="flex-row">
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Quitar filtro de materia ${selectedSubject?.name ?? ''}`}
              onPress={() => setSubjectId(null)}
              className="flex-row items-center gap-1.5 rounded-full bg-brand-soft py-1.5 pl-3 pr-2">
              <Text className="text-sm font-semibold text-brand-fg">
                Materia: {selectedSubject?.name ?? '…'}
              </Text>
              <X size={16} color={colors.brandFg} />
            </Pressable>
          </View>
        ) : null}
        {locationStatus === 'denied' || locationStatus === 'error' ? (
          <Text className="text-xs text-fg-muted">
            Sin acceso a tu ubicación: se muestran todos los profesores, sin filtrar por distancia.
          </Text>
        ) : null}
      </View>

      {locating || isLoading ? (
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
              onRefresh={() => void onPullRefresh()}
              tintColor={colors.brand}
            />
          }
          renderItem={({ item }) =>
            item ? (
              <TeacherGridCard
                teacher={item}
                highlightSubject={selectedSubject?.name}
                onPress={() => router.push({ pathname: '/teacher/[id]', params: { id: item.id } })}
              />
            ) : (
              <View className="flex-1" />
            )
          }
          ListEmptyComponent={
            <EmptyState
              title={
                selectedSubject
                  ? `No hay profesores de ${selectedSubject.name} en este radio`
                  : 'No hay profesores en este radio'
              }
              description="Probá ampliar la distancia o elegir otra materia."
            />
          }
        />
      )}
    </Screen>
  );
}
