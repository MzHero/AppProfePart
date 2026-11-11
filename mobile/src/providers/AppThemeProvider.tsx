// Tema de la app: por defecto sigue al sistema; el usuario puede forzar claro u oscuro
// desde Perfil. La preferencia se guarda en el dispositivo.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DarkTheme, DefaultTheme, ThemeProvider as NavigationThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import { colorScheme as nativewindColorScheme, useColorScheme } from 'nativewind';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { Platform, useColorScheme as useSystemColorScheme } from 'react-native';

import { palette, type ColorSchemeName, type ThemeColors } from '@/theme/palette';

export type ThemePreference = 'system' | 'light' | 'dark';

const STORAGE_KEY = 'particulando.themePreference';

interface AppThemeValue {
  /** Lo que eligió el usuario. */
  preference: ThemePreference;
  setPreference: (p: ThemePreference) => void;
  /** Tema efectivo (resuelve 'system'). */
  scheme: ColorSchemeName;
  colors: ThemeColors;
  /** true cuando ya se leyó la preferencia guardada. */
  isReady: boolean;
}

const AppThemeContext = createContext<AppThemeValue | null>(null);

const isPreference = (v: unknown): v is ThemePreference =>
  v === 'system' || v === 'light' || v === 'dark';

export function AppThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setPreferenceState] = useState<ThemePreference>('system');
  const [isReady, setIsReady] = useState(false);
  const { colorScheme } = useColorScheme();
  // En web NativeWind no sabe resolver 'system' con darkMode 'class': lo resolvemos acá.
  const systemScheme = useSystemColorScheme();

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((v) => isPreference(v) && setPreferenceState(v))
      .catch(() => {})
      .finally(() => setIsReady(true));
  }, []);

  useEffect(() => {
    if (Platform.OS === 'web') {
      nativewindColorScheme.set(
        preference === 'system' ? (systemScheme === 'dark' ? 'dark' : 'light') : preference,
      );
    } else {
      // En nativo usa Appearance.setColorScheme: 'system' vuelve a seguir al sistema,
      // y forzar un modo también afecta alertas, teclado y componentes nativos.
      nativewindColorScheme.set(preference);
    }
  }, [preference, systemScheme]);

  const setPreference = useCallback((p: ThemePreference) => {
    setPreferenceState(p);
    AsyncStorage.setItem(STORAGE_KEY, p).catch(() => {});
  }, []);

  const scheme: ColorSchemeName = colorScheme === 'dark' ? 'dark' : 'light';
  const colors = palette[scheme];

  useEffect(() => {
    // Color de fondo de la ventana nativa (evita destellos blancos al navegar en modo oscuro).
    SystemUI.setBackgroundColorAsync(colors.background).catch(() => {});
  }, [colors.background]);

  const navigationTheme = useMemo(() => {
    const base = scheme === 'dark' ? DarkTheme : DefaultTheme;
    return {
      ...base,
      colors: {
        ...base.colors,
        primary: colors.brand,
        background: colors.background,
        card: colors.surface,
        text: colors.fg,
        border: colors.line,
        notification: colors.accent,
      },
    };
  }, [scheme, colors]);

  const value = useMemo(
    () => ({ preference, setPreference, scheme, colors, isReady }),
    [preference, setPreference, scheme, colors, isReady],
  );

  return (
    <AppThemeContext.Provider value={value}>
      <NavigationThemeProvider value={navigationTheme}>
        <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
        {children}
      </NavigationThemeProvider>
    </AppThemeContext.Provider>
  );
}

export function useAppTheme() {
  const ctx = useContext(AppThemeContext);
  if (!ctx) throw new Error('useAppTheme debe usarse dentro de <AppThemeProvider>');
  return ctx;
}
