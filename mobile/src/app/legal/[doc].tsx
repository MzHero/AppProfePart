// Términos y Condiciones / Política de Privacidad (obligatorios para publicar en tiendas).
// TODO: reemplazar por los textos legales definitivos (o abrir una URL pública con expo-web-browser).
import { Stack, useLocalSearchParams } from 'expo-router';
import { ScrollView, Text } from 'react-native';

const DOCS = {
  terms: {
    title: 'Términos y Condiciones',
    body: 'Texto pendiente. Puntos a cubrir: uso de la plataforma, edad mínima, responsabilidad sobre las clases y los pagos (acordados entre alumno y profesor fuera de la app), conducta, reportes y suspensión de cuentas.',
  },
  privacy: {
    title: 'Política de Privacidad',
    body: 'Texto pendiente. Puntos a cubrir: datos que se recolectan, uso de la ubicación (solo se muestra la distancia aproximada, nunca la ubicación exacta), fotos de perfil, mensajes, eliminación de la cuenta y de los datos.',
  },
} as const;

export default function LegalScreen() {
  const { doc } = useLocalSearchParams<{ doc: string }>();
  const content = DOCS[doc as keyof typeof DOCS] ?? DOCS.terms;
  return (
    <>
      <Stack.Screen options={{ title: content.title }} />
      <ScrollView className="flex-1 bg-surface" contentContainerClassName="p-5">
        <Text className="text-base leading-6 text-fg">{content.body}</Text>
      </ScrollView>
    </>
  );
}
