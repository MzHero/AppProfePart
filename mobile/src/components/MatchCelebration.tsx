// Animación de "¡Es un match!": las dos fotos entran desde los costados, late un corazón y
// salen corazoncitos. Se muestra al profesor cuando acepta y al alumno cuando lo aceptan.
import { Image } from 'expo-image';
import { Heart } from 'lucide-react-native';
import { useEffect } from 'react';
import { Modal, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import { useAppTheme } from '@/providers/AppThemeProvider';
import { Button, InitialAvatar } from './ui';

export interface CelebrationPerson {
  name: string;
  avatarUrl?: string;
}

const AVATAR = 112;
const BURST = 12;

export function MatchCelebration({
  visible,
  me,
  other,
  subtitle,
  onChat,
  onClose,
}: {
  visible: boolean;
  me: CelebrationPerson;
  other: CelebrationPerson;
  subtitle: string;
  onChat: () => void;
  onClose: () => void;
}) {
  const { colors } = useAppTheme();
  const reduceMotion = useReducedMotion();
  const avatars = useSharedValue(0);
  const heart = useSharedValue(0);
  const burst = useSharedValue(0);
  const text = useSharedValue(0);

  useEffect(() => {
    if (!visible) return;
    if (reduceMotion) {
      avatars.set(1);
      heart.set(1);
      text.set(1);
      return;
    }
    avatars.set(0);
    heart.set(0);
    burst.set(0);
    text.set(0);
    avatars.set(withSpring(1, { damping: 13, stiffness: 120 }));
    heart.set(
      withDelay(
        350,
        withSequence(
          withSpring(1.35, { damping: 6, stiffness: 220 }),
          withSpring(1, { damping: 10, stiffness: 160 }),
        ),
      ),
    );
    burst.set(withDelay(380, withTiming(1, { duration: 900, easing: Easing.out(Easing.cubic) })));
    text.set(withDelay(500, withTiming(1, { duration: 450 })));
  }, [visible, reduceMotion, avatars, heart, burst, text]);

  const leftStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: (1 - avatars.get()) * -220 + 26 },
      { rotateZ: `${-8 * avatars.get()}deg` },
    ],
  }));
  const rightStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: (1 - avatars.get()) * 220 - 26 },
      { rotateZ: `${8 * avatars.get()}deg` },
    ],
  }));
  const heartStyle = useAnimatedStyle(() => ({ transform: [{ scale: heart.get() }] }));
  const textStyle = useAnimatedStyle(() => ({
    opacity: text.get(),
    transform: [{ translateY: (1 - text.get()) * 16 }],
  }));

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 items-center justify-center bg-black/70 px-6">
        <View className="w-full max-w-[380px] items-center gap-8">
          <Animated.View style={textStyle}>
            <View className="items-center gap-2">
              <Text className="text-center text-4xl font-extrabold text-white">¡Es un match!</Text>
              <Text className="text-center text-base text-white/80">{subtitle}</Text>
            </View>
          </Animated.View>

          <View className="h-36 w-full flex-row items-center justify-center">
            <Animated.View style={leftStyle}>
              <Avatar person={me} border={colors.brand} />
            </Animated.View>
            <Animated.View style={rightStyle}>
              <Avatar person={other} border={colors.accent} />
            </Animated.View>

            {/* Corazón central + estallido de corazoncitos */}
            <View className="absolute items-center justify-center" pointerEvents="none">
              {Array.from({ length: BURST }, (_, i) => (
                <BurstHeart
                  key={i}
                  index={i}
                  progress={burst}
                  color={i % 2 ? colors.accent : '#fff'}
                />
              ))}
              <Animated.View style={heartStyle}>
                <View
                  className="h-16 w-16 items-center justify-center rounded-full bg-accent shadow-lg"
                  style={{ borderWidth: 4, borderColor: '#fff' }}>
                  <Heart size={30} color="#fff" fill="#fff" />
                </View>
              </Animated.View>
            </View>
          </View>

          <Animated.View style={[{ width: '100%' }, textStyle]}>
            <View className="gap-3">
              <Button label="Enviar mensaje" variant="primary" onPress={onChat} />
              <Button label="Seguir explorando" variant="outline" onPress={onClose} />
            </View>
          </Animated.View>
        </View>
      </View>
    </Modal>
  );
}

function Avatar({ person, border }: { person: CelebrationPerson; border: string }) {
  return (
    <View
      style={{ borderWidth: 4, borderColor: border, borderRadius: AVATAR / 2 + 4 }}
      className="overflow-hidden bg-surface">
      {person.avatarUrl ? (
        <Image
          source={{ uri: person.avatarUrl }}
          style={{ width: AVATAR, height: AVATAR }}
          contentFit="cover"
        />
      ) : (
        <InitialAvatar name={person.name} size={AVATAR} />
      )}
    </View>
  );
}

function BurstHeart({
  index,
  progress,
  color,
}: {
  index: number;
  progress: SharedValue<number>;
  color: string;
}) {
  const angle = (index / BURST) * Math.PI * 2;
  const distance = 95 + (index % 3) * 22;
  const size = 12 + (index % 3) * 4;
  const style = useAnimatedStyle(() => {
    const p = progress.get();
    return {
      position: 'absolute',
      opacity: p === 0 ? 0 : 1 - p,
      transform: [
        { translateX: Math.cos(angle) * distance * p },
        { translateY: Math.sin(angle) * distance * p },
        { scale: 0.4 + p },
      ],
    };
  });
  return (
    <Animated.View style={style}>
      <Heart size={size} color={color} fill={color} />
    </Animated.View>
  );
}
