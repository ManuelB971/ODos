import api, { safeStorage } from '@/scripts/api';
import { toAppError, logError } from '@/utils/errorHandling';

type AuthUser = {
  id: number;
  email: string;
  alias: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  bio: string | null;
  interests: unknown[];
};

async function persistTokensAndFetchUser(data: {
  token: string;
  refresh_token?: string;
}): Promise<AuthUser> {
  await safeStorage.setItem('user_token', data.token);
  if (data.refresh_token) {
    await safeStorage.setItem('refresh_token', data.refresh_token);
  }
  const userResponse = await api.get('/api/me');
  return {
    id: userResponse.data.id,
    email: userResponse.data.email,
    alias: userResponse.data.alias ?? null,
    displayName: userResponse.data.displayName ?? null,
    avatarUrl: userResponse.data.avatarUrl ?? null,
    bio: userResponse.data.bio ?? null,
    interests: userResponse.data.interests ?? [],
  };
}

/**
 * Inscription d'un nouvel utilisateur
 */
export async function signUp(email: string, password: string, acceptTerms: boolean) {
  try {
    const response = await api.post('/api/users', {
      email: email,
      plainPassword: password,
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
    const response = await api.post('/api/login', { email, password });
    const user = await persistTokensAndFetchUser(response.data);

    return {
      success: true,
      errorMessage: null,
      user,
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
 * Connexion via id_token Google (POST /api/auth/google).
 */
export async function signInWithGoogleIdToken(idToken: string) {
  try {
    const response = await api.post('/api/auth/google', { idToken });
    const user = await persistTokensAndFetchUser(response.data);

    return { success: true, errorMessage: null, user };
  } catch (error: unknown) {
    const appError = toAppError(error, 'Connexion Google impossible.');
    logError('AuthService.signInWithGoogleIdToken', error);
    return { success: false, errorMessage: appError.userMessage, user: null };
  }
}

/**
 * Connexion via identityToken Apple (POST /api/auth/apple).
 */
export async function signInWithAppleIdentityToken(
  identityToken: string,
  email?: string | null,
) {
  try {
    const response = await api.post('/api/auth/apple', { identityToken, email });
    const user = await persistTokensAndFetchUser(response.data);

    return { success: true, errorMessage: null, user };
  } catch (error: unknown) {
    const appError = toAppError(error, 'Connexion Apple impossible.');
    logError('AuthService.signInWithAppleIdentityToken', error);
    return { success: false, errorMessage: appError.userMessage, user: null };
  }
}

/**
 * Déconnexion de l'utilisateur
 */
export async function signOut() {
  try {
    try {
      await api.post('/api/logout');
    } catch {
      // purge locale même hors-ligne
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
