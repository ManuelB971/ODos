import { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import api, { ensureSessionReady, onAuthError, safeStorage } from '@/scripts/api';
import { mapMeResponseToUser } from '@/services/authSession';

import { User, AuthContextType } from '@/types';
import { logError } from '@/utils/errorHandling';

export const AuthContext = createContext<AuthContextType>({
  user: null,
  setUser: () => { },
  isAuthenticated: false,
  isLoading: true,
  checkAuth: async () => { },
  logout: async () => { },
});

import { AuthProviderProps } from '@/types';

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const queryClient = useQueryClient();

  const logout = async () => {
    await safeStorage.deleteItem('user_token');
    await safeStorage.deleteItem('refresh_token');
    delete api.defaults.headers.common.Authorization;
    setUser(null);
    queryClient.cancelQueries();
    queryClient.clear();
    router.replace('/login');
  };

  const checkAuth = async () => {
    try {
      const sessionReady = await ensureSessionReady();
      if (!sessionReady) {
        setUser(null);
        return;
      }

      const response = await api.get('/api/me');
      setUser(mapMeResponseToUser(response.data as Record<string, unknown>));
    } catch (error: unknown) {
      logError('AuthContext.checkAuth', error);
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        await safeStorage.deleteItem('user_token');
        await safeStorage.deleteItem('refresh_token');
        delete api.defaults.headers.common.Authorization;
        setUser(null);
      } else if (axios.isAxiosError(error) && !error.response) {
        // Réseau indisponible : on garde les jetons pour un prochain essai.
        setUser(null);
      } else {
        setUser(null);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthError(() => {
      logout().catch(() => { });
    });
    return () => {
      unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        setUser,
        isAuthenticated: !!user,
        isLoading,
        checkAuth,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
