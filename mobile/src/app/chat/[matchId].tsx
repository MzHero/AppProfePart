// Conversación 1 a 1 (solo matches aceptados).
// La UI usa react-native-gifted-chat; todo el acoplamiento con la librería está en este archivo.
import 'dayjs/locale/es';

import { router, Stack, useLocalSearchParams } from 'expo-router';
import { EllipsisVertical } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import { Bubble, GiftedChat, Send, type IMessage } from 'react-native-gifted-chat';

import { KeyboardAvoider } from '@/components/KeyboardAware';
import { ReportBlockSheet } from '@/components/ReportBlockSheet';
import { StudySessionBar } from '@/components/StudySessionBar';
import { ErrorState, LoadingView } from '@/components/ui';
import { useMatch, useMessages, useSendMessage } from '@/hooks/queries';
import { useCurrentUser } from '@/providers/SessionProvider';
import { useAppTheme } from '@/providers/AppThemeProvider';
import type { Message, PublicUser } from '@/types/models';

const toGifted = (m: Message, me: string, other: PublicUser): IMessage => ({
  _id: m.id,
  text: m.text,
  createdAt: new Date(m.createdAt),
  user:
    m.senderId === me ? { _id: me } : { _id: other.id, name: other.name, avatar: other.avatarUrl },
});

export default function ChatScreen() {
  const { colors, scheme } = useAppTheme();
  const { matchId } = useLocalSearchParams<{ matchId: string }>();
  const user = useCurrentUser();
  const match = useMatch(matchId);
  const messages = useMessages(matchId);
  const send = useSendMessage(matchId);
  const [sheetOpen, setSheetOpen] = useState(false);

  const other = match.data
    ? match.data.student.id === user.id
      ? match.data.teacher
      : match.data.student
    : null;

  // GiftedChat espera los mensajes del más nuevo al más viejo.
  const giftedMessages = useMemo(
    () => (other ? (messages.data ?? []).map((m) => toGifted(m, user.id, other)).reverse() : []),
    [messages.data, other, user.id],
  );

  if (match.isLoading || messages.isLoading) return <LoadingView />;
  if (match.isError || !other) return <ErrorState message="No encontramos esta conversación." />;

  return (
    <View className="flex-1 bg-background">
      <Stack.Screen
        options={{
          // Tocar el nombre abre el perfil del otro (con sus reseñas).
          headerTitle: () => (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Ver el perfil de ${other.name}`}
              hitSlop={8}
              onPress={() =>
                other.role === 'teacher'
                  ? router.push({ pathname: '/teacher/[id]', params: { id: other.id } })
                  : router.push({ pathname: '/user/[id]', params: { id: other.id } })
              }>
              <Text className="text-lg font-bold text-fg">{other.name}</Text>
            </Pressable>
          ),
          headerRight: () => (
            <Pressable
              onPress={() => setSheetOpen(true)}
              hitSlop={10}
              accessibilityLabel="Reportar o bloquear">
              <EllipsisVertical size={22} color={colors.fg} />
            </Pressable>
          ),
        }}
      />
      {/* El teclado lo maneja KeyboardAvoider (funciona en Expo Go); el de gifted-chat usa
          react-native-keyboard-controller y se desactiva. */}
      <KeyboardAvoider>
        <StudySessionBar matchId={matchId} other={other} />
        <GiftedChat
          messages={giftedMessages}
          user={{ _id: user.id }}
          onSend={(msgs) =>
            msgs.forEach((m) =>
              send.mutate(m.text, { onError: (e) => Alert.alert('No se envió', e.message) }),
            )
          }
          locale="es"
          dateFormat="D [de] MMMM"
          dateFormatCalendar={{
            sameDay: '[Hoy]',
            lastDay: '[Ayer]',
            lastWeek: 'dddd',
            sameElse: 'D [de] MMMM',
          }}
          colorScheme={scheme}
          renderBubble={(props) => (
            <Bubble
              {...props}
              wrapperStyle={{
                left: { backgroundColor: colors.surface },
                right: { backgroundColor: colors.brand },
              }}
              textStyle={{ left: { color: colors.fg }, right: { color: '#fff' } }}
            />
          )}
          renderSend={(props) => (
            <Send
              {...props}
              label="Enviar"
              textStyle={{ color: colors.brand, fontWeight: '700' }}
            />
          )}
          textInputProps={{
            placeholder: 'Escribí un mensaje...',
            placeholderTextColor: colors.fgSoft,
            style: { color: colors.fg },
          }}
          disableKeyboardProvider
          keyboardAvoidingViewProps={{ enabled: false }}
        />
      </KeyboardAvoider>
      <ReportBlockSheet
        visible={sheetOpen}
        onClose={() => setSheetOpen(false)}
        userId={other.id}
        userName={other.name}
        onBlocked={() => router.back()}
      />
    </View>
  );
}
