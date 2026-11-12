// Explicación de "Descubrir": aparece la primera vez que el alumno entra y no vuelve a mostrarse.
// Reemplaza al cartel que salía después de cada like.
import { ArrowLeft, ArrowRight, Heart, MessageCircle, Send } from 'lucide-react-native';
import { useEffect, type ReactNode } from 'react';
import { Modal, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { useAppTheme } from '@/providers/AppThemeProvider';
import { Button } from './ui';

export function DiscoverIntroModal({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const { colors } = useAppTheme();
  const reduceMotion = useReducedMotion();
  const card = useSharedValue(0);
  const wiggle = useSharedValue(0);

  useEffect(() => {
    if (!visible) return;
    card.set(0);
    card.set(reduceMotion ? 1 : withSpring(1, { damping: 16, stiffness: 140 }));
    if (!reduceMotion) {
      // La "tarjeta" de ejemplo se balancea para mostrar el gesto.
      wiggle.set(
        withDelay(
          500,
          withRepeat(
            withSequence(
              withTiming(1, { duration: 700, easing: Easing.inOut(Easing.quad) }),
              withTiming(-1, { duration: 1100, easing: Easing.inOut(Easing.quad) }),
              withTiming(0, { duration: 700, easing: Easing.inOut(Easing.quad) }),
              withTiming(0, { duration: 500 }),
            ),
            -1,
          ),
        ),
      );
    }
  }, [visible, reduceMotion, card, wiggle]);

  const cardStyle = useAnimatedStyle(() => ({
    opacity: card.get(),
    transform: [{ translateY: (1 - card.get()) * 60 }, { scale: 0.92 + card.get() * 0.08 }],
  }));
  const demoStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: wiggle.get() * 26 }, { rotateZ: `${wiggle.get() * 9}deg` }],
  }));

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 items-center justify-center bg-black/50 px-6">
        <Animated.View style={[{ width: '100%', maxWidth: 380 }, cardStyle]}>
          <View className="items-center gap-5 rounded-3xl bg-surface px-6 pb-6 pt-7">
            {/* Mini tarjeta de ejemplo con el gesto */}
            <View className="h-28 w-full flex-row items-center justify-between">
              <ArrowLeft size={22} color={colors.accent} />
              <Animated.View style={demoStyle}>
                <View className="h-28 w-24 items-center justify-center rounded-2xl bg-brand shadow-md">
                  <Heart size={34} color="#fff" fill="#fff" />
                </View>
              </Animated.View>
              <ArrowRight size={22} color={colors.success} />
            </View>

            <View className="items-center gap-1">
              <Text className="text-center text-2xl font-extrabold text-fg">
                Encontrá a tu profe ideal
              </Text>
              <Text className="text-center text-sm text-fg-muted">Así funciona Descubrir</Text>
            </View>

            <View className="w-full gap-3">
              <Step icon={<Heart size={18} color={colors.success} />} tone="success">
                <Text className="font-semibold text-fg">Deslizá a la derecha</Text> o tocá el
                corazón si un profe te interesa. A la izquierda, para pasar.
              </Step>
              <Step icon={<Send size={18} color={colors.brandFg} />} tone="brand">
                El profe recibe tu <Text className="font-semibold text-fg">solicitud</Text> y decide
                si la acepta.
              </Step>
              <Step icon={<MessageCircle size={18} color={colors.brandFg} />} tone="brand">
                Cuando acepta, <Text className="font-semibold text-fg">se habilita el chat</Text> y
                te avisamos. El precio y el pago los arreglan entre ustedes.
              </Step>
            </View>

            <View className="w-full">
              <Button label="¡Empezar!" variant="brand" onPress={onClose} />
            </View>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

function Step({
  icon,
  tone,
  children,
}: {
  icon: ReactNode;
  tone: 'brand' | 'success';
  children: ReactNode;
}) {
  return (
    <View className="flex-row items-start gap-3">
      <View
        className={`h-9 w-9 items-center justify-center rounded-full ${tone === 'success' ? 'bg-success-soft' : 'bg-brand-soft'}`}>
        {icon}
      </View>
      <Text className="flex-1 text-sm leading-5 text-fg-muted">{children}</Text>
    </View>
  );
}
