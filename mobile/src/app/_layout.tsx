import '../global.css';
import '@/lib/nativewind-interop';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useCallback, useMemo, useRef, useState } from 'react';
import { View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';

import { BrandSplash, IntroProvider, type Point } from '@/components/brand';
import { AppThemeProvider, useAppTheme } from '@/providers/AppThemeProvider';
import { SessionProvider, useSession } from '@/providers/SessionProvider';

// El splash nativo (solo color de fondo) se oculta cuando aparece <BrandSplash> con la "P".
SplashScreen.preventAutoHideAsync();

function RootNavigator() {
  const { colors, isReady: themeReady } = useAppTheme();
  const { user, isLoading: sessionLoading } = useSession();
  const ready = themeReady && !sessionLoading;

  const [introDone, setIntroDone] = useState(false);
  const splashCenter = useRef<Point | null>(null);
  const intro = useMemo(() => ({ done: introDone, splashCenter }), [introDone]);
  const onIntroDone = useCallback(() => setIntroDone(true), []);
  const onCenterMeasured = useCallback((p: Point) => {
    splashCenter.current = p;
  }, []);

  return (
    <IntroProvider value={intro}>
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        {ready ? <AppStack hasUser={!!user} /> : null}
        {/* Se espera al tema guardado para que la P no aparezca con el color equivocado. */}
        {!introDone && themeReady ? (
          <BrandSplash
            ready={ready}
            exit={user ? 'fade' : 'handoff'}
            onCenterMeasured={onCenterMeasured}
            onDone={onIntroDone}
          />
        ) : null}
      </View>
    </IntroProvider>
  );
}

function AppStack({ hasUser }: { hasUser: boolean }) {
  const { colors } = useAppTheme();
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        headerTintColor: colors.brand,
        headerTitleStyle: { color: colors.fg },
        headerStyle: { backgroundColor: colors.surface },
        headerBackButtonDisplayMode: 'minimal',
        contentStyle: { backgroundColor: colors.background },
      }}>
      {/* Entrada: redirige según sesión y rol. Debe ir primero. */}
      <Stack.Screen name="index" />

      {/* Sin sesión: solo login / registro */}
      <Stack.Protected guard={!hasUser}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>

      {/* Con sesión */}
      <Stack.Protected guard={hasUser}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="teacher/[id]" options={{ headerShown: true, title: 'Perfil' }} />
        <Stack.Screen name="user/[id]" options={{ headerShown: true, title: 'Perfil' }} />
        <Stack.Screen name="chat/[matchId]" options={{ headerShown: true, title: '' }} />
        <Stack.Screen
          name="profile/edit"
          options={{ headerShown: true, title: 'Editar perfil', presentation: 'modal' }}
        />
      </Stack.Protected>

      {/* Siempre accesibles (también desde el registro) */}
      <Stack.Screen name="legal/[doc]" options={{ headerShown: true, title: '' }} />
    </Stack>
  );
}

export default function RootLayout() {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
      }),
  );

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <KeyboardProvider>
        <QueryClientProvider client={queryClient}>
          <AppThemeProvider>
            <SessionProvider>
              <RootNavigator />
            </SessionProvider>
          </AppThemeProvider>
        </QueryClientProvider>
      </KeyboardProvider>
    </GestureHandlerRootView>
  );
}
