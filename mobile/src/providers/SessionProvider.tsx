// Sesión del usuario. Si el estado global crece (ubicación, preferencias), migrar a Zustand.
import { useQueryClient } from '@tanstack/react-query';
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';

import { authService, type ProfileUpdate, type SignUpInput } from '@/services';
import type { User } from '@/types/models';

interface SessionContextValue {
  user: User | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  /** Devuelve true si hay que confirmar el email antes de poder entrar. */
  signUp: (input: SignUpInput) => Promise<{ needsEmailConfirmation: boolean }>;
  signOut: () => Promise<void>;
  updateProfile: (changes: ProfileUpdate) => Promise<void>;
  uploadAvatar: (localUri: string) => Promise<void>;
  deleteAccount: () => Promise<void>;
}

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    authService
      .getSession()
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setIsLoading(false));

    // Cambios de sesión que no inicia la UI: token vencido, sesión cerrada en otro lado, etc.
    return authService.onAuthChange((next) => {
      if (!next) queryClient.clear();
      setUser(next);
    });
  }, [queryClient]);

  const signIn = useCallback(async (email: string, password: string) => {
    setUser(await authService.signIn(email, password));
  }, []);

  const signUp = useCallback(async (input: SignUpInput) => {
    const { user: created, needsEmailConfirmation } = await authService.signUp(input);
    if (created) setUser(created);
    return { needsEmailConfirmation };
  }, []);

  const signOut = useCallback(async () => {
    await authService.signOut();
    queryClient.clear();
    setUser(null);
  }, [queryClient]);

  const updateProfile = useCallback(async (changes: ProfileUpdate) => {
    setUser(await authService.updateProfile(changes));
  }, []);

  const uploadAvatar = useCallback(async (localUri: string) => {
    setUser(await authService.uploadAvatar(localUri));
  }, []);

  const deleteAccount = useCallback(async () => {
    await authService.deleteAccount();
    queryClient.clear();
    setUser(null);
  }, [queryClient]);

  return (
    <SessionContext.Provider
      value={{
        user,
        isLoading,
        signIn,
        signUp,
        signOut,
        updateProfile,
        uploadAvatar,
        deleteAccount,
      }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession debe usarse dentro de <SessionProvider>');
  return ctx;
}

/** Para pantallas que solo existen con sesión iniciada. */
export function useCurrentUser(): User {
  const { user } = useSession();
  if (!user) throw new Error('Pantalla protegida renderizada sin sesión');
  return user;
}
