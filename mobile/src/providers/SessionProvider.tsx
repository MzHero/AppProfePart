// Sesión del usuario. Si el estado global crece (ubicación, preferencias), migrar a Zustand.
import { useQueryClient } from '@tanstack/react-query';
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';

import { authService, type ProfileUpdate, type SignUpInput } from '@/services';
import type { User } from '@/types/models';

interface SessionContextValue {
  user: User | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (input: SignUpInput) => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (changes: ProfileUpdate) => Promise<void>;
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
      .finally(() => setIsLoading(false));
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    setUser(await authService.signIn(email, password));
  }, []);

  const signUp = useCallback(async (input: SignUpInput) => {
    setUser(await authService.signUp(input));
  }, []);

  const signOut = useCallback(async () => {
    await authService.signOut();
    queryClient.clear();
    setUser(null);
  }, [queryClient]);

  const updateProfile = useCallback(async (changes: ProfileUpdate) => {
    setUser(await authService.updateProfile(changes));
  }, []);

  const deleteAccount = useCallback(async () => {
    await authService.deleteAccount();
    queryClient.clear();
    setUser(null);
  }, [queryClient]);

  return (
    <SessionContext.Provider
      value={{ user, isLoading, signIn, signUp, signOut, updateProfile, deleteAccount }}>
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
