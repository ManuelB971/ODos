import { createContext, useContext, useState, ReactNode, Dispatch, SetStateAction, useEffect } from 'react';
import { useRouter } from 'expo-router';
import api, { safeStorage } from '@/scripts/api';

type User = {
  id: number; // Changé de string à number pour correspondre à Symfony
  email: string;
} | null;

type AuthContextType = {
  user: User;
  setUser: Dispatch<SetStateAction<User>>;
  isAuthenticated: boolean;
  isLoading: boolean;
  checkAuth: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextType>({
  user: null,
  setUser: () => { },
  isAuthenticated: false,
  isLoading: true,
  checkAuth: async () => { },
});

type AuthProviderProps = {
  children: ReactNode;
};

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  const checkAuth = async () => {
    try {
      const token = await safeStorage.getItem('user_token');

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
      });
    } catch (error) {
      console.error('Erreur de vérification Auth:', error);
      // Si le token est invalide ou expiré, on nettoie
      await safeStorage.deleteItem('user_token');
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        setUser,
        isAuthenticated: !!user,
        isLoading,
        checkAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
