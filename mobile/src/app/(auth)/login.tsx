// Pantalla de referencia: "Images/log.png"
// Entrada animada: el nombre se despliega desde la "P" de la pantalla de carga (ver components/brand.tsx).
import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Text, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { BrandWordmark, useLoginIntro } from '@/components/brand';
import { KeyboardScrollView } from '@/components/KeyboardAware';
import { Button, Screen, TextField } from '@/components/ui';
import { loginSchema, type LoginForm } from '@/lib/schemas';
import { useSession } from '@/providers/SessionProvider';

export default function LoginScreen() {
  const { signIn } = useSession();
  const [serverError, setServerError] = useState<string | null>(null);
  const { containerRef, pBoxRef, onPLayout, letters, wordStyle, subtitleStyle, formStyle } =
    useLoginIntro();
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = handleSubmit(async ({ email, password }) => {
    setServerError(null);
    try {
      await signIn(email, password);
      // La redirección la hace Stack.Protected en el layout raíz.
    } catch (e) {
      setServerError(e instanceof Error ? e.message : 'No se pudo iniciar sesión');
    }
  });

  return (
    <Screen edges={['top', 'bottom']}>
      <View ref={containerRef} collapsable={false} className="flex-1">
        <KeyboardScrollView contentClassName="flex-grow justify-center px-6 py-10">
          <View className="mb-10 items-center gap-1">
            <BrandWordmark
              pBoxRef={pBoxRef}
              onPLayout={onPLayout}
              letters={letters}
              style={wordStyle}
            />
            <Animated.View style={subtitleStyle}>
              <Text className="text-base text-fg-muted">Conectá con tu profesor ideal</Text>
            </Animated.View>
          </View>

          <Animated.View style={formStyle}>
            <View className="gap-4">
              <Controller
                control={control}
                name="email"
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextField
                    label="Email"
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    placeholder="alumno@mail.com"
                    autoCapitalize="none"
                    autoComplete="email"
                    keyboardType="email-address"
                    textContentType="emailAddress"
                    error={errors.email?.message}
                  />
                )}
              />
              <Controller
                control={control}
                name="password"
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextField
                    label="Contraseña"
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    secureTextEntry
                    autoComplete="current-password"
                    textContentType="password"
                    onSubmitEditing={() => onSubmit()}
                    returnKeyType="go"
                    error={errors.password?.message}
                  />
                )}
              />

              {serverError ? (
                <Text className="text-center text-sm text-accent">{serverError}</Text>
              ) : null}

              <View className="mt-2 gap-3">
                <Button label="Ingresar" onPress={onSubmit} loading={isSubmitting} />
                <Button
                  label="Registrarse"
                  variant="outline"
                  onPress={() => router.push('/register')}
                />
              </View>

              {__DEV__ ? (
                <Text className="mt-6 text-center text-xs text-fg-soft">
                  Demo: alumno@particuldando.com · profe@particuldando.com (clave 123456)
                </Text>
              ) : null}
            </View>
          </Animated.View>
        </KeyboardScrollView>
      </View>
    </Screen>
  );
}
