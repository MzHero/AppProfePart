import type { User } from '@/types/models';
import type { AuthService } from '../types';
import { requireUserId, supabase } from './client';
import { checkMaybe, checkOk, toAppError } from './errors';
import { toUser } from './mappers';

const AVATARS = 'avatars';

/** Último perfil cargado (lo usan otros servicios para armar datos del usuario actual). */
let cachedProfile: User | null = null;
export const getCachedProfile = () => cachedProfile;

async function loadProfile(): Promise<User> {
  const row = checkMaybe(await supabase().rpc('get_my_profile').maybeSingle());
  if (!row) throw new Error('No encontramos tu perfil');
  cachedProfile = toUser(row);
  return cachedProfile;
}

const MIME_BY_EXT: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
};

async function removeMyAvatars(userId: string, keep?: string) {
  const bucket = supabase().storage.from(AVATARS);
  const { data } = await bucket.list(userId);
  const paths = (data ?? []).map((f) => `${userId}/${f.name}`).filter((p) => p !== keep);
  if (paths.length) await bucket.remove(paths);
}

export const supabaseAuthService: AuthService = {
  async getSession() {
    const { data } = await supabase().auth.getSession();
    if (!data.session) return null;
    try {
      return await loadProfile();
    } catch {
      return null;
    }
  },

  onAuthChange(callback) {
    const { data } = supabase().auth.onAuthStateChange((event, session) => {
      if (event === 'INITIAL_SESSION' || event === 'TOKEN_REFRESHED') return;
      if (!session) {
        cachedProfile = null;
        callback(null);
        return;
      }
      if (event === 'SIGNED_IN' || event === 'USER_UPDATED') {
        // No llamar a Supabase dentro del callback (puede trabarse): se difiere.
        setTimeout(() => {
          loadProfile()
            .then(callback)
            .catch(() => {});
        }, 0);
      }
    });
    return () => data.subscription.unsubscribe();
  },

  async signIn(email, password) {
    const { error } = await supabase().auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });
    if (error) throw toAppError(error);
    return loadProfile();
  },

  async signUp({ name, email, password, role }) {
    const { data, error } = await supabase().auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      // El trigger on_auth_user_created crea public.users con estos datos.
      options: { data: { name: name.trim(), role } },
    });
    if (error) throw toAppError(error);
    if (!data.session) return { user: null, needsEmailConfirmation: true };
    return { user: await loadProfile(), needsEmailConfirmation: false };
  },

  async signOut() {
    cachedProfile = null;
    const { error } = await supabase().auth.signOut();
    // Si el servidor ya no tiene la sesión (vencida, o se reseteó la base) responde 401/403/404.
    // Para el usuario eso igual es "cerrar sesión": se borra la sesión local y listo.
    if (error) await supabase().auth.signOut({ scope: 'local' });
  },

  async updateProfile(changes) {
    const userId = await requireUserId();
    const sb = supabase();

    const userCols = {
      ...(changes.name !== undefined && { name: changes.name }),
      ...(changes.bio !== undefined && { bio: changes.bio || null }),
      ...(changes.birthDate !== undefined && { birth_date: changes.birthDate || null }),
    };
    if (Object.keys(userCols).length) {
      checkOk(await sb.from('users').update(userCols).eq('id', userId));
    }

    const teacherCols = {
      ...(changes.cv !== undefined && { cv: changes.cv || null }),
      ...(changes.hourlyRate !== undefined && { hourly_rate: changes.hourlyRate ?? null }),
    };
    if (Object.keys(teacherCols).length) {
      checkOk(await sb.from('teacher_profiles').update(teacherCols).eq('user_id', userId));
    }

    if (changes.subjects !== undefined) {
      checkOk(await sb.rpc('set_my_subjects', { p_names: changes.subjects }));
    }
    return loadProfile();
  },

  async uploadAvatar(localUri) {
    const userId = await requireUserId();
    const ext = (localUri.split('?')[0].split('.').pop() ?? 'jpg').toLowerCase();
    const contentType = MIME_BY_EXT[ext] ?? 'image/jpeg';
    // En React Native se sube como ArrayBuffer (forma recomendada por Supabase).
    const body = await fetch(localUri).then((r) => r.arrayBuffer());
    const path = `${userId}/avatar-${Date.now()}.${contentType.split('/')[1]}`;

    const bucket = supabase().storage.from(AVATARS);
    checkOk(await bucket.upload(path, body, { contentType }));
    const publicUrl = bucket.getPublicUrl(path).data.publicUrl;
    checkOk(await supabase().from('users').update({ avatar_url: publicUrl }).eq('id', userId));
    await removeMyAvatars(userId, path).catch(() => {});
    return loadProfile();
  },

  async deleteAccount() {
    const userId = await requireUserId();
    await removeMyAvatars(userId).catch(() => {});
    checkOk(await supabase().rpc('delete_my_account'));
    cachedProfile = null;
    // La sesión ya no existe en el servidor: solo limpiar la local.
    await supabase().auth.signOut({ scope: 'local' });
  },
};
