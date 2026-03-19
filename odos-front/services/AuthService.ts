import api, { safeStorage } from '@/scripts/api';

/**
 * Inscription d'un nouvel utilisateur
 */
export async function signUp(email: string, password: string) {
  try {
    const response = await api.post('/api/users', {
      email: email,
      plainPassword: password, // Utilisation du champ plainPassword pour le processor Symfony
    });

    return {
      success: true,
      errorMessage: null,
      user: response.data,
    };
  } catch (error: any) {
    console.error('Erreur SignUp:', error.message, error.response?.data || error.toJSON?.() || error);
    const isNetworkError = error?.message === 'Network Error';
    return {
      success: false,
      errorMessage:
        error.response?.data?.['hydra:description']
        || (isNetworkError ? `Impossible de joindre le serveur (${api.defaults.baseURL}) — vérifier l'URL/réseau` : "Erreur lors de l'inscription"),
      user: null,
    };
  }
}

/**
 * Connexion de l'utilisateur
 */
export async function signIn(email: string, password: string) {
  try {
    const response = await api.post('/api/login', {
      email,
      password,
    });

    const { token, refresh_token } = response.data;

    // Stockage sécurisé des tokens
    await safeStorage.setItem('user_token', token);
    if (refresh_token) {
      await safeStorage.setItem('refresh_token', refresh_token);
    }

    // Optionnel : Récupérer les infos de l'utilisateur (id, email) via /api/me
    const userResponse = await api.get('/api/me');

    return {
      success: true,
      errorMessage: null,
      user: {
        id: userResponse.data.id,
        email: userResponse.data.email,
        interests: userResponse.data.interests ?? [],
      },
    };
  } catch (error: any) {
    console.error('Erreur SignIn:', error.message, error.response?.data || error.toJSON?.() || error);
    const isNetworkError = error?.message === 'Network Error';
    return {
      success: false,
      errorMessage: isNetworkError ? `Impossible de joindre le serveur (${api.defaults.baseURL}) — vérifier l'URL/réseau` : "Email ou mot de passe incorrect",
      user: null,
    };
  }
}

/**
 * Déconnexion de l'utilisateur
 */
export async function signOut() {
  try {
    // Suppression des tokens
    await safeStorage.deleteItem('user_token');
    await safeStorage.deleteItem('refresh_token');
    return { success: true, errorMessage: null };
  } catch (error: any) {
    return { success: false, errorMessage: "Erreur lors de la déconnexion" };
  }
}

export default api;
