// Mazo de tarjetas estilo Tinder, hecho con Reanimated + Gesture Handler (animaciones en el hilo
// nativo). Reemplaza a react-native-deck-swiper, que usaba InteractionManager (eliminado en
// React Native 0.88) y crasheaba al desmontarse, por ejemplo al cerrar sesión.
import { useEffect, useImperativeHandle, useState, type ReactNode, type Ref } from 'react';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { useAppTheme } from '@/providers/AppThemeProvider';

export type SwipeDirection = 'left' | 'right';

export interface SwipeDeckHandle {
  /** Tira la tarjeta de arriba (botones X / corazón). */
  swipe: (direction: SwipeDirection) => void;
}

/** Fracción del ancho que hay que arrastrar para que cuente como swipe. */
const SWIPE_THRESHOLD = 0.28;
/** Velocidad (px/s) que también cuenta como swipe aunque el arrastre sea corto. */
const VELOCITY_THRESHOLD = 900;
const SPRING = { damping: 18, stiffness: 180 };

export function SwipeDeck<T>({
  items,
  keyExtractor,
  renderCard,
  onSwipe,
  onEmpty,
  ref,
}: {
  items: T[];
  keyExtractor: (item: T) => string;
  renderCard: (item: T) => ReactNode;
  onSwipe: (item: T, direction: SwipeDirection) => void;
  /** Se llama cuando se terminaron las tarjetas. */
  onEmpty?: () => void;
  ref?: Ref<SwipeDeckHandle>;
}) {
  const [index, setIndex] = useState(0);
  // Arrastre de la tarjeta de arriba: la de atrás crece a medida que la de arriba se aleja.
  const dragX = useSharedValue(0);
  const [topHandle, setTopHandle] = useState<SwipeDeckHandle | null>(null);

  useImperativeHandle(ref, () => ({ swipe: (d) => topHandle?.swipe(d) }), [topHandle]);

  useEffect(() => {
    if (items.length > 0 && index >= items.length) onEmpty?.();
  }, [index, items.length, onEmpty]);

  const top = items[index];
  const next = items[index + 1];

  const handleSwiped = (item: T, direction: SwipeDirection) => {
    dragX.set(0);
    setIndex((i) => i + 1);
    onSwipe(item, direction);
  };

  return (
    <View style={StyleSheet.absoluteFill}>
      {next ? (
        <NextCard key={keyExtractor(next)} dragX={dragX}>
          {renderCard(next)}
        </NextCard>
      ) : null}
      {top ? (
        <TopCard
          key={keyExtractor(top)}
          dragX={dragX}
          onSwiped={(d) => handleSwiped(top, d)}
          onReady={setTopHandle}>
          {renderCard(top)}
        </TopCard>
      ) : null}
    </View>
  );
}

function NextCard({ dragX, children }: { dragX: SharedValue<number>; children: ReactNode }) {
  const { width } = useWindowDimensions();
  const style = useAnimatedStyle(() => {
    const p = interpolate(
      Math.abs(dragX.get()),
      [0, width * SWIPE_THRESHOLD],
      [0, 1],
      Extrapolation.CLAMP,
    );
    return { transform: [{ scale: 0.94 + p * 0.06 }], opacity: 0.6 + p * 0.4 };
  });
  return <Animated.View style={[StyleSheet.absoluteFill, style]}>{children}</Animated.View>;
}

function TopCard({
  dragX,
  onSwiped,
  onReady,
  children,
}: {
  dragX: SharedValue<number>;
  onSwiped: (d: SwipeDirection) => void;
  onReady: (h: SwipeDeckHandle) => void;
  children: ReactNode;
}) {
  const { colors } = useAppTheme();
  const { width } = useWindowDimensions();
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);

  const flyOut = (direction: SwipeDirection, velocity = 0) => {
    'worklet';
    const to = (direction === 'right' ? 1 : -1) * width * 1.4;
    const duration = Math.max(160, 280 - Math.abs(velocity) / 20);
    tx.set(withTiming(to, { duration }, () => scheduleOnRN(onSwiped, direction)));
    dragX.set(withTiming(to, { duration }));
  };

  // Expone el swipe para los botones X / corazón. Cada tarjeta se monta una sola vez
  // (key por item), así que alcanza con registrarlo al montar.
  useEffect(() => {
    onReady({ swipe: (d) => flyOut(d) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pan = usePanGesture({
    // Solo arrastre horizontal: no compite con gestos verticales.
    activeOffsetX: [-8, 8],
    onUpdate: (e) => {
      'worklet';
      tx.set(e.translationX);
      ty.set(e.translationY * 0.4);
      dragX.set(e.translationX);
    },
    onDeactivate: (e) => {
      'worklet';
      const passed = Math.abs(e.translationX) > width * SWIPE_THRESHOLD;
      const flung = Math.abs(e.velocityX) > VELOCITY_THRESHOLD;
      if (passed || flung) {
        flyOut(e.translationX > 0 ? 'right' : 'left', e.velocityX);
      } else {
        tx.set(withSpring(0, SPRING));
        ty.set(withSpring(0, SPRING));
        dragX.set(withSpring(0, SPRING));
      }
    },
  });

  const cardStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: tx.get() },
      { translateY: ty.get() },
      { rotateZ: `${interpolate(tx.get(), [-width, width], [-14, 14])}deg` },
    ],
  }));
  const likeStyle = useAnimatedStyle(() => ({
    opacity: interpolate(tx.get(), [20, width * SWIPE_THRESHOLD], [0, 1], Extrapolation.CLAMP),
  }));
  const nopeStyle = useAnimatedStyle(() => ({
    opacity: interpolate(tx.get(), [-width * SWIPE_THRESHOLD, -20], [1, 0], Extrapolation.CLAMP),
  }));

  return (
    <GestureDetector gesture={pan}>
      <Animated.View style={[StyleSheet.absoluteFill, cardStyle]}>
        {children}
        <Animated.View
          pointerEvents="none"
          style={[styles.stamp, styles.stampLike, { borderColor: colors.success }, likeStyle]}>
          <Text style={[styles.stampText, { color: colors.success }]}>ME INTERESA</Text>
        </Animated.View>
        <Animated.View
          pointerEvents="none"
          style={[styles.stamp, styles.stampNope, { borderColor: colors.accent }, nopeStyle]}>
          <Text style={[styles.stampText, { color: colors.accent }]}>NO</Text>
        </Animated.View>
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  stamp: {
    position: 'absolute',
    top: 28,
    borderWidth: 3,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  stampLike: { left: 22, transform: [{ rotate: '-14deg' }] },
  stampNope: { right: 22, transform: [{ rotate: '14deg' }] },
  stampText: { fontSize: 26, fontWeight: '800', letterSpacing: 1 },
});
