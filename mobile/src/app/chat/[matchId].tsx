// Conversación 1 a 1 (solo matches aceptados).
// La UI usa react-native-gifted-chat; todo el acoplamiento con la librería está en este archivo.
import 'dayjs/locale/es';

import { useHeaderHeight } from 'expo-router/react-navigation';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { EllipsisVertical } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Alert, Pressable, View } from 'react-native';
import { Bubble, GiftedChat, type IMessage } from 'react-native-gifted-chat';

import { ReportBlockSheet } from '@/components/ReportBlockSheet';
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
  const headerHeight = useHeaderHeight();
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
          title: other.name,
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
        textInputProps={{ placeholder: 'Escribí un mensaje...' }}
        disableKeyboardProvider
        keyboardAvoidingViewProps={{ keyboardVerticalOffset: headerHeight }}
      />
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
