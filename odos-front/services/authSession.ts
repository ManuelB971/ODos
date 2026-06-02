import api, { safeStorage } from '@/scripts/api';
import type { User } from '@/types';

export type AuthTokensPayload = {
  token: string;
  refresh_token?: string;
};

function assertAccessToken(token: unknown): asserts token is string {
  if (typeof token !== 'string' || token.length < 10) {
    throw new Error('Réponse auth invalide : access token manquant.');
  }
}

/** Normalise la réponse GET /api/me vers le modèle User de l’app. */
export function mapMeResponseToUser(data: Record<string, unknown>): NonNullable<User> {
  return {
    id: data.id as number,
    email: data.email as string,
    alias: (data.alias as string | null | undefined) ?? null,
    displayName: (data.displayName as string | null | undefined) ?? null,
    avatarUrl: (data.avatarUrl as string | null | undefined) ?? null,
    bio: (data.bio as string | null | undefined) ?? null,
    interests: (data.interests as User['interests']) ?? [],
    hideBadgesOnProfile: (data.hideBadgesOnProfile as boolean | undefined) ?? false,
    mapExplorationEnabled: (data.mapExplorationEnabled as boolean | undefined) ?? false,
  };
}

/**
 * Enregistre access + refresh et aligne le client HTTP (header Bearer par défaut).
 */
export async function persistAuthTokens(payload: AuthTokensPayload): Promise<void> {
  assertAccessToken(payload.token);

  await safeStorage.setItem('user_token', payload.token);

  if (payload.refresh_token) {
    await safeStorage.setItem('refresh_token', payload.refresh_token);
  } else if (__DEV__) {
    console.warn(
      '[auth] refresh_token absent — la session ne survivra pas au-delà du TTL access (~15 min).',
    );
  }

  api.defaults.headers.common.Authorization = `Bearer ${payload.token}`;
}

/** Stocke les jetons puis charge le profil courant. */
export async function persistTokensAndFetchUser(
  payload: AuthTokensPayload,
): Promise<NonNullable<User>> {
  await persistAuthTokens(payload);
  const userResponse = await api.get('/api/me');
  return mapMeResponseToUser(userResponse.data as Record<string, unknown>);
}
