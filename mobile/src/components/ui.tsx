// Componentes base de la interfaz. Estilos con NativeWind (className).
import { MapPin } from 'lucide-react-native';
import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { formatDistance } from '@/lib/format';
import { useAppTheme } from '@/providers/AppThemeProvider';

// ---------- Layout ----------

/** Contenedor de pantalla con el fondo del tema y márgenes de zona segura. */
export function Screen({
  children,
  edges = ['top'],
  className = '',
}: {
  children: ReactNode;
  edges?: ('top' | 'bottom')[];
  className?: string;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View
      className={`flex-1 bg-background ${className}`}
      style={{
        paddingTop: edges.includes('top') ? insets.top : 0,
        paddingBottom: edges.includes('bottom') ? insets.bottom : 0,
      }}>
      {children}
    </View>
  );
}

export function ScreenTitle({ children }: { children: ReactNode }) {
  return <Text className="px-4 pb-3 pt-4 text-2xl font-bold text-fg">{children}</Text>;
}

export function LoadingView() {
  const { colors } = useAppTheme();
  return (
    <View className="flex-1 items-center justify-center">
      <ActivityIndicator color={colors.brand} />
    </View>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <View className="flex-1 items-center justify-center gap-2 px-8 py-12">
      <Text className="text-center text-base font-semibold text-fg">{title}</Text>
      {description ? (
        <Text className="text-center text-sm text-fg-muted">{description}</Text>
      ) : null}
      {action ? <View className="mt-3 w-full">{action}</View> : null}
    </View>
  );
}

export function ErrorState({ message, onRetry }: { message?: string; onRetry?: () => void }) {
  return (
    <EmptyState
      title="Algo salió mal"
      description={message ?? 'No pudimos cargar la información.'}
      action={onRetry ? <Button label="Reintentar" variant="outline" onPress={onRetry} /> : null}
    />
  );
}

// ---------- Botones ----------

type ButtonVariant = 'primary' | 'brand' | 'outline' | 'ghost' | 'danger';

const buttonStyles: Record<ButtonVariant, { box: string; text: string }> = {
  primary: { box: 'bg-accent shadow-md shadow-accent/40', text: 'text-white' },
  brand: { box: 'bg-brand', text: 'text-white' },
  outline: { box: 'border border-line bg-muted', text: 'text-fg-muted' },
  ghost: { box: 'bg-transparent', text: 'text-brand' },
  danger: { box: 'border border-accent bg-surface', text: 'text-accent' },
};

export function Button({
  label,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  icon,
}: {
  label: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  loading?: boolean;
  disabled?: boolean;
  icon?: ReactNode;
}) {
  const { colors } = useAppTheme();
  const s = buttonStyles[variant];
  const isDisabled = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={isDisabled}
      className={`h-14 flex-row items-center justify-center gap-2 rounded-2xl px-5 active:opacity-80 ${s.box} ${isDisabled ? 'opacity-60' : ''}`}>
      {loading ? (
        <ActivityIndicator
          color={variant === 'primary' || variant === 'brand' ? '#fff' : colors.brand}
        />
      ) : (
        <>
          {icon}
          <Text className={`text-base font-semibold ${s.text}`}>{label}</Text>
        </>
      )}
    </Pressable>
  );
}

/** Botón redondo grande del swipe (X / corazón). */
export function RoundButton({
  onPress,
  children,
  tone,
  accessibilityLabel,
}: {
  onPress: () => void;
  children: ReactNode;
  tone: 'danger' | 'success';
  accessibilityLabel: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      className={`h-[72px] w-[72px] items-center justify-center rounded-full shadow-md active:scale-95 ${tone === 'danger' ? 'bg-accent-soft' : 'bg-success-soft'}`}>
      {children}
    </Pressable>
  );
}

// ---------- Formularios ----------

export function TextField({
  label,
  error,
  ...props
}: TextInputProps & { label: string; error?: string }) {
  const { colors } = useAppTheme();
  return (
    <View className="gap-1.5">
      <Text className="text-sm font-semibold text-fg">{label}</Text>
      <TextInput
        placeholderTextColor={colors.fgSoft}
        className={`min-h-14 rounded-2xl border bg-surface px-4 text-base text-fg ${error ? 'border-accent' : 'border-line'} ${props.multiline ? 'py-3' : ''}`}
        {...props}
      />
      {error ? <Text className="text-xs text-accent">{error}</Text> : null}
    </View>
  );
}

/** Selector segmentado (ej. Alumno / Profesor). */
export function Segmented<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <View className="flex-row rounded-2xl bg-brand-soft p-1">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Pressable
            key={o.value}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            onPress={() => onChange(o.value)}
            className={`flex-1 items-center rounded-xl py-3 ${active ? 'bg-surface shadow-sm' : ''}`}>
            <Text className={`font-semibold ${active ? 'text-brand-fg' : 'text-fg-muted'}`}>
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// ---------- Datos ----------

export function Chip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      className={`rounded-full border px-4 py-2 ${active ? 'border-brand bg-brand' : 'border-line-brand bg-surface'}`}>
      <Text className={`text-sm font-semibold ${active ? 'text-white' : 'text-brand-fg'}`}>
        {label}
      </Text>
    </Pressable>
  );
}

export function SubjectTag({ label }: { label: string }) {
  return (
    <View className="rounded-lg bg-brand-soft px-2.5 py-1">
      <Text className="text-sm text-brand-fg">{label}</Text>
    </View>
  );
}

export function Stars({ rating, size = 'sm' }: { rating: number; size?: 'sm' | 'md' }) {
  const r = Math.round(rating);
  return (
    <Text
      accessibilityLabel={`${r} de 5 estrellas`}
      className={`text-star ${size === 'md' ? 'text-lg' : 'text-sm'}`}>
      {'★'.repeat(r)}
      {'☆'.repeat(5 - r)}
    </Text>
  );
}

export function DistanceBadge({ km }: { km: number }) {
  return (
    <View className="flex-row items-center gap-1 rounded-full bg-black/60 px-2 py-1">
      <MapPin size={11} color="#fff" />
      <Text className="text-xs font-medium text-white">{formatDistance(km)}</Text>
    </View>
  );
}

/** Avatar circular con inicial cuando no hay foto. */
export function InitialAvatar({ name, size = 56 }: { name: string; size?: number }) {
  return (
    <View
      className="items-center justify-center rounded-full bg-brand-soft"
      style={{ width: size, height: size }}>
      <Text className="font-bold text-brand-fg" style={{ fontSize: size * 0.36 }}>
        {name.charAt(0).toUpperCase()}
      </Text>
    </View>
  );
}
