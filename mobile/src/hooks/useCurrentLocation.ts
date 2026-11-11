import * as Location from 'expo-location';
import { useEffect, useState } from 'react';

import type { Coords } from '@/types/models';

type Status = 'loading' | 'granted' | 'denied' | 'error';

/**
 * Pide permiso y obtiene la ubicación aproximada del usuario.
 * Las coordenadas solo se envían al backend para calcular distancias;
 * nunca se muestran ni se devuelven las de otros usuarios.
 */
export function useCurrentLocation() {
  const [coords, setCoords] = useState<Coords | null>(null);
  const [status, setStatus] = useState<Status>('loading');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { granted } = await Location.requestForegroundPermissionsAsync();
        if (!granted) {
          if (!cancelled) setStatus('denied');
          return;
        }
        const pos = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        if (!cancelled) {
          setCoords({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
          setStatus('granted');
        }
      } catch {
        if (!cancelled) setStatus('error');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return { coords, status };
}
