// Ruta de entrada "/". Decide a dónde ir según la sesión y el rol.
// También es el destino al que vuelve Stack.Protected al iniciar o cerrar sesión.
import { Redirect } from 'expo-router';

import { useSession } from '@/providers/SessionProvider';

export default function Index() {
  const { user } = useSession();
  if (!user) return <Redirect href="/login" />;
  return <Redirect href={user.role === 'teacher' ? '/requests' : '/nearby'} />;
}
