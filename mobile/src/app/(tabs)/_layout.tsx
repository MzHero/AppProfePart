// Pestañas según rol:
//  - Alumno:   Cercanos · Descubrir (swipe) · Chats · Perfil
//  - Profesor: Solicitudes · Chats · Perfil
import { Tabs } from 'expo-router';
import { Inbox, MapPin, MessageCircle, Sparkles, UserRound } from 'lucide-react-native';

import { useCurrentUser } from '@/providers/SessionProvider';
import { useAppTheme } from '@/providers/AppThemeProvider';

export default function TabsLayout() {
  const { colors } = useAppTheme();
  const user = useCurrentUser();
  const isStudent = user.role === 'student';

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.brand,
        tabBarInactiveTintColor: colors.fgSoft,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.line },
        tabBarLabelStyle: { fontWeight: '600' },
      }}>
      <Tabs.Screen
        name="nearby"
        options={{
          title: 'Cercanos',
          href: isStudent ? undefined : null,
          tabBarIcon: ({ color, size }) => <MapPin color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="swipe"
        options={{
          title: 'Descubrir',
          href: isStudent ? undefined : null,
          tabBarIcon: ({ color, size }) => <Sparkles color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="requests"
        options={{
          title: 'Solicitudes',
          href: isStudent ? null : undefined,
          tabBarIcon: ({ color, size }) => <Inbox color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="chats"
        options={{
          title: 'Chats',
          tabBarIcon: ({ color, size }) => <MessageCircle color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Perfil',
          tabBarIcon: ({ color, size }) => <UserRound color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}
