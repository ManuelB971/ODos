import api, { safeStorage } from '@/scripts/api';
import { toAppError, logError } from '@/utils/errorHandling';

/**
 * Inscription d'un nouvel utilisateur
 */
export async function signUp(email: string, password: string, acceptTerms: boolean) {
  try {
    const response = await api.post('/api/users', {
      email: email,
      plainPassword: password, // Utilisation du champ plainPassword pour le processor Symfony
      acceptTerms,
    });

    return {
      success: true,
      errorMessage: null,
      user: response.data,
    };
  } catch (error: unknown) {
    const appError = toAppError(error, "Erreur lors de l'inscription");
    logError('AuthService.signUp', error, { email });
    const base = String(api.defaults.baseURL ?? '');
    const errorMessage =
      appError.code === 'NETWORK_ERROR'
        ? `Impossible de joindre le serveur (${base}). Vérifiez l’URL, le Wi‑Fi ou la 4G (certains opérateurs bloquent des ports comme :8000), et le pare-feu du serveur.`
        : appError.userMessage;
    return {
      success: false,
      errorMessage,
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
        alias: userResponse.data.alias ?? null,
        displayName: userResponse.data.displayName ?? null,
        avatarUrl: userResponse.data.avatarUrl ?? null,
        bio: userResponse.data.bio ?? null,
        interests: userResponse.data.interests ?? [],
      },
    };
  } catch (error: unknown) {
    const appError = toAppError(error, 'Email ou mot de passe incorrect');
    logError('AuthService.signIn', error, { email });
    return {
      success: false,
      errorMessage: appError.userMessage,
      user: null,
    };
  }
}

/**
 * Connexion avec Google (placeholder).
 *
 * Pour que cela marche réellement, il faut ajouter :
 * - un endpoint backend du type `POST /api/login/google` qui valide l'id_token Google
 * - la configuration des client IDs Google (iOS/Android/Web) sur le front
 */
export async function signInWithGoogle() {
  return {
    success: false,
    errorMessage: 'Connexion Google non disponible pour le moment.',
    user: null,
  };
}

/**
 * Déconnexion de l'utilisateur
 */
export async function signOut() {
  try {
    // Invalide les refresh tokens côté serveur (best-effort si hors-ligne).
    try {
      await api.post('/api/logout');
    } catch {
      // On purge quand même le stockage local.
    }
    await safeStorage.deleteItem('user_token');
    await safeStorage.deleteItem('refresh_token');
    return { success: true, errorMessage: null };
  } catch (error: unknown) {
    logError('AuthService.signOut', error);
    return { success: false, errorMessage: "Erreur lors de la déconnexion" };
  }
}

export default api;
