import React, { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import {
  Award,
  ChevronRight,
  Edit3,
  FileText,
  Heart,
  LogOut,
  Settings,
} from 'lucide-react-native';

import { useAuth } from '@/context/AuthContext';
import { useFavorites } from '@/hooks/useFavorites';
import { useBadges } from '@/hooks/useBadges';
import { useInterests } from '@/context/InterestContext';
import { Colors, Fonts, Spacing } from '@/constants/theme';
import { CTAButton } from '@/components/ui/CTAButton';
import { resolveImageUrl } from '@/utils/imageUrl';

/**
 * Écran profil — éditorial, low-visual-noise.
 *
 * Structure :
 *  1. Hero : avatar + nom/email + petit dash stats (favoris / intérêts).
 *  2. Liste d'entrées (card unifiée) pour Paramètres, Favoris, Intérêts, Mentions.
 *  3. Bouton logout en bas, avec spinner inline (CTAButton variant="danger").
 */
export default function AccountScreen() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const { favorites } = useFavorites();
  const { interests } = useInterests();
  const { overview: badgesOverview } = useBadges();
  const profileBadges = badgesOverview?.profileDisplayed ?? [];
  const [loggingOut, setLoggingOut] = useState(false);

  /**
   * Affichage prioritaire :
   *   1. `user.displayName` renvoyé par l'API (alias si défini, sinon local-part).
   *   2. Fallback local (pour les anciens caches sans `displayName`).
   */
  const displayName =
    user?.displayName ||
    user?.alias ||
    user?.email?.split('@')[0] ||
    'Voyageur';
  const emailLabel = user?.email ?? 'Non connecté';
  const avatarSrc = resolveImageUrl(user?.avatarUrl ?? null);
  const initials = (displayName || 'OD').slice(0, 2).toUpperCase();
  const hasBio = !!user?.bio && user.bio.trim().length > 0;

  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await logout();
    } finally {
      // Le routing vers /login est fait par logout() ; on laisse loggingOut à true
      // jusqu'au démontage pour éviter un flash du bouton redevenu clickable.
    }
  };

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Hero profil ── */}
      <View style={styles.hero}>
        <View style={styles.avatarWrap}>
          {avatarSrc ? (
            <Image source={{ uri: avatarSrc }} style={styles.avatar} contentFit="cover" />
          ) : (
            <View style={[styles.avatar, styles.avatarFallback]}>
              <Text style={styles.avatarInitials}>{initials}</Text>
            </View>
          )}
          <View style={styles.avatarRing} />
        </View>
        <Text style={styles.nameText} numberOfLines={1}>
          {displayName}
        </Text>
        <Text style={styles.emailText} numberOfLines={1}>
          {emailLabel}
        </Text>
        {hasBio ? (
          <Text style={styles.bioText} numberOfLines={3}>
            {user?.bio}
          </Text>
        ) : null}
      </View>

      {/* ── Stats card ── */}
      <View style={styles.statsRow}>
        <StatCell
          value={favorites.length}
          label="Favoris"
          onPress={() => router.push('/(tabs)/favorites')}
        />
        <View style={styles.statDivider} />
        <StatCell
          value={interests.length}
          label="Intérêts"
          onPress={() => router.push('/interests')}
        />
        <View style={styles.statDivider} />
        <StatCell
          value={0}
          label="Visites"
          subtle
        />
      </View>

      {profileBadges.length > 0 && (
        <Pressable
          style={styles.badgesVitrine}
          onPress={() => router.push('/badges')}
          accessibilityRole="button"
          accessibilityLabel="Voir mes badges"
        >
          <Text style={styles.badgesVitrineTitle}>Badges sur le profil</Text>
          <View style={styles.badgesRow}>
            {profileBadges.slice(0, 6).map((b) => {
              const uri = resolveImageUrl(b.imageUrl);
              return (
                <View key={b.id} style={styles.badgeChip}>
                  {uri ? (
                    <Image source={{ uri }} style={styles.badgeChipImg} contentFit="cover" />
                  ) : (
                    <Award size={20} color={Colors.light.accent} />
                  )}
                </View>
              );
            })}
          </View>
          <Text style={styles.badgesVitrineLink}>Gérer mes badges →</Text>
        </Pressable>
      )}

      {/* ── Menu ── */}
      <View style={styles.menuCard}>
        <MenuItem
          icon={<Award size={18} color={Colors.light.text} />}
          label="Mes badges"
          helper={
            badgesOverview
              ? `${badgesOverview.earned.length} obtenu${badgesOverview.earned.length > 1 ? 's' : ''}`
              : 'Récompenses exploration'
          }
          onPress={() => router.push('/badges')}
        />
        <View style={styles.menuDivider} />
        <MenuItem
          icon={<Heart size={18} color={Colors.light.text} />}
          label="Mes favoris"
          helper={`${favorites.length} lieu${favorites.length > 1 ? 'x' : ''} sauvegardé${favorites.length > 1 ? 's' : ''}`}
          onPress={() => router.push('/(tabs)/favorites')}
        />
        <View style={styles.menuDivider} />
        <MenuItem
          icon={<Edit3 size={18} color={Colors.light.text} />}
          label="Mes centres d'intérêt"
          helper="Personnalisez vos recommandations"
          onPress={() => router.push('/interests')}
        />
        <View style={styles.menuDivider} />
        <MenuItem
          icon={<Settings size={18} color={Colors.light.text} />}
          label="Paramètres"
          helper="Notifications, confidentialité, compte"
          onPress={() => router.push('/settings')}
        />
        <View style={styles.menuDivider} />
        <MenuItem
          icon={<FileText size={18} color={Colors.light.text} />}
          label="Mentions légales"
          helper="Conditions d'utilisation et confidentialité"
          onPress={() => router.push('/legal')}
        />
      </View>

      {/* ── Logout ── */}
      <View style={styles.logoutWrap}>
        <CTAButton
          label="Se déconnecter"
          onPress={handleLogout}
          loading={loggingOut}
          variant="danger"
          size="md"
          fullWidth
          leftIcon={<LogOut size={16} color={Colors.light.danger} />}
        />
      </View>

      <Text style={styles.versionText}>ODOS · version 1.0</Text>
    </ScrollView>
  );
}

/**
 * Cellule de stat dans le header. Tappable → lien vers la section correspondante.
 */
function StatCell({
  value,
  label,
  onPress,
  subtle = false,
}: {
  value: number;
  label: string;
  onPress?: () => void;
  subtle?: boolean;
}) {
  const Wrapper: any = onPress ? Pressable : View;
  return (
    <Wrapper onPress={onPress} style={styles.statCell} accessibilityRole={onPress ? 'button' : undefined}>
      <Text style={[styles.statValue, subtle && styles.statValueSubtle]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </Wrapper>
  );
}

/**
 * Entrée de menu unifiée (icône à gauche, label + helper, chevron à droite).
 */
function MenuItem({
  icon,
  label,
  helper,
  onPress,
}: {
  icon: React.ReactNode;
  label: string;
  helper?: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.menuItem, pressed && styles.menuItemPressed]}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <View style={styles.menuIcon}>{icon}</View>
      <View style={styles.menuText}>
        <Text style={styles.menuLabel}>{label}</Text>
        {helper ? <Text style={styles.menuHelper}>{helper}</Text> : null}
      </View>
      <ChevronRight size={18} color={Colors.light.muted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  scrollContent: {
    paddingTop: 40,
    paddingBottom: 80,
    paddingHorizontal: Spacing.lg,
  },
  hero: {
    alignItems: 'center',
    marginBottom: 24,
  },
  avatarWrap: {
    width: 96,
    height: 96,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
  },
  avatarRing: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 48,
    borderWidth: 2,
    borderColor: Colors.light.accent,
  },
  nameText: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.light.text,
    fontFamily: Fonts?.serif,
  },
  emailText: {
    marginTop: 2,
    fontSize: 13,
    color: Colors.light.muted,
  },
  avatarFallback: {
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
  bioText: {
    marginTop: 12,
    fontSize: 13,
    lineHeight: 19,
    color: Colors.light.text,
    textAlign: 'center',
    paddingHorizontal: 20,
    fontStyle: 'italic',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.light.surface,
    borderRadius: 20,
    paddingVertical: 16,
    paddingHorizontal: 8,
    marginBottom: 22,
  },
  statCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 4,
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: Colors.light.border,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.light.text,
    fontFamily: Fonts?.serif,
  },
  statValueSubtle: {
    color: Colors.light.muted,
  },
  statLabel: {
    marginTop: 2,
    fontSize: 11,
    color: Colors.light.muted,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    fontWeight: '700',
  },
  badgesVitrine: {
    backgroundColor: Colors.light.surface,
    borderRadius: 20,
    padding: 16,
    marginBottom: 22,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  badgesVitrineTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.light.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  badgesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  badgeChip: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.light.background,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  badgeChipImg: { width: 44, height: 44 },
  badgesVitrineLink: {
    marginTop: 12,
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.primary,
  },
  menuCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.light.border,
    marginBottom: 20,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 14,
  },
  menuItemPressed: {
    backgroundColor: Colors.light.surface,
  },
  menuIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: Colors.light.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuText: {
    flex: 1,
  },
  menuLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.light.text,
  },
  menuHelper: {
    marginTop: 2,
    fontSize: 12,
    color: Colors.light.muted,
  },
  menuDivider: {
    height: 1,
    backgroundColor: Colors.light.border,
    marginLeft: 66,
  },
  logoutWrap: {
    marginBottom: 16,
  },
  versionText: {
    textAlign: 'center',
    fontSize: 11,
    color: Colors.light.muted,
    letterSpacing: 0.5,
    marginTop: 4,
  },
});
