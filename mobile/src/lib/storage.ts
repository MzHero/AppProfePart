// Preferencias y marcas locales del dispositivo (no se sincronizan con el backend).
// Nunca lanzan error: si el almacenamiento falla, se comportan como "no guardado".
import AsyncStorage from '@react-native-async-storage/async-storage';

const PREFIX = 'particuldando.';

export const storageKeys = {
  discoverIntroSeen: 'discoverIntroSeen',
  /**
   * Matches ya festejados (para no repetir la animación). Uno por usuario.
   * v2: se identifican por id + fecha de creación (los ids se reutilizan tras un db reset).
   */
  celebratedMatches: (userId: string) => `celebratedMatches.v2.${userId}`,
};

/** Todas las marcas locales de la app (avisos vistos, matches festejados). */
export async function clearLocalFlags(): Promise<void> {
  try {
    const keys = (await AsyncStorage.getAllKeys()).filter(
      (k) => k.startsWith(PREFIX) && !k.startsWith(`${PREFIX}themePreference`),
    );
    await AsyncStorage.multiRemove(keys);
  } catch {
    // sin almacenamiento: no hay nada que borrar
  }
}

export async function getItem<T>(key: string): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(PREFIX + key);
    return raw === null ? null : (JSON.parse(raw) as T);
  } catch {
    return null;
  }
}

export async function setItem<T>(key: string, value: T): Promise<void> {
  try {
    await AsyncStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    // sin almacenamiento: se vuelve a mostrar la próxima vez, no es grave
  }
}
