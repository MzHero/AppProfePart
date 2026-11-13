// Perfil propio: editar, legales, cerrar sesión y eliminar cuenta (requisito de Apple).
import { Image } from 'expo-image';
import { router, type Href } from 'expo-router';
import {
  ChevronRight,
  FileText,
  LogOut,
  Pencil,
  RotateCcw,
  Shield,
  Trash2,
} from 'lucide-react-native';
import type { ReactNode } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';

import { InitialAvatar, Screen, Segmented, SubjectTag } from '@/components/ui';
import { clearLocalFlags } from '@/lib/storage';
import { useAppTheme, type ThemePreference } from '@/providers/AppThemeProvider';
import { useCurrentUser, useSession } from '@/providers/SessionProvider';

const THEME_OPTIONS: { value: ThemePreference; label: string }[] = [
  { value: 'system', label: 'Sistema' },
  { value: 'light', label: 'Claro' },
  { value: 'dark', label: 'Oscuro' },
];

export default function ProfileScreen() {
  const { colors, preference, setPreference } = useAppTheme();
  const user = useCurrentUser();
  const { signOut, deleteAccount } = useSession();

  const confirmDelete = () =>
    Alert.alert(
      'Eliminar cuenta',
      'Se borrarán tu perfil, tus matches y tus mensajes. Esta acción no se puede deshacer.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Eliminar', style: 'destructive', onPress: () => deleteAccount() },
      ],
    );

  return (
    <Screen>
      <ScrollView contentContainerClassName="gap-6 p-4 pb-10">
        <View className="items-center gap-3 rounded-3xl bg-surface p-6">
          {user.avatarUrl ? (
            <Image
              source={{ uri: user.avatarUrl }}
              style={{ width: 96, height: 96, borderRadius: 48 }}
            />
          ) : (
            <InitialAvatar name={user.name} size={96} />
          )}
          <View className="items-center gap-1">
            <Text className="text-xl font-bold text-fg">{user.name}</Text>
            <Text className="text-sm text-fg-muted">
              {user.role === 'teacher' ? 'Profesor' : 'Alumno'} · {user.email}
            </Text>
          </View>
          {user.bio ? <Text className="text-center text-base text-fg">{user.bio}</Text> : null}
          {user.role === 'teacher' && user.subjects?.length ? (
            <View className="flex-row flex-wrap justify-center gap-2">
              {user.subjects.map((s) => (
                <SubjectTag key={s} label={s} />
              ))}
            </View>
          ) : null}
        </View>

        <View className="gap-3 rounded-3xl bg-surface p-4">
          <View className="gap-0.5">
            <Text className="text-base font-semibold text-fg">Apariencia</Text>
            <Text className="text-sm text-fg-muted">
              {preference === 'system'
                ? 'Sigue el modo claro u oscuro de tu dispositivo.'
                : `Siempre en modo ${preference === 'dark' ? 'oscuro' : 'claro'}.`}
            </Text>
          </View>
          <Segmented value={preference} options={THEME_OPTIONS} onChange={setPreference} />
        </View>

        <View className="overflow-hidden rounded-3xl bg-surface">
          <Row
            icon={<Pencil size={20} color={colors.brand} />}
            label="Editar perfil"
            href="/profile/edit"
          />
          <Row
            icon={<FileText size={20} color={colors.brand} />}
            label="Términos y Condiciones"
            href="/legal/terms"
          />
          <Row
            icon={<Shield size={20} color={colors.brand} />}
            label="Política de Privacidad"
            href="/legal/privacy"
            last
          />
        </View>

        <View className="overflow-hidden rounded-3xl bg-surface">
          <Row
            icon={<LogOut size={20} color={colors.fg} />}
            label="Cerrar sesión"
            onPress={signOut}
          />
          <Row
            icon={<Trash2 size={20} color={colors.accent} />}
            label="Eliminar cuenta"
            danger
            onPress={confirmDelete}
            last
          />
        </View>

        {/* Solo en desarrollo: para volver a probar el aviso de Descubrir y las animaciones de
            match después de un `supabase db reset`. No aparece en la app publicada. */}
        {__DEV__ ? (
          <View className="overflow-hidden rounded-3xl border border-dashed border-line-brand bg-surface">
            <Text className="px-4 pt-3 text-xs font-semibold uppercase tracking-wide text-fg-soft">
              Desarrollo
            </Text>
            <Row
              icon={<RotateCcw size={20} color={colors.brand} />}
              label="Reiniciar avisos y animaciones"
              onPress={async () => {
                await clearLocalFlags();
                await signOut();
              }}
              last
            />
          </View>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

function Row({
  icon,
  label,
  href,
  onPress,
  danger,
  last,
}: {
  icon: ReactNode;
  label: string;
  href?: Href;
  onPress?: () => void;
  danger?: boolean;
  last?: boolean;
}) {
  const { colors } = useAppTheme();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={href ? () => router.push(href) : onPress}
      className={`flex-row items-center gap-3 px-4 py-4 active:bg-muted ${last ? '' : 'border-b border-line'}`}>
      {icon}
      <Text className={`flex-1 text-base ${danger ? 'text-accent' : 'text-fg'}`}>{label}</Text>
      {href ? <ChevronRight size={20} color={colors.fgSoft} /> : null}
    </Pressable>
  );
}
