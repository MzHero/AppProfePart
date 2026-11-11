// Swipe estilo Tinder. Pantalla de referencia: "Images/Pantalla_swipe.png"
// Derecha = like (crea solicitud 'pending'), izquierda = descartar.
import { router } from 'expo-router';
import { Heart, X } from 'lucide-react-native';
import { useRef, useState } from 'react';
import { Alert, useWindowDimensions, View } from 'react-native';
import Swiper from 'react-native-deck-swiper';

import { TeacherSwipeCard } from '@/components/TeacherSwipeCard';
import { Button, EmptyState, ErrorState, LoadingView, RoundButton, Screen } from '@/components/ui';
import { useLikeTeacher, usePassTeacher, useSwipeDeck } from '@/hooks/queries';
import { useAppTheme } from '@/providers/AppThemeProvider';
import type { TeacherProfile } from '@/types/models';

const CARD_MARGIN = 16;
/** Espacio reservado debajo de la tarjeta para los botones X / corazón. */
const ACTIONS_HEIGHT = 112;

export default function SwipeScreen() {
  const { colors } = useAppTheme();
  const { data: deck, isLoading, isError, refetch } = useSwipeDeck();
  const like = useLikeTeacher();
  const pass = usePassTeacher();
  const swiperRef = useRef<Swiper<TeacherProfile>>(null);
  const [finished, setFinished] = useState(false);
  const { height: windowHeight } = useWindowDimensions();
  // El swiper calcula el alto de la tarjeta con la altura de la VENTANA:
  //   alto = ventana - 2*margen - marginBottom
  // Medimos el contenedor real (sin tab bar ni zona segura) para que la tarjeta
  // termine justo encima de los botones.
  const [containerHeight, setContainerHeight] = useState(0);
  const swiperMarginBottom = windowHeight - containerHeight + ACTIONS_HEIGHT - CARD_MARGIN;

  if (isLoading) return <LoadingView />;
  if (isError || !deck) return <ErrorState onRetry={refetch} />;

  const restart = () => {
    setFinished(false);
    refetch();
  };

  if (deck.length === 0 || finished) {
    return (
      <Screen>
        <EmptyState
          title="No hay más profesores por ahora"
          description="Volvé más tarde o buscá por materia en la pestaña Cercanos."
          action={<Button label="Buscar de nuevo" variant="brand" onPress={restart} />}
        />
      </Screen>
    );
  }

  const onLike = (index: number) => {
    const teacher = deck[index];
    like.mutate(teacher.id, {
      onSuccess: () =>
        Alert.alert(
          'Solicitud enviada',
          `${teacher.name} va a recibir tu solicitud. Cuando la acepte se habilita el chat.`,
        ),
      onError: (e) => Alert.alert('No se pudo enviar', e.message),
    });
  };

  return (
    <Screen>
      <View className="flex-1" onLayout={(e) => setContainerHeight(e.nativeEvent.layout.height)}>
        {containerHeight > 0 ? (
          <Swiper
            ref={swiperRef}
            cards={deck}
            keyExtractor={(t) => t.id}
            renderCard={(teacher) =>
              teacher ? (
                <TeacherSwipeCard
                  teacher={teacher}
                  onInfo={() =>
                    router.push({ pathname: '/teacher/[id]', params: { id: teacher.id } })
                  }
                />
              ) : null
            }
            onSwipedRight={onLike}
            onSwipedLeft={(i) => pass.mutate(deck[i].id)}
            onSwipedAll={() => setFinished(true)}
            verticalSwipe={false}
            stackSize={2}
            stackSeparation={0}
            cardHorizontalMargin={CARD_MARGIN}
            cardVerticalMargin={CARD_MARGIN}
            marginBottom={swiperMarginBottom}
            backgroundColor="transparent"
            animateCardOpacity
            overlayLabels={{
              left: {
                title: 'NO',
                style: {
                  label: {
                    color: colors.accent,
                    fontSize: 28,
                    borderColor: colors.accent,
                    borderWidth: 3,
                  },
                  wrapper: { alignItems: 'flex-end', marginTop: 24, marginLeft: -24 },
                },
              },
              right: {
                title: 'ME INTERESA',
                style: {
                  label: {
                    color: colors.success,
                    fontSize: 28,
                    borderColor: colors.success,
                    borderWidth: 3,
                  },
                  wrapper: { alignItems: 'flex-start', marginTop: 24, marginLeft: 24 },
                },
              },
            }}
          />
        ) : null}
      </View>

      <View className="absolute bottom-6 left-0 right-0 flex-row justify-center gap-16">
        <RoundButton
          tone="danger"
          accessibilityLabel="Descartar"
          onPress={() => swiperRef.current?.swipeLeft()}>
          <X size={32} color={colors.accent} />
        </RoundButton>
        <RoundButton
          tone="success"
          accessibilityLabel="Me interesa"
          onPress={() => swiperRef.current?.swipeRight()}>
          <Heart size={32} color={colors.success} />
        </RoundButton>
      </View>
    </Screen>
  );
}
