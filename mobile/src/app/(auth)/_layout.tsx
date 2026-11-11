import { Stack } from 'expo-router';

import { useAppTheme } from '@/providers/AppThemeProvider';

export default function AuthLayout() {
  const { colors } = useAppTheme();
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}>
      <Stack.Screen name="login" />
      <Stack.Screen
        name="register"
        options={{
          headerShown: true,
          title: 'Crear cuenta',
          headerTintColor: colors.brand,
          headerBackButtonDisplayMode: 'minimal',
        }}
      />
    </Stack>
  );
}
