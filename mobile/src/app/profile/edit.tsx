import { zodResolver } from '@hookform/resolvers/zod';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { Camera, MapPin } from 'lucide-react-native';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Alert, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { KeyboardScrollView } from '@/components/KeyboardAware';
import { Button, InitialAvatar, TextField } from '@/components/ui';
import { useUpdateMyLocation } from '@/hooks/queries';
import { useCurrentLocation } from '@/hooks/useCurrentLocation';
import { displayDateToIso, isoToDisplayDate } from '@/lib/format';
import { profileSchema, type ProfileForm } from '@/lib/schemas';
import { useAppTheme } from '@/providers/AppThemeProvider';
import { useCurrentUser, useSession } from '@/providers/SessionProvider';

export default function EditProfileScreen() {
  const { colors } = useAppTheme();
  const user = useCurrentUser();
  const { updateProfile, uploadAvatar } = useSession();
  const insets = useSafeAreaInsets();
  const isTeacher = user.role === 'teacher';
  const [avatarUri, setAvatarUri] = useState(user.avatarUrl);
  const { coords, status: locationStatus } = useCurrentLocation();
  const updateLocation = useUpdateMyLocation();

  const saveLocation = () => {
    if (!coords) {
      Alert.alert(
        'Sin ubicación',
        'Activá el permiso de ubicación para que los alumnos cercanos te encuentren.',
      );
      return;
    }
    updateLocation.mutate(coords, {
      // Recarga el perfil para reflejar que la ubicación ya está cargada.
      onSuccess: () => updateProfile({}),
      onError: (e) => Alert.alert('No se pudo guardar la ubicación', e.message),
    });
  };

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: user.name,
      bio: user.bio ?? '',
      birthDate: user.birthDate ? isoToDisplayDate(user.birthDate) : '',
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
    // Se sube a Storage recién al guardar.
    if (!result.canceled) setAvatarUri(result.assets[0].uri);
  };

  const onSubmit = handleSubmit(async (v) => {
    try {
      if (avatarUri && avatarUri !== user.avatarUrl) await uploadAvatar(avatarUri);
      await updateProfile({
        name: v.name,
        bio: v.bio,
        birthDate: v.birthDate ? displayDateToIso(v.birthDate) : '',
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
    <KeyboardScrollView
      className="flex-1 bg-background"
      contentClassName="gap-4 p-5"
      contentStyle={{ paddingBottom: insets.bottom + 24 }}>
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
        name="birthDate"
        render={({ field: { onChange, onBlur, value } }) => (
          <TextField
            label="Fecha de nacimiento"
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            placeholder="DD/MM/AAAA"
            keyboardType="numbers-and-punctuation"
            maxLength={10}
            error={errors.birthDate?.message}
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
          <View className="gap-2 rounded-2xl border border-line bg-surface p-4">
            <View className="flex-row items-center gap-2">
              <MapPin size={18} color={colors.brand} />
              <Text className="text-base font-semibold text-fg">Ubicación para búsquedas</Text>
            </View>
            <Text className="text-sm text-fg-muted">
              {user.hasLocation
                ? 'Los alumnos cercanos ya pueden encontrarte. Solo ven la distancia aproximada, nunca tu ubicación.'
                : 'Todavía no cargaste tu ubicación: los alumnos no te van a ver en la búsqueda por distancia.'}
            </Text>
            <Button
              label={
                user.hasLocation ? 'Actualizar con mi ubicación actual' : 'Usar mi ubicación actual'
              }
              variant="outline"
              loading={updateLocation.isPending || locationStatus === 'loading'}
              onPress={saveLocation}
            />
          </View>
        </>
      ) : null}

      <Button label="Guardar" variant="brand" onPress={onSubmit} loading={isSubmitting} />
    </KeyboardScrollView>
  );
}
