import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { AlertCircle, Loader2, Eye, EyeOff } from 'lucide-react-native';
import { signUp, signIn } from '@/services/AuthService';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { Colors, Spacing } from '@/constants/theme';
import { AppLogo } from '@/components/AppLogo';

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const router = useRouter();
  const { setUser } = useAuth();

  const handleAuth = async () => {
    const trimmedEmail = email.trim();
    if (!isValidEmail(trimmedEmail)) {
      setError("Email invalide.");
      return;
    }
    if (password.length < 6) {
      setError("Le mot de passe doit contenir au moins 6 caractères.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (isLogin) {

        const { success, errorMessage, user } = await signIn(trimmedEmail, password);
        if (!success) {
          setError(errorMessage ?? 'Erreur de connexion');
        } else {

          if (user) {
            setUser(user);
            const hasInterests = Array.isArray(user.interests) && user.interests.length > 0;
            router.replace(hasInterests ? '/' : '/interests');
          }
        }
      } else {

        const { success, errorMessage } = await signUp(trimmedEmail, password);
        if (!success) {
          setError(errorMessage ?? 'Une erreur est survenue');
        } else {
          setSuccess(true);

          setTimeout(() => {
            setSuccess(false);
            setIsLogin(true);
          }, 2000);
        }
      }
    } catch {
      setError(isLogin ? "Erreur de connexion" : "Une erreur est survenue lors de l'inscription");
    } finally {
      setLoading(false);
    }
  };

  const socialAuthNotAvailable = () => {
    setError('Connexion sociale temporairement indisponible.');
  };

  const trimmedEmail = email.trim();
  const canSubmit = isValidEmail(trimmedEmail) && password.length >= 6 && !loading;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.screenCard}>
        <View style={styles.brandHeader}>
          <View style={styles.logoCircle}>
            <AppLogo width={44} height={44} />
          </View>
          <Text style={styles.subtitle}>Découvrez Lyon autrement</Text>
        </View>

        <Text style={styles.title}>{isLogin ? 'Connexion' : 'Inscription'}</Text>

        {error && (
          <View style={styles.errorContainer}>
            <AlertCircle size={16} color={Colors.light.danger} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {success && (
          <View style={styles.successContainer}>
            <Text style={styles.successText}>Inscription réussie ! Vous pouvez vous connecter.</Text>
          </View>
        )}

        <View style={styles.field}>
          <Text style={styles.label}>Adresse email</Text>
          <TextInput
            placeholder="exemple@email.com"
            value={email}
            onChangeText={setEmail}
            style={styles.input}
            placeholderTextColor={Colors.light.muted}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Mot de passe</Text>
          <View style={styles.passwordRow}>
            <TextInput
              placeholder="••••••••"
              value={password}
              onChangeText={setPassword}
              style={[styles.input, { flex: 1 }]}
              placeholderTextColor={Colors.light.muted}
              secureTextEntry={!showPassword}
              autoCorrect={false}
            />
            <TouchableOpacity
              onPress={() => setShowPassword((s) => !s)}
              accessibilityRole="button"
              style={styles.eyeButton}
              hitSlop={10}
            >
              {showPassword ? <EyeOff size={18} color={Colors.light.text} /> : <Eye size={18} color={Colors.light.text} />}
            </TouchableOpacity>
          </View>
          {isLogin && (
            <TouchableOpacity
              onPress={() => setError('Fonction “mot de passe oublié” à ajouter')}
              style={styles.forgotLink}
            >
              <Text style={styles.forgotLinkText}>Mot de passe oublié ?</Text>
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity
          onPress={handleAuth}
          disabled={!canSubmit}
          style={[styles.button, loading && styles.buttonDisabled]}
        >
          {loading ? (
            <View style={styles.buttonContent}>
              <Loader2 size={20} color={Colors.light.background} style={styles.spinner} />
              <Text style={styles.buttonText}>Chargement...</Text>
            </View>
          ) : (
            <Text style={styles.buttonText}>{isLogin ? 'Continuer' : 'Créer un compte'}</Text>
          )}
        </TouchableOpacity>

        {isLogin && (
          <>
            <View style={styles.separatorRow}>
              <View style={styles.separatorLine} />
              <Text style={styles.separatorText}>Ou continuer avec</Text>
              <View style={styles.separatorLine} />
            </View>

            <View style={styles.socialRow}>
              <TouchableOpacity
                onPress={socialAuthNotAvailable}
                disabled={loading}
                style={[styles.socialButton, styles.socialGoogle]}
              >
                <Text style={styles.socialButtonText}>G</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={socialAuthNotAvailable}
                disabled={loading}
                style={[styles.socialButton, styles.socialApple]}
              >
                <Text style={styles.socialButtonText}></Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={socialAuthNotAvailable}
                disabled={loading}
                style={[styles.socialButton, styles.socialFacebook]}
              >
                <Text style={styles.socialButtonText}>f</Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        <TouchableOpacity onPress={() => setIsLogin(!isLogin)} style={styles.switchModeBlock}>
          <Text style={styles.switchModeText}>
            {isLogin ? "Pas encore de membre ? Créer un compte" : 'Déjà un compte ? Se connecter'}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: Colors.light.surface,
    alignItems: 'center',
    justifyContent: 'flex-start',
    padding: Spacing.lg,
    paddingTop: 40,
  },
  screenCard: {
    width: '100%',
    maxWidth: 460,
    alignItems: 'center',
    gap: 14,
  },
  brandHeader: {
    alignItems: 'center',
    marginBottom: 4,
  },
  logoCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.light.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  logoText: {
    color: Colors.light.background,
    fontSize: 28,
    fontWeight: '800',
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: Colors.light.text,
    marginTop: 8,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.light.muted,
    fontWeight: '600',
    marginBottom: 2,
    textAlign: 'center',
  },
  errorContainer: {
    width: '100%',
    maxWidth: 420,
    padding: 12,
    backgroundColor: '#fee2e2',
    borderWidth: 1,
    borderColor: '#fca5a5',
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  welcomeText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.light.accent,
    marginBottom: 20,
    textAlign: 'center',
  },
  errorText: {
    color: Colors.light.danger,
    fontSize: 14,
  },
  successContainer: {
    width: '100%',
    maxWidth: 420,
    padding: 12,
    backgroundColor: '#dcfce7',
    borderWidth: 1,
    borderColor: '#86efac',
    borderRadius: 6,
  },
  successText: {
    color: '#16a34a',
    fontSize: 14,
  },
  input: {
    padding: 12,
    backgroundColor: Colors.light.background,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
    borderRadius: 12,
    color: Colors.light.text,
  },
  button: {
    width: '100%',
    backgroundColor: Colors.light.accent,
    padding: 12,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: Colors.light.background,
    fontWeight: '600',
    fontSize: 16,
  },
  spinner: {
    marginRight: 8,
  },
  switchModeText: {
    color: Colors.light.primary,
    fontSize: 14,
  },
  switchModeBlock: {
    marginTop: 6,
  },
  field: {
    width: '100%',
    maxWidth: 420,
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.light.text,
  },
  passwordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
    overflow: 'hidden',
  },
  eyeButton: {
    paddingHorizontal: 10,
    paddingVertical: 10,
    backgroundColor: Colors.light.background,
  },
  forgotLink: {
    alignSelf: 'flex-end',
    marginTop: -6,
  },
  forgotLinkText: {
    color: Colors.light.accent,
    fontSize: 14,
    fontWeight: '700',
  },
  separatorRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 6,
  },
  separatorLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(17,24,39,0.1)',
  },
  separatorText: {
    color: Colors.light.muted,
    fontWeight: '700',
    fontSize: 13,
  },
  socialRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    maxWidth: 320,
    marginTop: 2,
  },
  socialButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(17,24,39,0.12)',
    backgroundColor: Colors.light.background,
  },
  socialButtonText: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.light.text,
  },
  socialGoogle: {
    // no-op for now
  },
  socialApple: {
    // no-op for now
  },
  socialFacebook: {
    // no-op for now
  },
});
