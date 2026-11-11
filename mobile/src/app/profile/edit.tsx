import { zodResolver } from '@hookform/resolvers/zod';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { Camera } from 'lucide-react-native';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Alert, Pressable, Text, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, InitialAvatar, TextField } from '@/components/ui';
import { profileSchema, type ProfileForm } from '@/lib/schemas';
import { useCurrentUser, useSession } from '@/providers/SessionProvider';
import { useAppTheme } from '@/providers/AppThemeProvider';

export default function EditProfileScreen() {
  const { colors } = useAppTheme();
  const user = useCurrentUser();
  const { updateProfile } = useSession();
  const insets = useSafeAreaInsets();
  const isTeacher = user.role === 'teacher';
  const [avatarUri, setAvatarUri] = useState(user.avatarUrl);

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: user.name,
      bio: user.bio ?? '',
      age: user.age ? String(user.age) : '',
      subjects: user.subjects?.join(', ') ?? '',
      hourlyRate: user.hourlyRate ? String(user.hourlyRate) : '',
      cv: user.cv ?? '',
    },
  });

  const pickPhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    // TODO(Supabase): subir a Storage y guardar la URL pública en el perfil.
    if (!result.canceled) setAvatarUri(result.assets[0].uri);
  };

  const onSubmit = handleSubmit(async (v) => {
    try {
      await updateProfile({
        name: v.name,
        bio: v.bio,
        avatarUrl: avatarUri,
        age: v.age ? Number(v.age) : undefined,
        ...(isTeacher && {
          subjects: v.subjects
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean),
          hourlyRate: v.hourlyRate ? Number(v.hourlyRate) : undefined,
          cv: v.cv,
        }),
      });
      router.back();
    } catch (e) {
      Alert.alert('No se pudo guardar', e instanceof Error ? e.message : undefined);
    }
  });

  return (
    <KeyboardAwareScrollView
      className="flex-1 bg-background"
      contentContainerClassName="gap-4 p-5"
      contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
      keyboardShouldPersistTaps="handled">
      <Pressable
        onPress={pickPhoto}
        accessibilityRole="button"
        accessibilityLabel="Cambiar foto de perfil"
        className="items-center gap-2 self-center">
        {avatarUri ? (
          <Image
            source={{ uri: avatarUri }}
            style={{ width: 112, height: 112, borderRadius: 56 }}
          />
        ) : (
          <InitialAvatar name={user.name} size={112} />
        )}
        <View className="flex-row items-center gap-1">
          <Camera size={16} color={colors.brand} />
          <Text className="font-semibold text-brand">Cambiar foto</Text>
        </View>
      </Pressable>

      <Controller
        control={control}
        name="name"
        render={({ field: { onChange, onBlur, value } }) => (
          <TextField
            label="Nombre"
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            error={errors.name?.message}
          />
        )}
      />
      <Controller
        control={control}
        name="age"
        render={({ field: { onChange, onBlur, value } }) => (
          <TextField
            label="Edad"
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            keyboardType="number-pad"
            maxLength={2}
            error={errors.age?.message}
          />
        )}
      />
      <Controller
        control={control}
        name="bio"
        render={({ field: { onChange, onBlur, value } }) => (
          <TextField
            label={isTeacher ? 'Presentación corta' : 'Sobre mí'}
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            multiline
            maxLength={280}
            placeholder={
              isTeacher ? 'Ej: Clases prácticas con ejercicios paso a paso.' : 'Qué querés aprender'
            }
            error={errors.bio?.message}
          />
        )}
      />

      {isTeacher ? (
        <>
          <Controller
            control={control}
            name="subjects"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextField
                label="Materias (separadas por coma)"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                placeholder="Física I, Química, Matemática"
                error={errors.subjects?.message}
              />
            )}
          />
          <Controller
            control={control}
            name="hourlyRate"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextField
                label="Precio por hora (USD, referencial)"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                keyboardType="number-pad"
                error={errors.hourlyRate?.message}
              />
            )}
          />
          <Controller
            control={control}
            name="cv"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextField
                label="Trayectoria y CV"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                multiline
                maxLength={1000}
                error={errors.cv?.message}
              />
            )}
          />
        </>
      ) : null}

      <Button label="Guardar" variant="brand" onPress={onSubmit} loading={isSubmitting} />
    </KeyboardAwareScrollView>
  );
}
