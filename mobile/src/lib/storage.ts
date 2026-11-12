// Preferencias y marcas locales del dispositivo (no se sincronizan con el backend).
// Nunca lanzan error: si el almacenamiento falla, se comportan como "no guardado".
import AsyncStorage from '@react-native-async-storage/async-storage';

const PREFIX = 'particuldando.';

export const storageKeys = {
  discoverIntroSeen: 'discoverIntroSeen',
  /** Matches ya festejados (para no repetir la animación). Uno por usuario. */
  celebratedMatches: (userId: string) => `celebratedMatches.${userId}`,
};

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
