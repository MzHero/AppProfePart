// Hoja para calificar al otro después de una sesión de estudio (1-5 estrellas + comentario).
// El comentario pasa por el filtro de lenguaje ofensivo (acá y en el servidor).
import { zodResolver } from '@hookform/resolvers/zod';
import { Star, X } from 'lucide-react-native';
import { Controller, useForm } from 'react-hook-form';
import { Modal, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useSubmitReview } from '@/hooks/queries';
import { reviewSchema, type ReviewForm } from '@/lib/schemas';
import { useAppTheme } from '@/providers/AppThemeProvider';
import type { PublicUser } from '@/types/models';
import { FocusScrollView, KeyboardAvoider } from './KeyboardAware';
import { Avatar, Button, TextField } from './ui';

const RATING_LABELS = ['', 'Muy mala', 'Mala', 'Regular', 'Buena', 'Excelente'];

export function ReviewSheet({
  visible,
  onClose,
  matchId,
  sessionId,
  reviewee,
}: {
  visible: boolean;
  onClose: () => void;
  matchId: string;
  sessionId: string;
  reviewee: PublicUser;
}) {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const submit = useSubmitReview(matchId, reviewee.id);
  const {
    control,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<ReviewForm>({
    resolver: zodResolver(reviewSchema),
    defaultValues: { rating: 0, comment: '' },
  });
  const close = () => {
    reset();
    submit.reset();
    onClose();
  };

  const onSubmit = handleSubmit((v) =>
    submit.mutate(
      { sessionId, rating: v.rating, comment: v.comment || undefined },
      {
        onSuccess: close,
        // El servidor puede rechazar el comentario (filtro) o la sesión (ya calificada).
        onError: (e) => setError('comment', { message: e.message }),
      },
    ),
  );

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={close}>
      {/* Sin esto, en Android (edge-to-edge) el teclado tapa el comentario. */}
      <KeyboardAvoider>
        <Pressable className="flex-1 bg-black/40" onPress={close} accessibilityLabel="Cerrar" />
        <View
          className="max-h-[90%] rounded-t-3xl bg-surface px-5 pt-4"
          style={{ paddingBottom: insets.bottom + 16 }}>
          <View className="mb-2 flex-row justify-end">
            <Pressable onPress={close} hitSlop={10} accessibilityLabel="Cerrar">
              <X size={22} color={colors.fgMuted} />
            </Pressable>
          </View>
          <FocusScrollView contentClassName="gap-4">
            <View className="items-center gap-2">
              <Avatar uri={reviewee.avatarUrl} name={reviewee.name} size={64} />
              <Text className="text-center text-lg font-bold text-fg">
                ¿Cómo fue la sesión con {reviewee.name}?
              </Text>
            </View>

            <Controller
              control={control}
              name="rating"
              render={({ field: { value, onChange } }) => (
                <View className="items-center gap-1">
                  <View className="flex-row gap-2" accessibilityRole="adjustable">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <Pressable
                        key={n}
                        hitSlop={4}
                        onPress={() => onChange(n)}
                        accessibilityRole="button"
                        accessibilityLabel={`${n} ${n === 1 ? 'estrella' : 'estrellas'}`}
                        accessibilityState={{ selected: value === n }}>
                        <Star
                          size={40}
                          color={colors.star}
                          fill={n <= value ? colors.star : 'transparent'}
                        />
                      </Pressable>
                    ))}
                  </View>
                  <Text className="h-5 text-sm font-semibold text-fg-muted">
                    {RATING_LABELS[value] ?? ''}
                  </Text>
                  {errors.rating ? (
                    <Text className="text-xs text-accent">{errors.rating.message}</Text>
                  ) : null}
                </View>
              )}
            />

            <Controller
              control={control}
              name="comment"
              render={({ field: { value, onChange, onBlur } }) => (
                <TextField
                  label="Comentario (opcional)"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  multiline
                  maxLength={500}
                  placeholder="Contá cómo fue: qué te gustó y qué se podría mejorar"
                  error={errors.comment?.message}
                />
              )}
            />
            <Text className="text-xs leading-5 text-fg-soft">
              Tu reseña la van a ver otros usuarios. Podés decir si no te gustó, pero sin insultos
              ni agresiones: los comentarios ofensivos no se publican.
            </Text>

            <Button
              label="Enviar calificación"
              variant="brand"
              loading={submit.isPending}
              onPress={onSubmit}
            />
          </FocusScrollView>
        </View>
      </KeyboardAvoider>
    </Modal>
  );
}
