// Swipe estilo Tinder. Pantalla de referencia: "Images/Pantalla_swipe.png"
// Derecha = like (crea solicitud 'pending'), izquierda = descartar.
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Heart, X } from 'lucide-react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, View } from 'react-native';

import { DiscoverIntroModal } from '@/components/DiscoverIntroModal';
import { SwipeDeck, type SwipeDeckHandle } from '@/components/SwipeDeck';
import { TeacherSwipeCard } from '@/components/TeacherSwipeCard';
import { Button, EmptyState, ErrorState, LoadingView, RoundButton, Screen } from '@/components/ui';
import { useLikeTeacher, usePassTeacher, useSwipeDeck } from '@/hooks/queries';
import { useCurrentLocation } from '@/hooks/useCurrentLocation';
import { getItem, setItem, storageKeys } from '@/lib/storage';
import { useAppTheme } from '@/providers/AppThemeProvider';
import type { TeacherProfile } from '@/types/models';

/** Cuántas fotos de las próximas tarjetas se descargan por adelantado. */
const PREFETCH = 6;

export default function SwipeScreen() {
  const { colors } = useAppTheme();
  const { coords, status: locationStatus } = useCurrentLocation();
  const locating = locationStatus === 'loading';
  const {
    data: deck,
    isLoading,
    isError,
    refetch,
    dataUpdatedAt,
  } = useSwipeDeck(coords, !locating);
  const like = useLikeTeacher();
  const pass = usePassTeacher();
  const deckRef = useRef<SwipeDeckHandle>(null);
  const [finished, setFinished] = useState(false);
  const [showIntro, setShowIntro] = useState(false);

  // Explicación de cómo funciona: solo la primera vez que se entra a Descubrir.
  useEffect(() => {
    getItem<boolean>(storageKeys.discoverIntroSeen).then((seen) => {
      if (!seen) setShowIntro(true);
    });
  }, []);
  const closeIntro = () => {
    setShowIntro(false);
    setItem(storageKeys.discoverIntroSeen, true);
  };

  // Las fotos de las primeras tarjetas se bajan ya, así el swipe no muestra huecos.
  useEffect(() => {
    const urls = (deck ?? [])
      .slice(0, PREFETCH)
      .map((t) => t.avatarUrl)
      .filter((u): u is string => Boolean(u));
    if (urls.length) Image.prefetch(urls).catch(() => {});
  }, [deck]);

  const onSwipe = useCallback(
    (teacher: TeacherProfile, direction: 'left' | 'right') => {
      // Sin cartel después de cada like: la explicación se muestra una sola vez al entrar.
      if (direction === 'right') {
        like.mutate(teacher.id, {
          onError: (e) => Alert.alert('No se pudo enviar la solicitud', e.message),
        });
      } else {
        pass.mutate(teacher.id);
      }
    },
    [like, pass],
  );
  const onEmpty = useCallback(() => setFinished(true), []);

  const restart = () => {
    setFinished(false);
    refetch();
  };

  let content;
  if (locating || isLoading) {
    content = <LoadingView />;
  } else if (isError || !deck) {
    content = <ErrorState onRetry={refetch} />;
  } else if (deck.length === 0 || finished) {
    content = (
      <EmptyState
        title="No hay más profesores por ahora"
        description="Volvé más tarde o buscá por materia en la pestaña Cercanos."
        action={<Button label="Buscar de nuevo" variant="brand" onPress={restart} />}
      />
    );
  } else {
    content = (
      <>
        <View className="flex-1 p-4">
          {/* El mazo se posiciona absoluto: esta vista interna respeta el padding de afuera. */}
          <View className="flex-1">
            <SwipeDeck
              // Un mazo nuevo (recarga o cambio de ubicación) arranca desde la primera tarjeta.
              key={dataUpdatedAt}
              ref={deckRef}
              items={deck}
              keyExtractor={(t) => t.id}
              onSwipe={onSwipe}
              onEmpty={onEmpty}
              renderCard={(teacher) => (
                <TeacherSwipeCard
                  teacher={teacher}
                  onInfo={() =>
                    router.push({ pathname: '/teacher/[id]', params: { id: teacher.id } })
                  }
                />
              )}
            />
          </View>
        </View>
        <View className="flex-row justify-center gap-16 pb-6 pt-1">
          <RoundButton
            tone="danger"
            accessibilityLabel="Descartar"
            onPress={() => deckRef.current?.swipe('left')}>
            <X size={32} color={colors.accent} />
          </RoundButton>
          <RoundButton
            tone="success"
            accessibilityLabel="Me interesa"
            onPress={() => deckRef.current?.swipe('right')}>
            <Heart size={32} color={colors.success} />
          </RoundButton>
        </View>
      </>
    );
  }

  return (
    <Screen>
      {content}
      <DiscoverIntroModal visible={showIntro} onClose={closeIntro} />
    </Screen>
  );
}
