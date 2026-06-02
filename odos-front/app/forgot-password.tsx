import React, { useState } from 'react';
import {
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
import { AlertCircle, ArrowLeft, CheckCircle2, Mail } from 'lucide-react-native';

import { requestPasswordReset } from '@/services/AuthService';
import { Colors, FontFamily, Radius, Spacing } from '@/constants/theme';
import { CTAButton } from '@/components/ui/CTAButton';
import { InputField } from '@/components/ui/InputField';
import { SprayBackground } from '@/components/ui/SprayBackground';

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const trimmedEmail = email.trim();
  const emailValid = isValidEmail(trimmedEmail);
  const canSubmit = emailValid && !loading;

  const handleSubmit = async () => {
    if (!canSubmit) {
      setError('Vérifiez votre adresse email.');
      return;
    }

    setLoading(true);
    setError(null);

    const { success, errorMessage } = await requestPasswordReset(trimmedEmail);
    setLoading(false);

    if (!success) {
      setError(errorMessage ?? 'Une erreur est survenue.');
      return;
    }

    setSent(true);
  };

  return (
    <SprayBackground>
      <KeyboardAvoidingView
        style={styles.screen}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={insets.top}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scroll,
            { paddingTop: insets.top + 16, paddingBottom: Math.max(insets.bottom, 16) + 32 },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Pressable
            onPress={() => router.back()}
            style={styles.backBtn}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Retour à la connexion"
          >
            <ArrowLeft size={20} color={Colors.light.text} />
            <Text style={styles.backText}>Retour</Text>
          </Pressable>

          <View style={styles.card}>
            <Text style={styles.eyebrow}>Mot de passe oublié</Text>
            <Text style={styles.title}>Réinitialiser votre accès</Text>
            <Text style={styles.subtitle}>
              {sent
                ? 'Consultez votre boîte mail. Le lien ou le code expire dans 1 heure.'
                : 'Saisissez l’email de votre compte. Nous vous enverrons un code de réinitialisation.'}
            </Text>

            {error ? (
              <View style={styles.banner}>
                <AlertCircle size={16} color={Colors.light.danger} />
                <Text style={styles.bannerError}>{error}</Text>
              </View>
            ) : null}

            {sent ? (
              <View style={[styles.banner, styles.bannerSuccess]}>
                <CheckCircle2 size={16} color="#16a34a" />
                <Text style={styles.bannerSuccessText}>
                  Si un compte existe avec cette adresse, un email vient d’être envoyé.
                </Text>
              </View>
            ) : (
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
                returnKeyType="done"
                onSubmitEditing={handleSubmit}
              />
            )}

            {sent ? (
              <CTAButton
                label="Saisir le code reçu"
                onPress={() =>
                  router.push({ pathname: '/reset-password', params: { email: trimmedEmail } })
                }
                fullWidth
                size="lg"
              />
            ) : (
              <CTAButton
                label="Envoyer le code"
                onPress={handleSubmit}
                loading={loading}
                disabled={!canSubmit}
                fullWidth
                size="lg"
              />
            )}
          </View>
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
    alignItems: 'center',
  },
  backBtn: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 20,
  },
  backText: {
    fontSize: 15,
    fontFamily: FontFamily.uiMedium,
    color: Colors.light.text,
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
});
