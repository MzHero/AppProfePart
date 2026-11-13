import { zodResolver } from '@hookform/resolvers/zod';
import { Link, router } from 'expo-router';
import { Check } from 'lucide-react-native';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Alert, Pressable, Text, View } from 'react-native';

import { KeyboardScrollView } from '@/components/KeyboardAware';
import { Button, Screen, Segmented, TextField } from '@/components/ui';
import { registerSchema, type RegisterForm } from '@/lib/schemas';
import { useSession } from '@/providers/SessionProvider';

export default function RegisterScreen() {
  const { signUp } = useSession();
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
      role: 'student',
      acceptTerms: false,
    },
  });

  const onSubmit = handleSubmit(async ({ name, email, password, role }) => {
    setServerError(null);
    try {
      const { needsEmailConfirmation } = await signUp({ name, email, password, role });
      // Si no hace falta confirmar, Stack.Protected redirige solo al entrar la sesión.
      if (needsEmailConfirmation) {
        Alert.alert(
          'Revisá tu email',
          `Te enviamos un enlace a ${email.trim()} para confirmar tu cuenta. Después ingresá con tu email y contraseña.`,
          [{ text: 'Entendido', onPress: () => router.back() }],
        );
      }
    } catch (e) {
      setServerError(e instanceof Error ? e.message : 'No se pudo crear la cuenta');
    }
  });

  return (
    <Screen edges={['bottom']}>
      <KeyboardScrollView contentClassName="gap-4 px-6 py-6">
        <View className="gap-1.5">
          <Text className="text-sm font-semibold text-fg">Quiero usar Particuldando como</Text>
          <Controller
            control={control}
            name="role"
            render={({ field: { value, onChange } }) => (
              <Segmented
                value={value}
                onChange={onChange}
                options={[
                  { value: 'student', label: 'Alumno' },
                  { value: 'teacher', label: 'Profesor' },
                ]}
              />
            )}
          />
        </View>

        <Controller
          control={control}
          name="name"
          render={({ field: { onChange, onBlur, value } }) => (
            <TextField
              label="Nombre y apellido"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              autoComplete="name"
              error={errors.name?.message}
            />
          )}
        />
        <Controller
          control={control}
          name="email"
          render={({ field: { onChange, onBlur, value } }) => (
            <TextField
              label="Email"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
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
              autoComplete="new-password"
              error={errors.password?.message}
            />
          )}
        />
        <Controller
          control={control}
          name="confirmPassword"
          render={({ field: { onChange, onBlur, value } }) => (
            <TextField
              label="Repetir contraseña"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              secureTextEntry
              autoComplete="new-password"
              error={errors.confirmPassword?.message}
            />
          )}
        />

        <Controller
          control={control}
          name="acceptTerms"
          render={({ field: { value, onChange } }) => (
            <View className="gap-1">
              <Pressable
                accessibilityRole="checkbox"
                accessibilityState={{ checked: value }}
                onPress={() => onChange(!value)}
                className="flex-row items-start gap-3">
                <View
                  className={`mt-0.5 h-6 w-6 items-center justify-center rounded-md border-2 ${value ? 'border-brand bg-brand' : 'border-line-brand bg-surface'}`}>
                  {value ? <Check size={16} color="#fff" /> : null}
                </View>
                <Text className="flex-1 text-sm leading-5 text-fg-muted">
                  Acepto los{' '}
                  <Link href="/legal/terms" className="font-semibold text-brand">
                    Términos y Condiciones
                  </Link>{' '}
                  y la{' '}
                  <Link href="/legal/privacy" className="font-semibold text-brand">
                    Política de Privacidad
                  </Link>
                </Text>
              </Pressable>
              {errors.acceptTerms ? (
                <Text className="text-xs text-accent">{errors.acceptTerms.message}</Text>
              ) : null}
            </View>
          )}
        />

        {serverError ? (
          <Text className="text-center text-sm text-accent">{serverError}</Text>
        ) : null}

        <Button label="Crear cuenta" onPress={onSubmit} loading={isSubmitting} />
      </KeyboardScrollView>
    </Screen>
  );
}
