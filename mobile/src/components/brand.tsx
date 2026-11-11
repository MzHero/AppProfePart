// Marca animada: pantalla de carga con la "P" latiendo y el logotipo "Particuldando" que se
// despliega desde esa P en el login.
//
// Secuencia al abrir la app:
//  1. <BrandSplash> (capa sobre toda la app) muestra la P con un latido lento mientras carga.
//  2. Al terminar de cargar:
//     - sin sesión -> la P vuelve a tamaño normal y se "pasa la posta" al login, que tiene su
//       propia P en EXACTAMENTE el mismo punto de la pantalla (ver useIntro().splashCenter).
//       Desde ahí <BrandWordmark> despliega el nombre, sube y aparecen los inputs.
//     - con sesión -> la P se agranda y se desvanece revelando la app.
import * as SplashScreen from 'expo-splash-screen';
import {
  createContext,
  type ComponentRef,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from 'react';
import { StyleSheet, Text, View, type TextStyle } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { useAppTheme } from '@/providers/AppThemeProvider';

export const BRAND_NAME = 'Particuldando';

/** Mismo estilo para la P del splash y la del login: si difieren, se nota el "salto". */
const BRAND_TEXT: TextStyle = {
  fontSize: 48,
  lineHeight: 58,
  fontWeight: '800',
  letterSpacing: -0.5,
};

/** Tiempo mínimo de la pantalla de carga, para que el latido se llegue a ver. */
const MIN_SPLASH_MS = 1700;

// ---------- Contexto de la intro ----------

export interface Point {
  x: number;
  y: number;
}

interface IntroState {
  /** true cuando la capa de carga ya desapareció. */
  done: boolean;
  /** Centro de la P del splash, en coordenadas de ventana. */
  splashCenter: RefObject<Point | null>;
}

const IntroContext = createContext<IntroState>({ done: true, splashCenter: { current: null } });

export function IntroProvider({ value, children }: { value: IntroState; children: ReactNode }) {
  return <IntroContext.Provider value={value}>{children}</IntroContext.Provider>;
}

export const useIntro = () => useContext(IntroContext);

// ---------- Pantalla de carga ----------

export function BrandSplash({
  ready,
  exit,
  onCenterMeasured,
  onDone,
}: {
  /** La app terminó de cargar (sesión, preferencias). */
  ready: boolean;
  /** 'handoff': el login continúa la animación. 'fade': se desvanece (usuario con sesión). */
  exit: 'handoff' | 'fade';
  onCenterMeasured: (p: Point) => void;
  onDone: () => void;
}) {
  const { colors } = useAppTheme();
  const reduceMotion = useReducedMotion();
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);
  const [minElapsed, setMinElapsed] = useState(false);
  const boxRef = useRef<ComponentRef<typeof View>>(null);

  useEffect(() => {
    const t = setTimeout(() => setMinElapsed(true), reduceMotion ? 0 : MIN_SPLASH_MS);
    return () => clearTimeout(t);
  }, [reduceMotion]);

  // Latido lento "lub-dub" + pausa (≈1,6 s por ciclo).
  useEffect(() => {
    if (reduceMotion) return;
    scale.set(
      withRepeat(
        withSequence(
          withTiming(1.14, { duration: 220, easing: Easing.out(Easing.quad) }),
          withTiming(1, { duration: 200, easing: Easing.in(Easing.quad) }),
          withTiming(1.08, { duration: 180, easing: Easing.out(Easing.quad) }),
          withTiming(1, { duration: 300, easing: Easing.inOut(Easing.quad) }),
          withDelay(700, withTiming(1, { duration: 0 })),
        ),
        -1,
      ),
    );
    return () => cancelAnimation(scale);
  }, [reduceMotion, scale]);

  // Salida.
  useEffect(() => {
    if (!ready || !minElapsed) return;
    cancelAnimation(scale);
    if (exit === 'handoff') {
      scale.set(
        withTiming(1, { duration: 220, easing: Easing.out(Easing.quad) }, () =>
          scheduleOnRN(onDone),
        ),
      );
    } else {
      scale.set(withTiming(1.6, { duration: 380, easing: Easing.in(Easing.quad) }));
      opacity.set(withTiming(0, { duration: 380 }, () => scheduleOnRN(onDone)));
    }
  }, [ready, minElapsed, exit, onDone, scale, opacity]);

  const containerStyle = useAnimatedStyle(() => ({ opacity: opacity.get() }));
  const letterStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }] }));

  return (
    <Animated.View
      style={[
        StyleSheet.absoluteFill,
        styles.center,
        { backgroundColor: colors.background },
        containerStyle,
      ]}
      accessible
      accessibilityLabel="Cargando Particuldando"
      onLayout={() => SplashScreen.hideAsync().catch(() => {})}>
      {/* La caja NO se escala: se mide sin que el latido afecte la posición. */}
      <View
        ref={boxRef}
        collapsable={false}
        onLayout={() =>
          boxRef.current?.measureInWindow((x, y, w, h) =>
            onCenterMeasured({ x: x + w / 2, y: y + h / 2 }),
          )
        }>
        <Animated.Text style={[BRAND_TEXT, { color: colors.brand }, letterStyle]}>P</Animated.Text>
      </View>
    </Animated.View>
  );
}

// ---------- Logotipo del login ----------

/**
 * Controla la entrada del login: el nombre se despliega desde la P, sube a su lugar
 * y después aparecen subtítulo y formulario.
 */
export function useLoginIntro() {
  const { done: introDone, splashCenter } = useIntro();
  const reduceMotion = useReducedMotion();
  const containerRef = useRef<ComponentRef<typeof View>>(null);
  const pBoxRef = useRef<ComponentRef<typeof View>>(null);
  const measured = useRef(false);
  const [positioned, setPositioned] = useState(false);

  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const visible = useSharedValue(0);
  const letters = useSharedValue(0);
  const subtitle = useSharedValue(0);
  const form = useSharedValue(0);

  /** Lleva la P del login al punto donde estaba la P del splash (o al centro de la pantalla). */
  const onPLayout = () => {
    if (measured.current) return;
    measured.current = true;
    pBoxRef.current?.measureInWindow((px, py, pw, ph) => {
      const apply = (target: Point) => {
        tx.set(target.x - (px + pw / 2));
        ty.set(target.y - (py + ph / 2));
        visible.set(1);
        setPositioned(true);
      };
      if (splashCenter.current) apply(splashCenter.current);
      else
        containerRef.current?.measureInWindow((cx, cy, cw, ch) =>
          apply({ x: cx + cw / 2, y: cy + ch / 2 }),
        );
    });
  };

  useEffect(() => {
    if (!introDone || !positioned) return;
    if (reduceMotion) {
      tx.set(0);
      ty.set(0);
      letters.set(1);
      subtitle.set(1);
      form.set(1);
      return;
    }
    const out = Easing.out(Easing.cubic);
    letters.set(withTiming(1, { duration: 750, easing: Easing.out(Easing.quad) }));
    tx.set(withTiming(0, { duration: 750, easing: out }));
    ty.set(withDelay(600, withTiming(0, { duration: 650, easing: Easing.inOut(Easing.cubic) })));
    subtitle.set(withDelay(1000, withTiming(1, { duration: 450 })));
    form.set(withDelay(1100, withTiming(1, { duration: 500, easing: out })));
  }, [introDone, positioned, reduceMotion, tx, ty, letters, subtitle, form]);

  const wordStyle = useAnimatedStyle(() => ({
    opacity: visible.get(),
    transform: [{ translateX: tx.get() }, { translateY: ty.get() }],
  }));
  const subtitleStyle = useAnimatedStyle(() => ({ opacity: subtitle.get() }));
  const formStyle = useAnimatedStyle(() => ({
    opacity: form.get(),
    transform: [{ translateY: (1 - form.get()) * 24 }],
  }));

  return { containerRef, pBoxRef, onPLayout, letters, wordStyle, subtitleStyle, formStyle };
}

export function BrandWordmark({
  pBoxRef,
  onPLayout,
  letters,
  style,
}: {
  pBoxRef: RefObject<ComponentRef<typeof View> | null>;
  onPLayout: () => void;
  letters: SharedValue<number>;
  style: ReturnType<typeof useAnimatedStyle>;
}) {
  const { colors } = useAppTheme();
  const rest = BRAND_NAME.slice(1).split('');
  return (
    <Animated.View
      style={[styles.row, style]}
      accessible
      accessibilityRole="header"
      accessibilityLabel={BRAND_NAME}>
      <View ref={pBoxRef} collapsable={false} onLayout={onPLayout}>
        <Text style={[BRAND_TEXT, { color: colors.brand }]}>{BRAND_NAME[0]}</Text>
      </View>
      {rest.map((char, i) => (
        <RevealLetter
          key={i}
          char={char}
          index={i}
          total={rest.length}
          progress={letters}
          color={colors.brand}
        />
      ))}
    </Animated.View>
  );
}

function RevealLetter({
  char,
  index,
  total,
  progress,
  color,
}: {
  char: string;
  index: number;
  total: number;
  progress: SharedValue<number>;
  color: string;
}) {
  // Cada letra aparece en su tramo del progreso total, con superposición entre letras.
  const span = 3 / (total + 2);
  const start = index / (total + 2);
  const style = useAnimatedStyle(() => {
    const t = interpolate(progress.get(), [start, start + span], [0, 1], Extrapolation.CLAMP);
    return { opacity: t, transform: [{ translateX: (1 - t) * -8 }] };
  });
  return <Animated.Text style={[BRAND_TEXT, { color }, style]}>{char}</Animated.Text>;
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row' },
});
