import { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import api, { onAuthError, safeStorage } from '@/scripts/api';

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
    setUser(null);
    // Purge TOTALE du cache React Query pour éviter toute fuite de données
    // inter-comptes (favoris, recommandations, profil, commentaires…).
    // Les requêtes en cours sont aussi annulées.
    queryClient.cancelQueries();
    queryClient.clear();
    router.replace('/login');
  };

  const checkAuth = async () => {
    try {
      const token = await safeStorage.getItem('user_token');

      // Pas de session stockée → rien à restaurer.
      // NB : si le JWT d’accès est expiré mais qu’un refresh_token existe,
      // on laisse passer : l’intercepteur axios (401) renouvelle la paire
      // avant de rejouer /api/me. L’ancien comportement purgeait aussi le
      // refresh_token au cold start → re-login obligatoire à chaque retour app.
      if (!token) {
        setUser(null);
        setIsLoading(false);
        return;
      }

      // Appel à l'endpoint /api/me pour récupérer l'utilisateur réel
      const response = await api.get('/api/me');

      setUser({
        id: response.data.id,
        email: response.data.email,
        alias: response.data.alias ?? null,
        displayName: response.data.displayName ?? null,
        avatarUrl: response.data.avatarUrl ?? null,
        bio: response.data.bio ?? null,
        interests: response.data.interests ?? [],
        hideBadgesOnProfile: response.data.hideBadgesOnProfile ?? false,
        mapExplorationEnabled: response.data.mapExplorationEnabled ?? false,
      });
    } catch (error: unknown) {
      logError('AuthContext.checkAuth', error);
      // Déjà nettoyé par l’intercepteur si refresh impossible ; on ne vide pas
      // la session sur erreur réseau (sinon utilisateur hors-ligne perd la session).
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        await safeStorage.deleteItem('user_token');
        await safeStorage.deleteItem('refresh_token');
      }
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
