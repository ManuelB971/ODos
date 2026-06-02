import React, { useEffect, useState, useMemo } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AlertCircle, ArrowLeft, CheckCircle2, KeyRound } from 'lucide-react-native';

import { confirmPasswordReset } from '@/services/AuthService';
import { FontFamily, Radius, Spacing } from '@/constants/theme';
import { useOdosColors, type OdosColorPalette } from '@/context/ThemeContext';
import { CTAButton } from '@/components/ui/CTAButton';
import { InputField } from '@/components/ui/InputField';
import { SprayBackground } from '@/components/ui/SprayBackground';

export default function ResetPasswordScreen() {
  const colors = useOdosColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ token?: string; email?: string }>();

  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (typeof params.token === 'string' && params.token.length > 0) {
      setToken(params.token);
    }
  }, [params.token]);

  const passwordValid = password.length >= 6;
  const passwordsMatch = password === confirmPassword && confirmPassword.length > 0;
  const tokenValid = token.trim().length >= 16;
  const canSubmit = tokenValid && passwordValid && passwordsMatch && !loading;

  const handleSubmit = async () => {
    if (!tokenValid) {
      setError('Collez le code reçu par email.');
      return;
    }
    if (!passwordValid) {
      setError('Le mot de passe doit contenir au moins 6 caractères.');
      return;
    }
    if (!passwordsMatch) {
      setError('Les mots de passe ne correspondent pas.');
      return;
    }

    setLoading(true);
    setError(null);

    const { success: ok, errorMessage } = await confirmPasswordReset(token, password);
    setLoading(false);

    if (!ok) {
      setError(errorMessage ?? 'Réinitialisation impossible.');
      return;
    }

    setSuccess(true);
    setTimeout(() => {
      router.replace('/login');
    }, 2000);
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
            accessibilityLabel="Retour"
          >
            <ArrowLeft size={20} color={colors.text} />
            <Text style={styles.backText}>Retour</Text>
          </Pressable>

          <View style={styles.card}>
            <Text style={styles.eyebrow}>Nouveau mot de passe</Text>
            <Text style={styles.title}>Choisissez un mot de passe</Text>
            <Text style={styles.subtitle}>
              {typeof params.email === 'string' && params.email
                ? `Code envoyé à ${params.email}. Collez-le ci-dessous ou ouvrez le lien reçu par email.`
                : 'Collez le code reçu par email ou ouvrez le lien de réinitialisation.'}
            </Text>

            {error ? (
              <View style={styles.banner}>
                <AlertCircle size={16} color={colors.danger} />
                <Text style={styles.bannerError}>{error}</Text>
              </View>
            ) : null}

            {success ? (
              <View style={[styles.banner, styles.bannerSuccess]}>
                <CheckCircle2 size={16} color="#16a34a" />
                <Text style={styles.bannerSuccessText}>
                  Mot de passe mis à jour — redirection vers la connexion…
                </Text>
              </View>
            ) : (
              <View style={styles.fields}>
                <InputField
                  label="Code de réinitialisation"
                  placeholder="Collez le code de l’email"
                  value={token}
                  onChangeText={setToken}
                  autoCapitalize="none"
                  autoCorrect={false}
                  leftIcon={<KeyRound size={18} color={colors.muted} />}
                />

                <InputField
                  label="Nouveau mot de passe"
                  placeholder="Au moins 6 caractères"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  autoComplete="password-new"
                  textContentType="newPassword"
                  hint="6 caractères minimum."
                />

                <InputField
                  label="Confirmer le mot de passe"
                  placeholder="Retapez le mot de passe"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry
                  autoComplete="password-new"
                  textContentType="newPassword"
                  error={
                    confirmPassword.length > 0 && !passwordsMatch
                      ? 'Les mots de passe ne correspondent pas.'
                      : null
                  }
                  returnKeyType="done"
                  onSubmitEditing={handleSubmit}
                />
              </View>
            )}

            {!success ? (
              <CTAButton
                label="Enregistrer le mot de passe"
                onPress={handleSubmit}
                loading={loading}
                disabled={!canSubmit}
                fullWidth
                size="lg"
              />
            ) : null}
          </View>
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
    color: colors.text,
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
  eyebrow: {
    fontSize: 11,
    fontFamily: FontFamily.uiMedium,
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: colors.accent,
    marginBottom: -10,
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
  fields: {
    gap: 14,
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
});
}
