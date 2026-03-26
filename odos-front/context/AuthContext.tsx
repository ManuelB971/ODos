import { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import api, { onAuthError, safeStorage } from '@/scripts/api';

import { User, AuthContextType } from '@/types';
import { isJwtExpired } from '@/utils/jwt';
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

  const logout = async () => {
    await safeStorage.deleteItem('user_token');
    await safeStorage.deleteItem('refresh_token');
    setUser(null);
    router.replace('/login');
  };

  const checkAuth = async () => {
    try {
      const token = await safeStorage.getItem('user_token');

      if (!token || isJwtExpired(token)) {
        await safeStorage.deleteItem('user_token');
        await safeStorage.deleteItem('refresh_token');
        setUser(null);
        setIsLoading(false);
        return;
      }

      // Appel à l'endpoint /api/me pour récupérer l'utilisateur réel
      const response = await api.get('/api/me');

      setUser({
        id: response.data.id,
        email: response.data.email,
        interests: response.data.interests ?? [],
      });
    } catch (error: unknown) {
      logError('AuthContext.checkAuth', error);
      // Si le token est invalide ou expiré, on nettoie
      await safeStorage.deleteItem('user_token');
      await safeStorage.deleteItem('refresh_token');
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthError(() => {
      // 401 global: on purge la session et on force le retour login
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
