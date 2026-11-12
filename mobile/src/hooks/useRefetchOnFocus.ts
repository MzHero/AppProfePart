import { useFocusEffect } from 'expo-router';
import { useCallback, useRef } from 'react';

/**
 * Recarga los datos cada vez que se vuelve a la pantalla.
 * Las pestañas quedan montadas al cambiar de tab, así que TanStack Query no recarga solo:
 * sin esto, "Cercanos" o "Chats" podían mostrar datos viejos indefinidamente.
 */
export function useRefetchOnFocus(refetch: () => unknown) {
  const firstFocus = useRef(true);
  useFocusEffect(
    useCallback(() => {
      // La primera vez la consulta ya se está haciendo al montar.
      if (firstFocus.current) {
        firstFocus.current = false;
        return;
      }
      refetch();
    }, [refetch]),
  );
}
