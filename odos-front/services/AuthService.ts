import api, { safeStorage } from '@/scripts/api';
import { persistTokensAndFetchUser } from '@/services/authSession';
import { toAppError, logError } from '@/utils/errorHandling';
import type { User } from '@/types';

type AuthResult = {
  success: boolean;
  errorMessage: string | null;
  user: NonNullable<User> | null;
};

/**
 * Inscription puis connexion automatique (même flux que signIn : tokens + /api/me).
 */
export async function signUp(
  email: string,
  password: string,
  acceptTerms: boolean,
): Promise<AuthResult> {
  try {
    await api.post('/api/users', {
      email,
      plainPassword: password,
      acceptTerms,
    });
    return signIn(email, password);
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
export async function signIn(email: string, password: string): Promise<AuthResult> {
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
export async function signInWithGoogleIdToken(idToken: string): Promise<AuthResult> {
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
): Promise<AuthResult> {
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
 * Demande de réinitialisation du mot de passe (POST /api/auth/password-reset/request).
 */
export async function requestPasswordReset(email: string) {
  try {
    const response = await api.post('/api/auth/password-reset/request', { email: email.trim() });
    return {
      success: true,
      errorMessage: null,
      message: (response.data?.message as string) ?? null,
    };
  } catch (error: unknown) {
    const appError = toAppError(error, 'Impossible d’envoyer l’email de réinitialisation.');
    logError('AuthService.requestPasswordReset', error, { email });
    return {
      success: false,
      errorMessage: appError.userMessage,
      message: null,
    };
  }
}

/**
 * Confirme un nouveau mot de passe avec le code reçu par email.
 */
export async function confirmPasswordReset(token: string, password: string) {
  try {
    const response = await api.post('/api/auth/password-reset/confirm', {
      token: token.trim(),
      password,
    });
    return {
      success: true,
      errorMessage: null,
      message: (response.data?.message as string) ?? null,
    };
  } catch (error: unknown) {
    const appError = toAppError(error, 'Réinitialisation impossible.');
    logError('AuthService.confirmPasswordReset', error);
    return {
      success: false,
      errorMessage: appError.userMessage,
      message: null,
    };
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
    delete api.defaults.headers.common.Authorization;
    return { success: true, errorMessage: null };
  } catch (error: unknown) {
    logError('AuthService.signOut', error);
    return { success: false, errorMessage: "Erreur lors de la déconnexion" };
  }
}

export default api;
