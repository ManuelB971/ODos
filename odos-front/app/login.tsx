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

import { signUp, signIn } from '@/services/AuthService';
import { useAuth } from '@/context/AuthContext';
import { Colors, Fonts, Spacing } from '@/constants/theme';
import { AppLogo } from '@/components/AppLogo';
import { CTAButton } from '@/components/ui/CTAButton';
import { InputField } from '@/components/ui/InputField';

/**
 * Écran Auth unifié : login <-> signup via un switch, fortement designé pour
 * l'arrivée "première impression". Toute la logique métier d'auth est
 * inchangée — on ne retouche que l'UX.
 *
 * UX :
 * - Centré, grand logo + baseline éditoriale en serif.
 * - Inputs via le composant `<InputField>` (focus orange, password toggle).
 * - CTA principal via `<CTAButton>` → loading inline (pas de layout shift, bouton bloqué).
 * - Erreurs dans un banner rouge animé, succès en vert.
 * - Le mode signup n'affiche pas les connexions sociales (plus clair).
 */
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

  const socialAuthNotAvailable = () => {
    setError('Connexion sociale temporairement indisponible.');
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
            <Text style={styles.tagline}>L&apos;aventure moderne commence ici</Text>
          </View>
        ) : null}

        <View style={styles.card}>
          <Text style={styles.title}>{isLogin ? 'Heureux de vous revoir' : 'Bienvenue'}</Text>
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
                <Text style={styles.separatorText}>Ou continuer avec</Text>
                <View style={styles.separatorLine} />
              </View>

              <View style={styles.socialRow}>
                <Pressable
                  onPress={socialAuthNotAvailable}
                  disabled={loading}
                  style={styles.socialBtn}
                  accessibilityRole="button"
                  accessibilityLabel="Connexion avec Google, indisponible"
                >
                  <Text style={styles.socialText}>G</Text>
                </Pressable>
                <Pressable
                  onPress={socialAuthNotAvailable}
                  disabled={loading}
                  style={styles.socialBtn}
                  accessibilityRole="button"
                  accessibilityLabel="Connexion avec Apple, indisponible"
                >
                  <Text style={styles.socialText}></Text>
                </Pressable>
                <Pressable
                  onPress={socialAuthNotAvailable}
                  disabled={loading}
                  style={styles.socialBtn}
                  accessibilityRole="button"
                  accessibilityLabel="Connexion avec Facebook, indisponible"
                >
                  <Text style={styles.socialText}>f</Text>
                </Pressable>
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
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.light.surface,
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
    borderRadius: 24,
    backgroundColor: Colors.light.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    shadowColor: '#f4a261',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 18,
    elevation: 6,
  },
  wordmark: {
    fontSize: 26,
    fontWeight: '800',
    color: Colors.light.text,
    letterSpacing: 6,
    marginBottom: 4,
    fontFamily: Fonts?.serif,
  },
  tagline: {
    fontSize: 12,
    letterSpacing: 1.2,
    color: Colors.light.muted,
    textTransform: 'uppercase',
  },
  card: {
    width: '100%',
    maxWidth: 480,
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 24,
    gap: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.08,
    shadowRadius: 28,
    elevation: 4,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.light.text,
    fontFamily: Fonts?.serif,
  },
  subtitle: {
    fontSize: 14,
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
    color: Colors.light.danger,
    fontSize: 13,
    fontWeight: '600',
  },
  bannerSuccess: {
    backgroundColor: '#ecfdf5',
    borderColor: '#86efac',
  },
  bannerSuccessText: {
    flex: 1,
    color: '#047857',
    fontSize: 13,
    fontWeight: '600',
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
    lineHeight: 20,
    color: Colors.light.text,
  },
  consentLink: {
    color: Colors.light.primary,
    fontWeight: '600',
  },
  forgotBtn: {
    alignSelf: 'flex-end',
    marginTop: -4,
  },
  forgotText: {
    fontSize: 13,
    color: Colors.light.accent,
    fontWeight: '700',
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
    color: Colors.light.muted,
    fontWeight: '600',
  },
  socialRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  socialBtn: {
    width: 56,
    height: 56,
    minWidth: 44,
    minHeight: 44,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  socialText: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.light.text,
  },
  switchBtn: {
    marginTop: 20,
  },
  switchText: {
    fontSize: 14,
    color: Colors.light.muted,
  },
  switchAction: {
    color: Colors.light.accent,
    fontWeight: '700',
  },
  legal: {
    marginTop: 14,
    fontSize: 12,
    color: Colors.light.muted,
    textAlign: 'center',
    maxWidth: 320,
  },
  legalLink: {
    color: Colors.light.primary,
    fontWeight: '600',
  },
});
