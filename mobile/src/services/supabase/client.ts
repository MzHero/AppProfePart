// Cliente de Supabase. Solo lo importan los archivos de services/supabase/.
//
// Configuración (mobile/.env.local, ver .env.example):
//   EXPO_PUBLIC_SUPABASE_URL
//   EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY   (clave pública; NUNCA la secret/service_role)
// Si faltan, la app usa los datos mock (services/index.ts).
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';

import type { Database } from './database.types';

// Acceso directo (no dinámico) para que Expo inyecte las variables en el bundle.
const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const publishableKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export const isSupabaseConfigured = Boolean(url && publishableKey);

let client: SupabaseClient<Database> | null = null;

export function supabase(): SupabaseClient<Database> {
  if (!client) {
    if (!url || !publishableKey) throw new Error('Supabase no está configurado');
    client = createClient<Database>(url, publishableKey, {
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        // En Android/iOS no hay URL de la que leer una sesión.
        detectSessionInUrl: false,
      },
    });
    if (Platform.OS !== 'web') {
      // El refresco del token corre en loop: se pausa con la app en segundo plano.
      const c = client;
      AppState.addEventListener('change', (state) => {
        if (state === 'active') c.auth.startAutoRefresh();
        else c.auth.stopAutoRefresh();
      });
    }
  }
  return client;
}

/** id del usuario con sesión (auth.uid()). */
export async function requireUserId(): Promise<string> {
  const { data } = await supabase().auth.getSession();
  const id = data.session?.user.id;
  if (!id) throw new Error('Tu sesión expiró. Volvé a ingresar.');
  return id;
}
