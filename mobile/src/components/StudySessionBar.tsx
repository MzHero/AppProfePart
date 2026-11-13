// Barra de la sesión de estudio, arriba del chat. Iniciar y terminar es de a dos:
//   sin sesión          -> "Proponer"
//   propuesta mía       -> esperando que el otro acepte ("Cancelar")
//   propuesta del otro  -> "Empezar" / "Ahora no"
//   en curso            -> "Terminar"
//   uno terminó         -> el otro confirma (o se cierra sola a las 24 h)
//   cerrada             -> "Calificar" (una vez por sesión, los dos)
import { BookOpen, CircleAlert, CircleCheck, Clock, Star } from 'lucide-react-native';
import { useState, type ReactNode } from 'react';
import { ActivityIndicator, Alert, Pressable, Text, View } from 'react-native';

import {
  useAcceptSession,
  useCancelSession,
  useEndSession,
  useStartSession,
  useStudySession,
} from '@/hooks/queries';
import { formatDayTime } from '@/lib/format';
import { useAppTheme } from '@/providers/AppThemeProvider';
import type { PublicUser } from '@/types/models';
import { ReviewSheet } from './ReviewSheet';

interface Action {
  label: string;
  onPress: () => void;
  secondary?: boolean;
}

export function StudySessionBar({ matchId, other }: { matchId: string; other: PublicUser }) {
  const { colors } = useAppTheme();
  const { data: session, isLoading, isError, refetch, isRefetching } = useStudySession(matchId);
  const start = useStartSession(matchId);
  const accept = useAcceptSession(matchId);
  const cancel = useCancelSession(matchId);
  const end = useEndSession(matchId);
  const [reviewOpen, setReviewOpen] = useState(false);

  if (isLoading) return null;

  const onError = (e: Error) => Alert.alert('No se pudo completar', e.message);
  const busy = start.isPending || accept.isPending || cancel.isPending || end.isPending;

  let bar: ReactNode;
  if (isError) {
    // Nunca mostrar "Proponer" si no sabemos el estado real de la sesión.
    bar = (
      <Bar
        icon={<CircleAlert size={20} color={colors.accent} />}
        text="No pudimos cargar la sesión de estudio."
        busy={isRefetching}
        actions={[{ label: 'Reintentar', onPress: () => void refetch() }]}
      />
    );
  } else if (
    !session ||
    session.status === 'cancelled' ||
    (session.status === 'closed' && session.reviewedByMe)
  ) {
    bar = (
      <Bar
        icon={<BookOpen size={20} color={colors.brand} />}
        text={
          session?.status === 'cancelled'
            ? 'La propuesta de sesión no se aceptó. ¿Proponés otra?'
            : session
              ? '¿Otra clase? Proponé una nueva sesión de estudio.'
              : '¿Empiezan la clase? Proponé una sesión de estudio.'
        }
        busy={busy}
        actions={[{ label: 'Proponer', onPress: () => start.mutate(undefined, { onError }) }]}
      />
    );
  } else if (session.status === 'proposed' && session.proposedByMe) {
    bar = (
      <Bar
        icon={<Clock size={20} color={colors.fgMuted} />}
        text={`Le propusiste a ${other.name} empezar una sesión de estudio. Esperando que acepte.`}
        busy={busy}
        actions={[
          {
            label: 'Cancelar',
            secondary: true,
            onPress: () => cancel.mutate(session.id, { onError }),
          },
        ]}
      />
    );
  } else if (session.status === 'proposed') {
    bar = (
      <Bar
        highlight
        icon={<BookOpen size={20} color={colors.brand} />}
        text={`${other.name} quiere empezar una sesión de estudio.`}
        busy={busy}
        actions={[
          {
            label: 'Ahora no',
            secondary: true,
            onPress: () => cancel.mutate(session.id, { onError }),
          },
          { label: 'Empezar', onPress: () => accept.mutate(session.id, { onError }) },
        ]}
      />
    );
  } else if (session.status === 'active') {
    bar = (
      <Bar
        icon={<Clock size={20} color={colors.brand} />}
        text={`Sesión de estudio en curso, empezó ${formatDayTime(session.startedAt ?? session.proposedAt)}.`}
        busy={busy}
        actions={[{ label: 'Terminar', onPress: () => end.mutate(session.id, { onError }) }]}
      />
    );
  } else if (session.status === 'closing' && session.endRequestedBy === 'me') {
    bar = (
      <Bar
        icon={<Clock size={20} color={colors.fgMuted} />}
        text={`Terminaste la sesión. Falta que ${other.name} confirme; si no, se cierra sola ${formatDayTime(session.closesAt)}.`}
      />
    );
  } else if (session.status === 'closing') {
    bar = (
      <Bar
        highlight
        icon={<CircleCheck size={20} color={colors.brand} />}
        text={`${other.name} terminó la sesión. ¿Terminó para vos también?`}
        busy={busy}
        actions={[{ label: 'Confirmar', onPress: () => end.mutate(session.id, { onError }) }]}
      />
    );
  } else {
    bar = (
      <Bar
        highlight
        icon={<Star size={20} color={colors.star} fill={colors.star} />}
        text={
          session.endReason === 'timeout'
            ? `La sesión se cerró sola a las 24 h. ¿Cómo te fue con ${other.name}?`
            : `La sesión terminó. ¿Cómo te fue con ${other.name}?`
        }
        actions={[{ label: 'Calificar', onPress: () => setReviewOpen(true) }]}
      />
    );
  }

  return (
    <>
      {bar}
      {session && session.status === 'closed' && !session.reviewedByMe ? (
        <ReviewSheet
          visible={reviewOpen}
          onClose={() => setReviewOpen(false)}
          matchId={matchId}
          sessionId={session.id}
          reviewee={other}
        />
      ) : null}
    </>
  );
}

function Bar({
  icon,
  text,
  actions = [],
  busy,
  highlight,
}: {
  icon: ReactNode;
  text: string;
  actions?: Action[];
  busy?: boolean;
  highlight?: boolean;
}) {
  const { colors } = useAppTheme();
  return (
    <View
      className={`mx-3 mt-2 gap-2 rounded-2xl border px-3 py-2.5 ${highlight ? 'border-line-brand bg-brand-soft' : 'border-line bg-surface'}`}>
      <View className="flex-row items-center gap-3">
        {icon}
        <Text className="flex-1 text-sm leading-5 text-fg">{text}</Text>
        {actions.length === 1 ? <ActionButton action={actions[0]} busy={busy} /> : null}
      </View>
      {actions.length > 1 ? (
        <View className="flex-row justify-end gap-2">
          {busy ? (
            <ActivityIndicator color={colors.brand} />
          ) : (
            actions.map((a) => <ActionButton key={a.label} action={a} />)
          )}
        </View>
      ) : null}
    </View>
  );
}

function ActionButton({ action, busy }: { action: Action; busy?: boolean }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={action.onPress}
      disabled={busy}
      className={`min-w-[88px] items-center rounded-full border px-4 py-2 active:opacity-80 ${action.secondary ? 'border-line bg-surface' : 'border-brand bg-brand'}`}>
      {busy ? (
        <ActivityIndicator size="small" color={action.secondary ? undefined : '#fff'} />
      ) : (
        <Text
          className={`text-sm font-semibold ${action.secondary ? 'text-fg-muted' : 'text-white'}`}>
          {action.label}
        </Text>
      )}
    </Pressable>
  );
}
