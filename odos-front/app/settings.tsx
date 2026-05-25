import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import {
  ArrowLeft,
  Camera,
  ChevronRight,
  FileText,
  Map,
  Scale,
  Shield,
  Download,
  Trash2,
  User as UserIcon,
} from 'lucide-react-native';

import { useAuth } from '@/context/AuthContext';
import {
  deleteAvatar,
  deleteMyAccount,
  exportMyData,
  patchMapExplorationEnabled,
  updateProfile,
  uploadAvatar,
} from '@/scripts/api';
import { MAP_EXPLORATION_QUERY_KEY } from '@/hooks/useMapExploration';
import { Colors, Fonts, Spacing } from '@/constants/theme';
import { logError, toAppError } from '@/utils/errorHandling';
import { resolveImageUrl } from '@/utils/imageUrl';
import { CTAButton } from '@/components/ui/CTAButton';
import { InputField } from '@/components/ui/InputField';

/**
 * Écran Paramètres — tout le self-service utilisateur est centralisé ici :
 *   - Avatar : upload / suppression via `expo-image-picker` + endpoint sécurisé
 *     `/api/me/avatar` (whitelist MIME, 2 Mo max, throttle 10 s côté serveur).
 *   - Alias (display name) + Bio : `PATCH /api/users/{id}` (merge-patch JSON), avec
 *     sanitization côté frontend (strip basique des `<`/`>`) ET côté serveur.
 *   - Zone dangereuse : suppression de compte avec double confirmation.
 *
 * Principes UX :
 *  - **Aucune saisie ne quitte l'app avant que le serveur ait validé**.
 *  - Boutons `CTAButton` avec spinner inline → jamais de double-submit.
 *  - Compteur de caractères live sur la bio (500 max).
 */

const BIO_MAX = 500;
const ALIAS_MAX = 60;

/** Retire toute balise HTML rudimentaire avant envoi — défense en profondeur. */
function sanitizeInline(value: string): string {
  return value.replace(/[<>]/g, '').trim();
}

/** Valide l'alias côté client — miroir de l'Assert\Regex backend. */
function validateAlias(alias: string): string | null {
  const trimmed = alias.trim();
  if (trimmed.length === 0) return null; // vide = on le retire, pas d'erreur
  if (trimmed.length < 2) return "L'alias doit contenir au moins 2 caractères.";
  if (trimmed.length > ALIAS_MAX) return `L'alias ne peut pas dépasser ${ALIAS_MAX} caractères.`;
  if (!/^[\p{L}\p{N}\s\-_'.]+$/u.test(trimmed)) {
    return "Seules les lettres, chiffres, espaces et - _ . ' sont autorisés.";
  }
  return null;
}

export default function SettingsScreen() {
  const { user, setUser, logout, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();

  const [alias, setAlias] = useState(user?.alias ?? '');
  const [bio, setBio] = useState(user?.bio ?? '');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(user?.avatarUrl ?? null);

  const [savingProfile, setSavingProfile] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [removingAvatar, setRemovingAvatar] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [aliasError, setAliasError] = useState<string | null>(null);
  const [bioError, setBioError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const explorationMutation = useMutation({
    mutationFn: (enabled: boolean) => patchMapExplorationEnabled(enabled),
    onSuccess: async (_overview, enabled) => {
      setUser((u) => (u ? { ...u, mapExplorationEnabled: enabled } : u));
      await queryClient.invalidateQueries({ queryKey: MAP_EXPLORATION_QUERY_KEY });
      setSuccessMsg(
        enabled
          ? 'Exploration carte activée. Ouvrez la carte pour autoriser la position si besoin.'
          : 'Exploration carte désactivée.'
      );
    },
    onError: (err) => {
      logError('Settings.mapExploration', err);
      Alert.alert(
        'Exploration carte',
        toAppError(err, 'Impossible de mettre à jour ce réglage.').userMessage
      );
    },
  });

  const resolvedAvatar = resolveImageUrl(avatarUrl);

  const initials = (user?.displayName ?? user?.email ?? 'OD')
    .slice(0, 2)
    .toUpperCase();

  // ── Avatar ────────────────────────────────────────────────────────────────
  const handlePickAvatar = async () => {
    if (uploadingAvatar) return;

    // Demande de permission (iOS + Android) — on informe l'utilisateur en cas de refus.
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert(
        'Permission requise',
        "Autorisez l'accès à vos photos pour changer votre avatar."
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
      exif: false,
    });

    if (result.canceled || !result.assets?.[0]) return;

    const asset = result.assets[0];
    // On déduit le mime : expo-image-picker donne un uri `file://…/ImagePicker/xxx.jpg`.
    const inferredMime =
      asset.mimeType ?? (asset.uri.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg');
    const inferredName =
      asset.fileName ?? `avatar-${Date.now()}.${inferredMime.split('/')[1] ?? 'jpg'}`;

    setUploadingAvatar(true);
    setSuccessMsg(null);
    try {
      const { avatarUrl: newUrl } = await uploadAvatar({
        uri: asset.uri,
        name: inferredName,
        mimeType: inferredMime,
      });
      setAvatarUrl(newUrl);
      if (user) setUser({ ...user, avatarUrl: newUrl });
      setSuccessMsg('Photo de profil mise à jour.');
    } catch (err) {
      logError('Settings.uploadAvatar', err);
      Alert.alert(
        'Avatar',
        toAppError(err, "Impossible de mettre à jour la photo. Réessayez dans quelques secondes.").userMessage
      );
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleRemoveAvatar = async () => {
    if (!avatarUrl || removingAvatar) return;
    setRemovingAvatar(true);
    try {
      await deleteAvatar();
      setAvatarUrl(null);
      if (user) setUser({ ...user, avatarUrl: null });
      setSuccessMsg('Photo de profil retirée.');
    } catch (err) {
      logError('Settings.deleteAvatar', err);
      Alert.alert('Avatar', toAppError(err, 'Impossible de retirer la photo.').userMessage);
    } finally {
      setRemovingAvatar(false);
    }
  };

  // ── Profil (alias + bio) ──────────────────────────────────────────────────
  const handleSaveProfile = async () => {
    if (!user?.id) return;

    // Sanitize + validate
    const cleanAlias = sanitizeInline(alias);
    const cleanBio = sanitizeInline(bio).slice(0, BIO_MAX);

    const aErr = validateAlias(cleanAlias);
    if (aErr) {
      setAliasError(aErr);
      return;
    }
    setAliasError(null);

    if (cleanBio.length > BIO_MAX) {
      setBioError(`La bio ne peut pas dépasser ${BIO_MAX} caractères.`);
      return;
    }
    setBioError(null);

    setSavingProfile(true);
    setSuccessMsg(null);
    try {
      await updateProfile(user.id, {
        alias: cleanAlias.length === 0 ? null : cleanAlias,
        bio: cleanBio.length === 0 ? null : cleanBio,
      });
      if (user) {
        setUser({
          ...user,
          alias: cleanAlias || null,
          bio: cleanBio || null,
          // displayName côté UI : alias > email local-part (on le recalcule sans re-fetch).
          displayName: cleanAlias || user.email?.split('@')[0] || user.displayName,
        });
      }
      setSuccessMsg('Profil enregistré.');
    } catch (err) {
      logError('Settings.saveProfile', err);
      const app = toAppError(err, 'Impossible de sauvegarder vos informations.');
      // On essaie de router l'erreur sur le bon champ en fonction du message backend.
      if (/alias/i.test(app.userMessage)) setAliasError(app.userMessage);
      else if (/bio/i.test(app.userMessage)) setBioError(app.userMessage);
      else Alert.alert('Profil', app.userMessage);
    } finally {
      setSavingProfile(false);
    }
  };

  // ── Suppression compte (double confirmation) ──────────────────────────────
  const handleDeleteAccount = () => {
    Alert.alert(
      'Supprimer mon compte',
      'Cette action est irréversible. Toutes vos données seront supprimées.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Continuer',
          style: 'destructive',
          onPress: () =>
            Alert.alert(
              'Confirmation finale',
              "Êtes-vous vraiment sûr(e) ? Il n'y a pas de retour en arrière.",
              [
                { text: 'Non, annuler', style: 'cancel' },
                {
                  text: 'Oui, supprimer',
                  style: 'destructive',
                  onPress: () => executeDelete(),
                },
              ]
            ),
        },
      ]
    );
  };

  const executeDelete = async () => {
    if (!user?.id) return;
    setDeleting(true);
    try {
      await deleteMyAccount();
      await logout();
      router.replace('/login');
    } catch (err) {
      logError('Settings.deleteAccount', err);
      Alert.alert('Erreur', toAppError(err, 'Impossible de supprimer le compte.').userMessage);
      setDeleting(false);
    }
  };

  const handleExportData = async () => {
    try {
      const data = await exportMyData();
      await Share.share({
        title: 'Export de mes données ODOS',
        message: JSON.stringify(data, null, 2),
      });
    } catch (err) {
      logError('Settings.exportData', err);
      Alert.alert('Export', toAppError(err, 'Impossible d’exporter vos données.').userMessage);
    }
  };

  const bioLen = bio.length;
  const bioCounterColor =
    bioLen > BIO_MAX ? Colors.light.danger : bioLen > BIO_MAX * 0.9 ? '#b45309' : Colors.light.muted;

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Header */}
      <View style={styles.header}>
        <Pressable style={styles.headerBtn} onPress={() => router.back()} hitSlop={8}>
          <ArrowLeft color={Colors.light.text} size={22} />
        </Pressable>
        <Text style={styles.headerTitle}>Paramètres</Text>
        <View style={styles.headerBtn} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ── Avatar card ── */}
        <View style={styles.avatarCard}>
          <View style={styles.avatarCircleWrap}>
            {resolvedAvatar ? (
              <Image source={{ uri: resolvedAvatar }} style={styles.avatarImg} contentFit="cover" />
            ) : (
              <View style={styles.avatarFallback}>
                <Text style={styles.avatarInitials}>{initials}</Text>
              </View>
            )}
            <Pressable
              onPress={handlePickAvatar}
              disabled={uploadingAvatar}
              style={styles.avatarEditBtn}
              accessibilityRole="button"
              accessibilityLabel="Changer ma photo de profil"
            >
              <Camera size={16} color="#fff" />
            </Pressable>
          </View>
          <Text style={styles.avatarName} numberOfLines={1}>
            {user?.displayName ?? user?.email ?? 'Invité'}
          </Text>
          <Text style={styles.avatarEmail} numberOfLines={1}>
            {user?.email ?? ''}
          </Text>
          <View style={styles.avatarActions}>
            <CTAButton
              label={uploadingAvatar ? 'Envoi…' : 'Changer la photo'}
              onPress={handlePickAvatar}
              loading={uploadingAvatar}
              variant="secondary"
              size="sm"
              leftIcon={<Camera size={14} color={Colors.light.text} />}
            />
            {avatarUrl ? (
              <CTAButton
                label="Retirer"
                onPress={handleRemoveAvatar}
                loading={removingAvatar}
                variant="ghost"
                size="sm"
              />
            ) : null}
          </View>
        </View>

        {/* ── Success banner ── */}
        {successMsg ? (
          <View style={styles.successBanner}>
            <Text style={styles.successBannerText}>{successMsg}</Text>
          </View>
        ) : null}

        {/* ── Profil éditable ── */}
        <Text style={styles.sectionTitle}>Profil public</Text>
        <View style={styles.card}>
          <InputField
            label="Alias"
            placeholder="Comment voulez-vous être appelé ?"
            value={alias}
            onChangeText={(v) => {
              setAlias(v);
              if (aliasError) setAliasError(null);
            }}
            maxLength={ALIAS_MAX}
            autoCapitalize="none"
            error={aliasError}
            hint="Affiché à la place de votre email dans les commentaires."
            leftIcon={<UserIcon size={16} color={Colors.light.muted} />}
          />

          <View style={{ height: 14 }} />

          <View style={styles.bioBlock}>
            <View style={styles.bioLabelRow}>
              <Text style={styles.bioLabel}>Bio</Text>
              <Text style={[styles.bioCounter, { color: bioCounterColor }]}>
                {bioLen}/{BIO_MAX}
              </Text>
            </View>
            <TextInput
              value={bio}
              onChangeText={(v) => {
                if (v.length <= BIO_MAX) setBio(v);
                if (bioError) setBioError(null);
              }}
              multiline
              maxLength={BIO_MAX}
              placeholder="Parlez un peu de vous — vos passions, vos envies d'explorer…"
              placeholderTextColor={Colors.light.muted}
              style={[styles.bioInput, bioError ? styles.bioInputError : null]}
              textAlignVertical="top"
            />
            {bioError ? <Text style={styles.bioErrorText}>{bioError}</Text> : null}
          </View>

          <View style={{ height: 16 }} />

          <CTAButton
            label="Enregistrer les modifications"
            onPress={handleSaveProfile}
            loading={savingProfile}
            size="md"
            fullWidth
          />
        </View>

        {/* ── Carte & confidentialité ── */}
        {isAuthenticated ? (
          <>
            <Text style={styles.sectionTitle}>Carte</Text>
            <View style={styles.card}>
              <View style={styles.switchRow}>
                <View style={styles.switchIcon}>
                  <Map size={18} color={Colors.light.muted} />
                </View>
                <View style={styles.switchTextCol}>
                  <Text style={styles.switchLabel}>Exploration de la carte</Text>
                  <Text style={styles.switchHint}>
                    Suivi des zones visitées et badges « Explorateur ». Désactivé : pas de GPS, pas de
                    progression ni calque sur la carte (badges déjà obtenus conservés).
                  </Text>
                </View>
                <Switch
                  value={user?.mapExplorationEnabled ?? false}
                  onValueChange={(on) => explorationMutation.mutate(on)}
                  disabled={explorationMutation.isPending}
                  trackColor={{ true: Colors.light.mapPrimaryCta }}
                  accessibilityLabel="Activer l'exploration de la carte"
                />
              </View>
            </View>
          </>
        ) : null}

        {/* ── Données personnelles (RGPD) ── */}
        <Text style={styles.sectionTitle}>Mes données</Text>
        <View style={styles.card}>
          <MenuRow
            icon={<Download size={18} color={Colors.light.muted} />}
            label="Télécharger mes données (portabilité)"
            onPress={handleExportData}
          />
        </View>

        {/* ── Informations légales ── */}
        <Text style={styles.sectionTitle}>Informations légales</Text>
        <View style={styles.card}>
          <MenuRow
            icon={<FileText size={18} color={Colors.light.muted} />}
            label="Conditions générales d'utilisation"
            onPress={() => router.push({ pathname: '/legal', params: { section: 'cgu' } })}
          />
          <View style={styles.divider} />
          <MenuRow
            icon={<Shield size={18} color={Colors.light.muted} />}
            label="Politique de confidentialité"
            onPress={() => router.push({ pathname: '/legal', params: { section: 'privacy' } })}
          />
          <View style={styles.divider} />
          <MenuRow
            icon={<Scale size={18} color={Colors.light.muted} />}
            label="Mentions légales"
            onPress={() => router.push({ pathname: '/legal', params: { section: 'mentions' } })}
          />
        </View>

        {/* ── Zone dangereuse ── */}
        <Text style={[styles.sectionTitle, styles.dangerSectionTitle]}>Zone dangereuse</Text>
        <View style={styles.card}>
          <Text style={styles.dangerHelp}>
            La suppression de votre compte est définitive. Vos favoris et notes seront
            effacés ; vos commentaires publics seront anonymisés.
          </Text>
          <View style={{ height: 12 }} />
          <CTAButton
            label="Supprimer mon compte"
            onPress={handleDeleteAccount}
            loading={deleting}
            variant="danger"
            size="md"
            fullWidth
            leftIcon={<Trash2 size={16} color={Colors.light.danger} />}
          />
        </View>

        <View style={{ height: 48 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

/** Row de menu (icône + label + chevron), pour la liste des liens légaux. */
function MenuRow({
  icon,
  label,
  onPress,
}: {
  icon: React.ReactNode;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.menuRow, pressed && styles.menuRowPressed]}
      accessibilityRole="button"
    >
      <View style={styles.menuRowIcon}>{icon}</View>
      <Text style={styles.menuRowText}>{label}</Text>
      <ChevronRight size={18} color={Colors.light.muted} />
    </Pressable>
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
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingTop: 44,
    paddingBottom: 8,
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.light.surface,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.light.text,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: 8,
    paddingBottom: 24,
  },
  avatarCard: {
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 24,
    paddingVertical: 22,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: Colors.light.border,
    marginBottom: 18,
  },
  avatarCircleWrap: {
    position: 'relative',
    marginBottom: 12,
  },
  avatarImg: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: Colors.light.surface,
  },
  avatarFallback: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: Colors.light.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: 1,
  },
  avatarEditBtn: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.light.text,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#fff',
  },
  avatarName: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.light.text,
    fontFamily: Fonts?.serif,
    maxWidth: '90%',
  },
  avatarEmail: {
    marginTop: 2,
    fontSize: 12,
    color: Colors.light.muted,
    maxWidth: '90%',
  },
  avatarActions: {
    marginTop: 14,
    flexDirection: 'row',
    gap: 8,
  },
  successBanner: {
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#86efac',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 12,
  },
  successBannerText: {
    color: '#047857',
    fontSize: 13,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 11,
    letterSpacing: 2,
    color: Colors.light.muted,
    fontWeight: '700',
    marginTop: 10,
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  dangerSectionTitle: {
    color: Colors.light.danger,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.light.border,
    marginBottom: 18,
  },
  bioBlock: {
    gap: 6,
  },
  bioLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bioLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.light.text,
    letterSpacing: 0.2,
  },
  bioCounter: {
    fontSize: 12,
    fontWeight: '600',
  },
  bioInput: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 14,
    color: Colors.light.text,
    minHeight: 110,
  },
  bioInputError: {
    borderColor: Colors.light.danger,
  },
  bioErrorText: {
    fontSize: 12,
    color: Colors.light.danger,
    marginTop: 2,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
  },
  menuRowPressed: {
    opacity: 0.7,
  },
  menuRowIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: Colors.light.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuRowText: {
    flex: 1,
    fontSize: 14,
    color: Colors.light.text,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: Colors.light.border,
    marginLeft: 44,
  },
  dangerHelp: {
    fontSize: 13,
    color: Colors.light.muted,
    lineHeight: 18,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  switchIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: Colors.light.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  switchTextCol: {
    flex: 1,
    paddingRight: 4,
  },
  switchLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.light.text,
  },
  switchHint: {
    marginTop: 4,
    fontSize: 12,
    color: Colors.light.muted,
    lineHeight: 17,
  },
});
