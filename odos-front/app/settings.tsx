import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, Alert, ActivityIndicator } from 'react-native';
import { ArrowLeft, Camera, Trash2, FileText, Shield, Scale } from 'lucide-react-native';
import { useState } from 'react';
import { router } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { updateProfile, deleteAccount } from '@/scripts/api';
import { Colors, Spacing } from '@/constants/theme';
import { logError, toAppError } from '@/utils/errorHandling';

export default function SettingsScreen() {
  const { user, logout } = useAuth();
  const [alias, setAlias] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleSaveAlias = async () => {
    if (!user?.id) return;
    setSaving(true);
    try {
      await updateProfile(user.id, { alias: alias.trim() || undefined });
      Alert.alert('Profil', 'Alias enregistré avec succès.');
    } catch (err) {
      logError('Settings.saveAlias', err);
      Alert.alert('Erreur', toAppError(err, 'Impossible de sauvegarder.').userMessage);
    } finally {
      setSaving(false);
    }
  };

  const handleChangeAvatar = () => {
    Alert.alert('Photo de profil', 'Cette fonctionnalité sera disponible prochainement.');
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Supprimer mon compte',
      'Cette action est irréversible. Toutes vos données seront supprimées.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: () => confirmDelete(),
        },
      ],
    );
  };

  const confirmDelete = () => {
    Alert.alert(
      'Confirmation finale',
      'Êtes-vous vraiment sûr(e) ? Il n\'y a pas de retour en arrière.',
      [
        { text: 'Non, annuler', style: 'cancel' },
        {
          text: 'Oui, supprimer définitivement',
          style: 'destructive',
          onPress: () => executeDelete(),
        },
      ],
    );
  };

  const executeDelete = async () => {
    if (!user?.id) return;
    setDeleting(true);
    try {
      await deleteAccount(user.id);
      await logout();
      router.replace('/login');
    } catch (err) {
      logError('Settings.deleteAccount', err);
      Alert.alert('Erreur', toAppError(err, 'Impossible de supprimer le compte.').userMessage);
      setDeleting(false);
    }
  };

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft color={Colors.light.text} size={24} />
        </Pressable>
        <Text style={styles.headerTitle}>Paramètres</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.sectionTitle}>Profil</Text>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Alias</Text>
          <TextInput
            style={styles.input}
            placeholder="Choisissez un alias..."
            placeholderTextColor={Colors.light.muted}
            value={alias}
            onChangeText={setAlias}
            maxLength={60}
            autoCapitalize="none"
          />
          <Pressable
            style={[styles.saveButton, saving && styles.buttonDisabled]}
            onPress={handleSaveAlias}
            disabled={saving || !alias.trim()}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.saveButtonText}>Enregistrer</Text>
            )}
          </Pressable>
        </View>

        <Pressable style={styles.menuRow} onPress={handleChangeAvatar}>
          <Camera color={Colors.light.primary} size={22} />
          <Text style={styles.menuRowText}>Changer ma photo de profil</Text>
        </Pressable>

        <View style={styles.divider} />

        <Text style={styles.sectionTitle}>Zone dangereuse</Text>

        <Pressable
          style={[styles.dangerButton, deleting && styles.buttonDisabled]}
          onPress={handleDeleteAccount}
          disabled={deleting}
        >
          {deleting ? (
            <ActivityIndicator size="small" color={Colors.light.danger} />
          ) : (
            <>
              <Trash2 color={Colors.light.danger} size={20} />
              <Text style={styles.dangerButtonText}>Supprimer mon compte</Text>
            </>
          )}
        </Pressable>

        <View style={styles.divider} />

        <Text style={styles.sectionTitle}>Informations légales</Text>

        <Pressable style={styles.legalRow} onPress={() => router.push({ pathname: '/legal', params: { section: 'cgu' } })}>
          <FileText color={Colors.light.muted} size={20} />
          <Text style={styles.legalRowText}>Conditions générales d&apos;utilisation</Text>
        </Pressable>

        <Pressable style={styles.legalRow} onPress={() => router.push({ pathname: '/legal', params: { section: 'privacy' } })}>
          <Shield color={Colors.light.muted} size={20} />
          <Text style={styles.legalRowText}>Politique de confidentialité</Text>
        </Pressable>

        <Pressable style={styles.legalRow} onPress={() => router.push({ pathname: '/legal', params: { section: 'mentions' } })}>
          <Scale color={Colors.light.muted} size={20} />
          <Text style={styles.legalRowText}>Mentions légales</Text>
        </Pressable>

        <View style={{ height: 48 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: 48,
    paddingBottom: 12,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.light.text,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 40,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: 32,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
    marginTop: 24,
  },
  fieldGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.light.text,
    marginBottom: 8,
  },
  input: {
    backgroundColor: Colors.light.surface,
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
    color: Colors.light.text,
    borderWidth: 1,
    borderColor: Colors.light.border,
    marginBottom: 12,
  },
  saveButton: {
    backgroundColor: Colors.light.primary,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    gap: 14,
  },
  menuRowText: {
    fontSize: 16,
    color: Colors.light.text,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.light.border,
    marginVertical: 8,
  },
  dangerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: '#fee2e2',
  },
  dangerButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.danger,
  },
  legalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    gap: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  legalRowText: {
    fontSize: 16,
    color: Colors.light.text,
  },
});
