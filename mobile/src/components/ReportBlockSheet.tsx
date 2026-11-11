// Hoja modal para reportar y/o bloquear a un usuario. Se usa en el chat y en el perfil del profesor.
import { Flag, ShieldBan, X } from 'lucide-react-native';
import { useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useBlockUser, useReportUser } from '@/hooks/queries';
import { REPORT_REASONS } from '@/services';
import { useAppTheme } from '@/providers/AppThemeProvider';
import type { ReportReason } from '@/types/models';
import { Button, TextField } from './ui';

export function ReportBlockSheet({
  visible,
  onClose,
  userId,
  userName,
  onBlocked,
}: {
  visible: boolean;
  onClose: () => void;
  userId: string;
  userName: string;
  /** Se llama después de bloquear (ej. para salir de la pantalla). */
  onBlocked?: () => void;
}) {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState<'menu' | 'report'>('menu');
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [details, setDetails] = useState('');
  const report = useReportUser();
  const block = useBlockUser();

  const close = () => {
    setMode('menu');
    setReason(null);
    setDetails('');
    onClose();
  };

  const confirmBlock = () =>
    Alert.alert(
      `¿Bloquear a ${userName}?`,
      'No vas a ver su perfil ni recibir sus mensajes. Esta persona no será notificada.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Bloquear',
          style: 'destructive',
          onPress: () =>
            block.mutate(userId, {
              onSuccess: () => {
                close();
                onBlocked?.();
              },
            }),
        },
      ],
    );

  const sendReport = () => {
    if (!reason) return;
    report.mutate(
      { userId, reason, details: details.trim() || undefined },
      {
        onSuccess: () => {
          close();
          Alert.alert('Reporte enviado', 'Gracias. Vamos a revisarlo a la brevedad.');
        },
      },
    );
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={close}>
      <Pressable className="flex-1 bg-black/40" onPress={close} accessibilityLabel="Cerrar" />
      <View
        className="max-h-[80%] rounded-t-3xl bg-surface px-5 pt-4"
        style={{ paddingBottom: insets.bottom + 16 }}>
        <View className="mb-4 flex-row items-center justify-between">
          <Text className="text-lg font-bold text-fg">
            {mode === 'menu' ? userName : `Reportar a ${userName}`}
          </Text>
          <Pressable onPress={close} hitSlop={10} accessibilityLabel="Cerrar">
            <X size={22} color={colors.fgMuted} />
          </Pressable>
        </View>

        {mode === 'menu' ? (
          <View className="gap-2">
            <SheetOption
              icon={<Flag size={20} color={colors.fg} />}
              label="Reportar"
              onPress={() => setMode('report')}
            />
            <SheetOption
              icon={<ShieldBan size={20} color={colors.accent} />}
              label="Bloquear"
              danger
              onPress={confirmBlock}
            />
          </View>
        ) : (
          <ScrollView contentContainerClassName="gap-3" keyboardShouldPersistTaps="handled">
            <Text className="text-sm text-fg-muted">¿Por qué querés reportar a este usuario?</Text>
            {REPORT_REASONS.map((r) => (
              <Pressable
                key={r.value}
                accessibilityRole="radio"
                accessibilityState={{ checked: reason === r.value }}
                onPress={() => setReason(r.value)}
                className={`rounded-2xl border px-4 py-3 ${reason === r.value ? 'border-brand bg-brand-soft' : 'border-line'}`}>
                <Text className={reason === r.value ? 'font-semibold text-brand-fg' : 'text-fg'}>
                  {r.label}
                </Text>
              </Pressable>
            ))}
            <TextField
              label="Detalles (opcional)"
              value={details}
              onChangeText={setDetails}
              multiline
              maxLength={500}
              placeholder="Contanos qué pasó"
            />
            <Button
              label="Enviar reporte"
              variant="brand"
              disabled={!reason}
              loading={report.isPending}
              onPress={sendReport}
            />
          </ScrollView>
        )}
      </View>
    </Modal>
  );
}

function SheetOption({
  icon,
  label,
  onPress,
  danger,
}: {
  icon: React.ReactNode;
  label: string;
  onPress: () => void;
  danger?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      className="flex-row items-center gap-3 rounded-2xl bg-muted px-4 py-4 active:opacity-80">
      {icon}
      <Text className={`text-base font-semibold ${danger ? 'text-accent' : 'text-fg'}`}>
        {label}
      </Text>
    </Pressable>
  );
}
