// Ubicación del usuario, ÚNICA y compartida por todas las pantallas (grilla, swipe, perfil del
// profesor, edición de perfil). Cuando se actualiza, todas las pantallas reciben la misma.
//
// Antes cada pantalla guardaba su propia lectura: "Cercanos" y "Descubrir" podían calcular
// distancias desde puntos distintos y mostrar resultados contradictorios.
import * as Location from 'expo-location';
import { useEffect, useSyncExternalStore } from 'react';
import { AppState } from 'react-native';

import type { Coords } from '@/types/models';

type Status = 'loading' | 'granted' | 'denied' | 'error';
export interface LocationState {
  coords: Coords | null;
  status: Status;
}

/** Una lectura más vieja que esto se renueva al abrir una pantalla o volver a la app. */
const REFRESH_AFTER_MS = 2 * 60_000;
/**
 * Movimientos menores se ignoran: la ubicación por Wi-Fi/red (y el GPS en interiores) "salta"
 * decenas o cientos de metros entre lecturas, y no queremos recalcular todo por ruido.
 */
const MIN_MOVE_METERS = 100;

let state: LocationState = { coords: null, status: 'loading' };
let lastFetchAt = 0;
let inFlight: Promise<void> | null = null;
const listeners = new Set<() => void>();
let appStateSubscribed = false;

function setState(next: LocationState) {
  state = next;
  listeners.forEach((l) => l());
}

function metersBetween(a: Coords, b: Coords): number {
  const R = 6_371_000;
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.latitude - a.latitude);
  const dLng = rad(b.longitude - a.longitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a.latitude)) * Math.cos(rad(b.latitude)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Una posición "última conocida" más vieja que esto no se usa ni como primer dato. */
const LAST_KNOWN_MAX_AGE_MS = 10 * 60_000;

async function hasPermission(): Promise<boolean> {
  // Consultar primero no muestra ningún diálogo: si ya está concedido, no se vuelve a pedir.
  const current = await Location.getForegroundPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain) return false;
  return (await Location.requestForegroundPermissionsAsync()).granted;
}

/** Aplica una lectura nueva, ignorando el ruido (< MIN_MOVE_METERS). */
function apply(next: LocationState) {
  if (next.status === 'error' && state.coords) return; // falló una relectura: conservar la anterior
  if (
    next.coords &&
    state.coords &&
    state.status === 'granted' &&
    metersBetween(state.coords, next.coords) < MIN_MOVE_METERS
  ) {
    return;
  }
  setState(next);
}

const toCoords = (pos: Location.LocationObject): Coords => ({
  latitude: pos.coords.latitude,
  longitude: pos.coords.longitude,
});

/**
 * Vuelve a leer la ubicación si la última lectura es vieja (o siempre, con `force`).
 * Todas las pantallas que usan useCurrentLocation reciben el resultado.
 *
 * Rapidez: primero se usa la última posición conocida del sistema (instantánea), así las
 * pantallas pueden buscar profesores enseguida; después llega la posición precisa del GPS
 * (puede tardar varios segundos) y solo se aplica si cambió más de MIN_MOVE_METERS.
 */
export function refreshLocation(force = false): Promise<void> {
  if (inFlight) return inFlight;
  if (!force && lastFetchAt && Date.now() - lastFetchAt < REFRESH_AFTER_MS) {
    return Promise.resolve();
  }
  inFlight = (async () => {
    try {
      if (!(await hasPermission())) {
        setState({ coords: null, status: 'denied' });
        return;
      }
      if (state.status === 'loading') {
        const last = await Location.getLastKnownPositionAsync({
          maxAge: LAST_KNOWN_MAX_AGE_MS,
        }).catch(() => null);
        if (last) apply({ coords: toCoords(last), status: 'granted' });
      }
      const precise = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      apply({ coords: toCoords(precise), status: 'granted' });
    } catch {
      apply({ coords: null, status: 'error' });
    } finally {
      lastFetchAt = Date.now();
    }
  })().finally(() => {
    inFlight = null;
  });
  return inFlight;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (!appStateSubscribed) {
    appStateSubscribed = true;
    // Al volver a la app (o a la pestaña, en web) se renueva si la lectura quedó vieja.
    AppState.addEventListener('change', (s) => {
      if (s === 'active') refreshLocation();
    });
  }
  return () => {
    listeners.delete(listener);
  };
}

const getSnapshot = () => state;

/**
 * Ubicación aproximada del usuario. Las coordenadas solo se envían al backend para
 * calcular distancias; nunca se muestran ni se reciben las de otros usuarios.
 */
export function useCurrentLocation(): LocationState {
  const current = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  useEffect(() => {
    refreshLocation();
  }, []);
  return current;
}
