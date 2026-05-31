import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AlertCircle, Check, CheckCircle2, Mail, Square } from 'lucide-react-native';

import { signUp, signIn, signInWithGoogleIdToken, signInWithAppleIdentityToken } from '@/services/AuthService';
import { useAuth } from '@/context/AuthContext';
import { Colors, FontFamily, Radius, Spacing } from '@/constants/theme';
import { BRAND_TAGLINE } from '@/constants/brand';
import { AppLogo } from '@/components/AppLogo';
import { BrandBaseline } from '@/components/BrandBaseline';
import { CTAButton } from '@/components/ui/CTAButton';
import { InputField } from '@/components/ui/InputField';
import { SocialSignInButton } from '@/components/ui/SocialSignInButton';
import { SprayBackground } from '@/components/ui/SprayBackground';
import {
  isAppleAuthAvailable,
  isGoogleAuthConfigured,
  useSocialAuth,
} from '@/hooks/useSocialAuth';

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export default function LoginScreen() {
  const router = useRouter();
  const { setUser } = useAuth();
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);

  const [isLogin, setIsLogin] = useState(true);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [socialLoading, setSocialLoading] = useState<'google' | 'apple' | null>(null);
  const { signInWithGoogle, signInWithApple, googleReady } = useSocialAuth();

  const trimmedEmail = email.trim();
  const emailValid = isValidEmail(trimmedEmail);
  const passwordValid = password.length >= 6;
  const termsOk = isLogin || acceptTerms;
  const canSubmit = emailValid && passwordValid && termsOk && !loading;

  const handleAuth = async () => {
    if (!canSubmit) {
      if (!emailValid) setError('Email invalide.');
      else if (!passwordValid) setError('Le mot de passe doit contenir au moins 6 caractères.');
      else if (!isLogin && !acceptTerms) {
        setError('Veuillez accepter les CGU et la politique de confidentialité.');
      }
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (isLogin) {
        const { success: ok, errorMessage, user } = await signIn(trimmedEmail, password);
        if (!ok) {
          setError(errorMessage ?? 'Erreur de connexion.');
          return;
        }
        if (user) {
          setUser(user);
          const hasInterests = Array.isArray(user.interests) && user.interests.length > 0;
          router.replace(hasInterests ? '/' : '/interests');
        }
      } else {
        const { success: ok, errorMessage } = await signUp(trimmedEmail, password, acceptTerms);
        if (!ok) {
          setError(errorMessage ?? 'Une erreur est survenue.');
          return;
        }
        setSuccess(true);
        setTimeout(() => {
          setSuccess(false);
          setIsLogin(true);
        }, 1800);
      }
    } catch {
      setError(isLogin ? 'Erreur de connexion.' : 'Une erreur est survenue lors de l’inscription.');
    } finally {
      setLoading(false);
    }
  };

  const completeSocialLogin = (user: NonNullable<Awaited<ReturnType<typeof signIn>>['user']>) => {
    setUser(user);
    const hasInterests = Array.isArray(user.interests) && user.interests.length > 0;
    router.replace(hasInterests ? '/' : '/interests');
  };

  const handleGoogleAuth = async () => {
    if (!isGoogleAuthConfigured()) {
      setError('Connexion Google non configurée sur cette build.');
      return;
    }
    setSocialLoading('google');
    setError(null);
    try {
      const idToken = await signInWithGoogle();
      if (!idToken) return;
      const { success: ok, errorMessage, user } = await signInWithGoogleIdToken(idToken);
      if (!ok || !user) {
        setError(errorMessage ?? 'Connexion Google impossible.');
        return;
      }
      completeSocialLogin(user);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Connexion Google impossible.');
    } finally {
      setSocialLoading(null);
    }
  };

  const handleAppleAuth = async () => {
    if (!isAppleAuthAvailable()) {
      setError('Sign in with Apple est disponible sur iOS.');
      return;
    }
    setSocialLoading('apple');
    setError(null);
    try {
      const credential = await signInWithApple();
      if (!credential) return;
      const { success: ok, errorMessage, user } = await signInWithAppleIdentityToken(
        credential.identityToken,
        credential.email,
      );
      if (!ok || !user) {
        setError(errorMessage ?? 'Connexion Apple impossible.');
        return;
      }
      completeSocialLogin(user);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Connexion Apple impossible.');
    } finally {
      setSocialLoading(null);
    }
  };

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSub = Keyboard.addListener(showEvent, () => setKeyboardVisible(true));
    const hideSub = Keyboard.addListener(hideEvent, () => setKeyboardVisible(false));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const scrollToPasswordField = useCallback(() => {
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ y: 120, animated: true });
    });
  }, []);

  return (
    <SprayBackground>
      <KeyboardAvoidingView
        style={styles.screen}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={insets.top}
      >
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={[
            styles.scroll,
            {
              paddingTop: keyboardVisible ? insets.top + 8 : 56,
              paddingBottom: Math.max(insets.bottom, 16) + (keyboardVisible ? 24 : 48),
            },
          ]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          automaticallyAdjustKeyboardInsets
          showsVerticalScrollIndicator={false}
        >
          {!keyboardVisible ? (
            <View style={styles.brandHeader}>
              <View style={styles.logoCircle}>
                <AppLogo width={44} height={44} />
              </View>
            <Text style={styles.wordmark}>ODOS</Text>
            <BrandBaseline variant="short" style={styles.heroBaseline} />
            <Text style={styles.tagline}>{BRAND_TAGLINE}</Text>
            </View>
          ) : null}

          <View style={styles.card}>
            <Text style={styles.eyebrow}>{isLogin ? 'Connexion' : 'Inscription'}</Text>
            <Text style={styles.title}>
              {isLogin ? 'Heureux de vous revoir' : 'Bienvenue sur la voie'}
            </Text>
            <Text style={styles.subtitle}>
              {isLogin
                ? 'Connectez-vous pour continuer votre exploration.'
                : 'Créez un compte pour commencer votre voyage.'}
            </Text>

            {error ? (
              <View style={styles.banner}>
                <AlertCircle size={16} color={Colors.light.danger} />
                <Text style={styles.bannerError}>{error}</Text>
              </View>
            ) : null}

            {success ? (
              <View style={[styles.banner, styles.bannerSuccess]}>
                <CheckCircle2 size={16} color="#16a34a" />
                <Text style={styles.bannerSuccessText}>
                  Inscription réussie — vous pouvez vous connecter.
                </Text>
              </View>
            ) : null}

            <View style={styles.fields}>
              <InputField
                label="Adresse email"
                placeholder="exemple@email.com"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
                textContentType="emailAddress"
                leftIcon={<Mail size={18} color={Colors.light.muted} />}
                error={error && !emailValid ? 'Vérifiez votre email.' : null}
              />

              <InputField
                label="Mot de passe"
                placeholder="Au moins 6 caractères"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoComplete={isLogin ? 'password' : 'password-new'}
                textContentType={isLogin ? 'password' : 'newPassword'}
                hint={!isLogin ? '6 caractères minimum.' : undefined}
                onFocus={scrollToPasswordField}
                returnKeyType="done"
                onSubmitEditing={handleAuth}
              />

              {isLogin ? (
                <Pressable
                  onPress={() => setError('Fonction « mot de passe oublié » à venir.')}
                  style={styles.forgotBtn}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel="Mot de passe oublié"
                >
                  <Text style={styles.forgotText}>Mot de passe oublié ?</Text>
                </Pressable>
              ) : null}
            </View>

            {!isLogin ? (
              <Pressable
                onPress={() => setAcceptTerms((v) => !v)}
                style={styles.consentRow}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: acceptTerms }}
                accessibilityLabel="Accepter les conditions générales et la politique de confidentialité"
              >
                {acceptTerms ? (
                  <View style={[styles.consentBox, styles.consentBoxChecked]}>
                    <Check size={14} color="#fff" strokeWidth={3} />
                  </View>
                ) : (
                  <Square size={22} color={Colors.light.muted} />
                )}
                <Text style={styles.consentText}>
                  J&apos;accepte les{' '}
                  <Text
                    style={styles.consentLink}
                    onPress={(e) => {
                      e.stopPropagation?.();
                      router.push({ pathname: '/legal', params: { section: 'cgu' } });
                    }}
                  >
                    CGU
                  </Text>
                  {' '}et la{' '}
                  <Text
                    style={styles.consentLink}
                    onPress={(e) => {
                      e.stopPropagation?.();
                      router.push({ pathname: '/legal', params: { section: 'privacy' } });
                    }}
                  >
                    politique de confidentialité
                  </Text>
                  .
                </Text>
              </Pressable>
            ) : null}

            <CTAButton
              label={isLogin ? 'Continuer' : 'Créer mon compte'}
              onPress={handleAuth}
              loading={loading}
              disabled={!canSubmit}
              fullWidth
              size="lg"
            />

            {isLogin ? (
              <>
                <View style={styles.separatorRow}>
                  <View style={styles.separatorLine} />
                  <Text style={styles.separatorText}>ou</Text>
                  <View style={styles.separatorLine} />
                </View>

                <View style={styles.socialStack}>
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
              </>
            ) : null}
          </View>

          <Pressable
            onPress={() => {
              setError(null);
              setAcceptTerms(false);
              setIsLogin((v) => !v);
            }}
            style={styles.switchBtn}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={
              isLogin ? 'Créer un compte, passer en mode inscription' : 'Se connecter, passer en mode connexion'
            }
          >
            <Text style={styles.switchText}>
              {isLogin ? 'Pas encore de compte ? ' : 'Déjà un compte ? '}
              <Text style={styles.switchAction}>
                {isLogin ? 'Créer un compte' : 'Se connecter'}
              </Text>
            </Text>
          </Pressable>

          <Text style={styles.legal}>
            En continuant, vous acceptez nos{' '}
            <Text style={styles.legalLink} onPress={() => router.push('/legal')}>
              conditions d&apos;utilisation
            </Text>
            .
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SprayBackground>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: Spacing.lg,
    paddingTop: 56,
    paddingBottom: 48,
    alignItems: 'center',
  },
  brandHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logoCircle: {
    width: 72,
    height: 72,
    borderRadius: Radius.modal,
    backgroundColor: Colors.light.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    shadowColor: Colors.light.accent,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 18,
    elevation: 6,
  },
  wordmark: {
    fontSize: 28,
    fontFamily: FontFamily.display,
    color: Colors.light.text,
    letterSpacing: 8,
    marginBottom: 6,
  },
  heroBaseline: {
    fontSize: 18,
    fontFamily: FontFamily.displayItalic,
    fontStyle: 'italic',
    color: Colors.light.accent,
    marginBottom: 4,
  },
  tagline: {
    fontSize: 12,
    fontFamily: FontFamily.uiMedium,
    letterSpacing: 1.4,
    color: Colors.light.muted,
    textTransform: 'uppercase',
  },
  card: {
    width: '100%',
    maxWidth: 480,
    backgroundColor: Colors.light.elevated,
    borderRadius: Radius.modal,
    padding: 24,
    gap: 18,
    borderWidth: 1,
    borderColor: Colors.light.border,
    shadowColor: '#11181C',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.06,
    shadowRadius: 28,
    elevation: 4,
  },
  eyebrow: {
    fontSize: 11,
    fontFamily: FontFamily.uiMedium,
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: Colors.light.accent,
    marginBottom: -10,
  },
  title: {
    fontSize: 26,
    fontFamily: FontFamily.display,
    color: Colors.light.text,
  },
  subtitle: {
    fontSize: 15,
    fontFamily: FontFamily.ui,
    lineHeight: 22,
    color: Colors.light.muted,
    marginTop: -12,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  bannerError: {
    flex: 1,
    fontFamily: FontFamily.uiMedium,
    color: Colors.light.danger,
    fontSize: 13,
  },
  bannerSuccess: {
    backgroundColor: '#ecfdf5',
    borderColor: '#86efac',
  },
  bannerSuccessText: {
    flex: 1,
    fontFamily: FontFamily.uiMedium,
    color: '#047857',
    fontSize: 13,
  },
  fields: {
    gap: 14,
  },
  consentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  consentBox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  consentBoxChecked: {
    backgroundColor: Colors.light.accent,
  },
  consentText: {
    flex: 1,
    fontSize: 13,
    fontFamily: FontFamily.ui,
    lineHeight: 20,
    color: Colors.light.text,
  },
  consentLink: {
    color: Colors.light.primary,
    fontFamily: FontFamily.uiMedium,
  },
  forgotBtn: {
    alignSelf: 'flex-end',
    marginTop: -4,
  },
  forgotText: {
    fontSize: 13,
    fontFamily: FontFamily.uiMedium,
    color: Colors.light.primary,
  },
  separatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 6,
  },
  separatorLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.light.border,
  },
  separatorText: {
    fontSize: 12,
    fontFamily: FontFamily.uiMedium,
    color: Colors.light.muted,
    textTransform: 'lowercase',
  },
  socialStack: {
    gap: 12,
  },
  switchBtn: {
    marginTop: 20,
  },
  switchText: {
    fontSize: 14,
    fontFamily: FontFamily.ui,
    color: Colors.light.muted,
  },
  switchAction: {
    color: Colors.light.primary,
    fontFamily: FontFamily.uiBold,
  },
  legal: {
    marginTop: 14,
    fontSize: 12,
    fontFamily: FontFamily.ui,
    color: Colors.light.muted,
    textAlign: 'center',
    maxWidth: 320,
  },
  legalLink: {
    color: Colors.light.primary,
    fontFamily: FontFamily.uiMedium,
  },
});
