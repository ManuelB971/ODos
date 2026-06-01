import React, { useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';

import { SOCIAL_AUTH_ENABLED } from '@/constants/featureFlags';
import { SocialSignInButton } from '@/components/ui/SocialSignInButton';
import {
  isAppleAuthAvailable,
  useSocialAuth,
} from '@/hooks/useSocialAuth';
import {
  signInWithAppleIdentityToken,
  signInWithGoogleIdToken,
  signIn,
} from '@/services/AuthService';

type SocialAuthSectionProps = {
  loading: boolean;
  onSuccess: (user: NonNullable<Awaited<ReturnType<typeof signIn>>['user']>) => void;
  onError: (message: string | null) => void;
};

/**
 * Boutons Google / Apple — visibles même si OAuth désactivé (feature flag).
 * Le hook OAuth n'est monté que lorsque {@link SOCIAL_AUTH_ENABLED} est true.
 */
export function SocialAuthSection({ loading, onSuccess, onError }: SocialAuthSectionProps) {
  if (!SOCIAL_AUTH_ENABLED) {
    return (
      <View style={styles.stack}>
        <SocialSignInButton provider="google" onPress={() => {}} disabled />
        {Platform.OS === 'ios' ? (
          <SocialSignInButton provider="apple" onPress={() => {}} disabled />
        ) : null}
      </View>
    );
  }

  return (
    <SocialAuthSectionActive loading={loading} onSuccess={onSuccess} onError={onError} />
  );
}

function SocialAuthSectionActive({ loading, onSuccess, onError }: SocialAuthSectionProps) {
  const [socialLoading, setSocialLoading] = useState<'google' | 'apple' | null>(null);
  const { signInWithGoogle, signInWithApple, googleReady } = useSocialAuth();

  const handleGoogleAuth = async () => {
    setSocialLoading('google');
    onError(null);
    try {
      const idToken = await signInWithGoogle();
      if (!idToken) return;
      const { success: ok, errorMessage, user } = await signInWithGoogleIdToken(idToken);
      if (!ok || !user) {
        onError(errorMessage ?? 'Connexion Google impossible.');
        return;
      }
      onSuccess(user);
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Connexion Google impossible.');
    } finally {
      setSocialLoading(null);
    }
  };

  const handleAppleAuth = async () => {
    setSocialLoading('apple');
    onError(null);
    try {
      const credential = await signInWithApple();
      if (!credential) return;
      const { success: ok, errorMessage, user } = await signInWithAppleIdentityToken(
        credential.identityToken,
        credential.email,
      );
      if (!ok || !user) {
        onError(errorMessage ?? 'Connexion Apple impossible.');
        return;
      }
      onSuccess(user);
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Connexion Apple impossible.');
    } finally {
      setSocialLoading(null);
    }
  };

  return (
    <View style={styles.stack}>
      <SocialSignInButton
        provider="google"
        onPress={handleGoogleAuth}
        disabled={loading || !googleReady}
        loading={socialLoading === 'google'}
      />
      {isAppleAuthAvailable() ? (
        <SocialSignInButton
          provider="apple"
          onPress={handleAppleAuth}
          disabled={loading}
          loading={socialLoading === 'apple'}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: 12,
  },
});
