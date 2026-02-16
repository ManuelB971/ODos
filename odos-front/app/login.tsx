import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { AlertCircle, Loader2 } from 'lucide-react-native';
import { signUp, signIn } from '@/app/(tabs)/database/auth';
import { useRouter } from 'expo-router';
import { useAuth } from './context/AuthContext';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const router = useRouter();
  const { setUser } = useAuth();

  const handleAuth = async () => {
    setLoading(true);
    setError(null);

    try {
      if (isLogin) {
       
        const { success, errorMessage, user } = await signIn(email, password);
        if (!success) {
          setError(errorMessage ?? 'Erreur de connexion');
        } else {
          
          if (user) {
            setUser({
              id: user.id,
              email: user.email || '',
            });
            
            router.replace('/interests');
          }
        }
      } else {
       
        const { success, errorMessage } = await signUp(email, password);
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
    } catch (e) {
      setError(isLogin ? "Erreur de connexion" : "Une erreur est survenue lors de l'inscription");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.formContainer}>
      <Text style={styles.welcomeText}>Bienvenue sur ODOS</Text>
        <Text style={styles.title}>{isLogin ? 'Connexion' : 'Inscription'}</Text>

        {error && (
          <View style={styles.errorContainer}>
            <AlertCircle size={16} color="#ef4444" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {success && (
          <View style={styles.successContainer}>
            <Text style={styles.successText}>Inscription réussie ! Vérifiez votre email.</Text>
          </View>
        )}

        <TextInput
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          style={styles.input}
          placeholderTextColor="#000000"
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <TextInput
          placeholder="Mot de passe"
          value={password}
          onChangeText={setPassword}
          style={styles.input}
          placeholderTextColor="#000000"
          secureTextEntry
        />

        <TouchableOpacity
          onPress={handleAuth}
          disabled={loading}
          style={[styles.button, loading && styles.buttonDisabled]}
        >
          {loading ? (
            <View style={styles.buttonContent}>
              <Loader2 size={20} color="#ffffff" style={styles.spinner} />
              <Text style={styles.buttonText}>Chargement...</Text>
            </View>
          ) : (
            <Text style={styles.buttonText}>{isLogin ? 'Se connecter' : 'S\'inscrire'}</Text>
          )}
        </TouchableOpacity>
        
        <TouchableOpacity onPress={() => setIsLogin(!isLogin)}>
          <Text style={styles.switchModeText}>
            {isLogin ? 'Pas encore de compte ? S\'inscrire' : 'Déjà un compte ? Se connecter'}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  formContainer: {
    width: '100%',
    maxWidth: 500,
    alignItems: 'center',
    gap: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000000',
    marginTop: -80,
  },
  errorContainer: {
    width: '100%',
    maxWidth: 400,
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
    color: '#f4a261', 
    marginBottom: 20,
    textAlign: 'center', 
  },
  errorText: {
    color: '#ef4444',
    fontSize: 14,
  },
  successContainer: {
    width: '100%',
    maxWidth: 400,
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
    width: '95%',
    padding: 12,
    backgroundColor: '#fdf1c8',
    borderWidth: 1,
    borderColor: '#000000',
    borderRadius: 6,
    color: '#000000',
  },
  button: {
    width: '70%',
    backgroundColor: '#f4a261',
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
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 16,
  },
  spinner: {
    marginRight: 8,
  },
  switchModeText: {
    color: '#3b82f6',
    fontSize: 14,
    marginTop: 16,
    textDecorationLine: 'underline',
  },
});
