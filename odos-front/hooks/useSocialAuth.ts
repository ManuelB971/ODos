import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import * as AppleAuthentication from 'expo-apple-authentication';
import { Platform } from 'react-native';

WebBrowser.maybeCompleteAuthSession();

const googleWebClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
const googleIosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
const googleAndroidClientId = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID;

import { SOCIAL_AUTH_ENABLED } from '@/constants/featureFlags';

export function isGoogleAuthConfigured(): boolean {
  return Boolean(googleWebClientId);
}

export function isSocialAuthActive(): boolean {
  return SOCIAL_AUTH_ENABLED && isGoogleAuthConfigured();
}

export function isAppleAuthAvailable(): boolean {
  return Platform.OS === 'ios';
}

/**
 * Hook OAuth Google (expo-auth-session) + Apple (iOS natif).
 */
export function useSocialAuth() {
  const [request, , promptAsync] = Google.useAuthRequest({
    webClientId: googleWebClientId,
    iosClientId: googleIosClientId,
    androidClientId: googleAndroidClientId,
  });

  const signInWithGoogle = async (): Promise<string | null> => {
    if (!googleWebClientId) {
      throw new Error('Connexion Google non configurée (EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID).');
    }
    if (!request) {
      throw new Error('Google Sign-In en cours d’initialisation.');
    }
    const result = await promptAsync();
    if (result.type !== 'success') {
      return null;
    }
    const idToken =
      result.authentication?.idToken ??
      (typeof result.params?.id_token === 'string' ? result.params.id_token : null);
    return idToken;
  };

  const signInWithApple = async (): Promise<{
    identityToken: string;
    email?: string | null;
  } | null> => {
    if (Platform.OS !== 'ios') {
      throw new Error('Sign in with Apple est disponible sur iPhone et iPad.');
    }
    const available = await AppleAuthentication.isAvailableAsync();
    if (!available) {
      throw new Error('Sign in with Apple indisponible sur cet appareil.');
    }
    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    });
    if (!credential.identityToken) {
      return null;
    }
    return {
      identityToken: credential.identityToken,
      email: credential.email,
    };
  };

  return {
    signInWithGoogle,
    signInWithApple,
    googleReady: Boolean(request),
  };
}
