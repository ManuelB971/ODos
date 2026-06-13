import React, { useCallback, useEffect, useRef, useState, useMemo } from 'react';
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
import { LinearGradient } from 'expo-linear-gradient';
import { AlertCircle, Mail, Square } from 'lucide-react-native';
import { DaIcon } from '@/components/ui/DaIcon';

import { signUp, signIn } from '@/services/AuthService';
import { useAuth } from '@/context/AuthContext';
import { FontFamily, Radius, Spacing } from '@/constants/theme';
import { useOdosColors, type OdosColorPalette } from '@/context/ThemeContext';
import { BRAND_TAGLINE } from '@/constants/brand';
import { AppLogo } from '@/components/AppLogo';
import { BrandBaseline } from '@/components/BrandBaseline';
import { CTAButton } from '@/components/ui/CTAButton';
import { InputField } from '@/components/ui/InputField';
import { SocialAuthSection } from '@/components/login/SocialAuthSection';
import { SprayBackground } from '@/components/ui/SprayBackground';

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export default function LoginScreen() {
  const colors = useOdosColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
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
  const [acceptTerms, setAcceptTerms] = useState(false);

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
      const { success: ok, errorMessage, user } = isLogin
        ? await signIn(trimmedEmail, password)
        : await signUp(trimmedEmail, password, acceptTerms);

      if (!ok) {
        setError(
          errorMessage ??
            (isLogin ? 'Erreur de connexion.' : 'Une erreur est survenue.'),
        );
        return;
      }

      if (user) {
        setUser(user);
        const hasInterests = Array.isArray(user.interests) && user.interests.length > 0;
        router.replace(hasInterests ? '/' : '/interests');
      }
    } catch {
      setError(isLogin ? 'Erreur de connexion.' : 'Une erreur est survenue lors de l’inscription.');
    } finally {
      setLoading(false);
    }
  };

  const switchMode = useCallback((login: boolean) => {
    setError(null);
    setAcceptTerms(false);
    setIsLogin(login);
  }, []);

  const completeSocialLogin = (user: NonNullable<Awaited<ReturnType<typeof signIn>>['user']>) => {
    setUser(user);
    const hasInterests = Array.isArray(user.interests) && user.interests.length > 0;
    router.replace(hasInterests ? '/' : '/interests');
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
              <View style={styles.logoHalo}>
                <LinearGradient
                  colors={[colors.accentSoft, colors.accent, colors.accentHover]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.logoHaloGradient}
                >
                  <View style={styles.logoInner}>
                    <AppLogo width={48} height={48} />
                  </View>
                </LinearGradient>
              </View>
              <Text style={styles.wordmark}>ODOS</Text>
              <BrandBaseline variant="short" style={styles.heroBaseline} />
              <Text style={styles.tagline}>{BRAND_TAGLINE}</Text>
            </View>
          ) : null}

          <View style={styles.card}>
            <View
              style={styles.segment}
              accessibilityRole="tablist"
            >
              <Pressable
                onPress={() => switchMode(true)}
                style={[styles.segmentItem, isLogin && styles.segmentItemActive]}
                accessibilityRole="tab"
                accessibilityState={{ selected: isLogin }}
                accessibilityLabel="Connexion"
              >
                <Text style={[styles.segmentText, isLogin && styles.segmentTextActive]}>
                  Connexion
                </Text>
              </Pressable>
              <Pressable
                onPress={() => switchMode(false)}
                style={[styles.segmentItem, !isLogin && styles.segmentItemActive]}
                accessibilityRole="tab"
                accessibilityState={{ selected: !isLogin }}
                accessibilityLabel="Inscription"
              >
                <Text style={[styles.segmentText, !isLogin && styles.segmentTextActive]}>
                  Inscription
                </Text>
              </Pressable>
            </View>

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
                <AlertCircle size={16} color={colors.danger} />
                <Text style={styles.bannerError}>{error}</Text>
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
                leftIcon={<Mail size={18} color={colors.muted} />}
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
                  onPress={() => router.push('/forgot-password')}
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
                    <DaIcon name="check-mark" variant="chip" accessibilityLabel="Accepté" />
                  </View>
                ) : (
                  <Square size={22} color={colors.muted} />
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

                <SocialAuthSection
                  loading={loading}
                  onSuccess={completeSocialLogin}
                  onError={setError}
                />
              </>
            ) : null}
          </View>

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

function createStyles(colors: OdosColorPalette) {
  return StyleSheet.create({
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
  logoHalo: {
    marginBottom: 16,
    borderRadius: Radius.modal + 4,
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 22,
    elevation: 10,
  },
  logoHaloGradient: {
    padding: 3,
    borderRadius: Radius.modal + 4,
  },
  logoInner: {
    width: 76,
    height: 76,
    borderRadius: Radius.modal,
    backgroundColor: colors.elevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wordmark: {
    fontSize: 28,
    fontFamily: FontFamily.display,
    color: colors.text,
    letterSpacing: 8,
    marginBottom: 6,
  },
  heroBaseline: {
    fontSize: 18,
    fontFamily: FontFamily.displayItalic,
    fontStyle: 'italic',
    color: colors.accent,
    marginBottom: 4,
  },
  tagline: {
    fontSize: 12,
    fontFamily: FontFamily.uiMedium,
    letterSpacing: 1.4,
    color: colors.muted,
    textTransform: 'uppercase',
  },
  card: {
    width: '100%',
    maxWidth: 480,
    backgroundColor: colors.elevated,
    borderRadius: Radius.modal,
    padding: 24,
    gap: 18,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#11181C',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.06,
    shadowRadius: 28,
    elevation: 4,
  },
  segment: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: Radius.pill,
    padding: 4,
    gap: 4,
  },
  segmentItem: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentItemActive: {
    backgroundColor: colors.elevated,
    shadowColor: '#11181C',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  segmentText: {
    fontSize: 14,
    fontFamily: FontFamily.uiMedium,
    color: colors.muted,
  },
  segmentTextActive: {
    fontFamily: FontFamily.uiBold,
    color: colors.accent,
  },
  title: {
    fontSize: 26,
    fontFamily: FontFamily.display,
    color: colors.text,
  },
  subtitle: {
    fontSize: 15,
    fontFamily: FontFamily.ui,
    lineHeight: 22,
    color: colors.muted,
    marginTop: -12,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.errorSurface,
    borderWidth: 1,
    borderColor: `${colors.danger}55`,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  bannerError: {
    flex: 1,
    fontFamily: FontFamily.uiMedium,
    color: colors.danger,
    fontSize: 13,
  },
  bannerSuccess: {
    backgroundColor: colors.successSurface,
    borderColor: `${colors.successText}44`,
  },
  bannerSuccessText: {
    flex: 1,
    fontFamily: FontFamily.uiMedium,
    color: colors.successText,
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
    backgroundColor: colors.accent,
  },
  consentText: {
    flex: 1,
    fontSize: 13,
    fontFamily: FontFamily.ui,
    lineHeight: 20,
    color: colors.text,
  },
  consentLink: {
    color: colors.primary,
    fontFamily: FontFamily.uiMedium,
  },
  forgotBtn: {
    alignSelf: 'flex-end',
    marginTop: -4,
  },
  forgotText: {
    fontSize: 13,
    fontFamily: FontFamily.uiMedium,
    color: colors.primary,
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
    backgroundColor: colors.border,
  },
  separatorText: {
    fontSize: 12,
    fontFamily: FontFamily.uiMedium,
    color: colors.muted,
    textTransform: 'lowercase',
  },
  socialStack: {
    gap: 12,
  },
  legal: {
    marginTop: 20,
    fontSize: 12,
    fontFamily: FontFamily.ui,
    color: colors.muted,
    textAlign: 'center',
    maxWidth: 320,
  },
  legalLink: {
    color: colors.primary,
    fontFamily: FontFamily.uiMedium,
  },
});
}
