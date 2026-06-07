import React, { useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  ImageBackground,
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
  Palette,
  Settings,
} from 'lucide-react-native';

import { useAuth } from '@/context/AuthContext';
import { useFavorites } from '@/hooks/useFavorites';
import { useBadges } from '@/hooks/useBadges';
import { useInterests } from '@/context/InterestContext';
import { useOdosColors, useTheme, type OdosColorPalette } from '@/context/ThemeContext';
import { useActivities } from '@/hooks/useActivities';
import { useQuery } from '@tanstack/react-query';
import { fetchVisitedIds } from '@/scripts/api';
import { FontFamily, Radius, Spacing } from '@/constants/theme';
import { BlobFrame } from '@/components/ui/BlobFrame';
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
const SPRAY_BG = require('@/assets/images/spray-background.png');

export default function AccountScreen() {
  const router = useRouter();
  const colors = useOdosColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { isDark } = useTheme();
  const { user, logout } = useAuth();
  const { favorites } = useFavorites();
  const { interests } = useInterests();
  const { overview: badgesOverview } = useBadges();
  const profileBadges = badgesOverview?.profileDisplayed ?? [];

  const visitedQuery = useQuery<number[]>({
    queryKey: ['visitedIds'],
    queryFn: fetchVisitedIds,
    enabled: !!user,
    staleTime: 1000 * 60 * 2,
  });
  const activitiesQuery = useActivities();

  const visitedCount = visitedQuery.data?.length ?? 0;
  const totalCount = activitiesQuery.data?.filter((a) => a.isPublished !== false).length ?? 0;
  const explorationPct = totalCount > 0 ? Math.round((visitedCount / totalCount) * 100) : 0;
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
    <ImageBackground
      source={SPRAY_BG}
      style={styles.screen}
      imageStyle={{ opacity: isDark ? 0.04 : 0.09 }}
      resizeMode="cover"
    >
    <ScrollView
      style={styles.screenInner}
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
        <StatCell value={visitedCount} label="Visites" />
      </View>

      {/* ── Barre d'exploration ── */}
      {user && (
        <View style={styles.explorationCard}>
          <View style={styles.explorationHeader}>
            <Text style={styles.explorationTitle}>Exploration</Text>
            <Text style={styles.explorationPct}>{explorationPct}%</Text>
          </View>
          <View style={styles.explorationTrack}>
            <View style={[styles.explorationFill, { width: `${Math.max(explorationPct, explorationPct > 0 ? 4 : 0)}%` }]} />
          </View>
          <Text style={styles.explorationSub}>
            {visitedCount} lieu{visitedCount > 1 ? 'x' : ''} visité{visitedCount > 1 ? 's' : ''} sur {totalCount}
          </Text>
        </View>
      )}

      {profileBadges.length > 0 && (
        <Pressable
          style={styles.badgesVitrine}
          onPress={() => router.push('/badges')}
          accessibilityRole="button"
          accessibilityLabel="Voir mes badges"
        >
          <Text style={styles.badgesVitrineTitle}>Badges sur le profil</Text>
          <View style={styles.badgesRow}>
            {profileBadges.slice(0, 6).map((b, index) => {
              const uri = resolveImageUrl(b.imageUrl);
              return (
                <BlobFrame
                  key={b.id}
                  size={44}
                  seed={b.id + index}
                  backgroundColor={colors.background}
                >
                  {uri ? (
                    <Image source={{ uri }} style={styles.badgeChipImg} contentFit="cover" />
                  ) : (
                    <Award size={20} color={colors.accent} />
                  )}
                </BlobFrame>
              );
            })}
          </View>
          <Text style={styles.badgesVitrineLink}>Gérer mes badges →</Text>
        </Pressable>
      )}

      {/* ── Menu ── */}
      <View style={styles.menuCard}>
        <MenuItem
          icon={<Award size={18} color={colors.text} />}
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
          icon={<Heart size={18} color={colors.text} />}
          label="Mes favoris"
          helper={`${favorites.length} lieu${favorites.length > 1 ? 'x' : ''} sauvegardé${favorites.length > 1 ? 's' : ''}`}
          onPress={() => router.push('/(tabs)/favorites')}
        />
        <View style={styles.menuDivider} />
        <MenuItem
          icon={<Edit3 size={18} color={colors.text} />}
          label="Mes centres d'intérêt"
          helper="Personnalisez vos recommandations"
          onPress={() => router.push('/interests')}
        />
        <View style={styles.menuDivider} />
        <MenuItem
          icon={<Palette size={18} color={colors.text} />}
          label="Apparence"
          helper="Thème et mode sombre"
          onPress={() => router.push('/appearance')}
        />
        <View style={styles.menuDivider} />
        <MenuItem
          icon={<Settings size={18} color={colors.text} />}
          label="Paramètres"
          helper="Notifications, confidentialité, compte"
          onPress={() => router.push('/settings')}
        />
        <View style={styles.menuDivider} />
        <MenuItem
          icon={<FileText size={18} color={colors.text} />}
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
          leftIcon={<LogOut size={16} color={colors.danger} />}
        />
      </View>

      <Text style={styles.versionText}>ODOS · version 1.0</Text>
    </ScrollView>
    </ImageBackground>
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
  const colors = useOdosColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const Wrapper: typeof Pressable | typeof View = onPress ? Pressable : View;
  return (
    <Wrapper onPress={onPress} style={styles.statCell} accessibilityRole={onPress ? 'button' : undefined}>
      <Text style={[styles.statValue, subtle && styles.statValueSubtle]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </Wrapper>
  );
}

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
  const colors = useOdosColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
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
      <ChevronRight size={18} color={colors.muted} />
    </Pressable>
  );
}

function createStyles(colors: OdosColorPalette) {
  return StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  screenInner: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 40,
    paddingBottom: 80,
    paddingHorizontal: Spacing.lg,
  },
  explorationCard: {
    backgroundColor: colors.surface,
    borderRadius: Radius.card,
    padding: 16,
    marginBottom: 22,
    borderWidth: 1,
    borderColor: colors.border,
  },
  explorationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 10,
  },
  explorationTitle: {
    fontSize: 12,
    fontFamily: FontFamily.uiBold,
    color: colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  explorationPct: {
    fontSize: 22,
    fontFamily: FontFamily.display,
    color: colors.accent,
  },
  explorationTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.border,
    overflow: 'hidden',
    marginBottom: 8,
  },
  explorationFill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: colors.accent,
  },
  explorationSub: {
    fontSize: 12,
    fontFamily: FontFamily.ui,
    color: colors.muted,
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
    borderColor: colors.accent,
  },
  nameText: {
    fontSize: 22,
    fontFamily: FontFamily.display,
    color: colors.text,
  },
  emailText: {
    marginTop: 2,
    fontSize: 13,
    fontFamily: FontFamily.ui,
    color: colors.muted,
  },
  avatarFallback: {
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    color: '#fff',
    fontSize: 28,
    fontFamily: FontFamily.uiBold,
    letterSpacing: 1,
  },
  bioText: {
    marginTop: 12,
    fontSize: 13,
    fontFamily: FontFamily.ui,
    lineHeight: 19,
    color: colors.text,
    textAlign: 'center',
    paddingHorizontal: 20,
    fontStyle: 'italic',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: Radius.card,
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
    backgroundColor: colors.border,
  },
  statValue: {
    fontSize: 22,
    fontFamily: FontFamily.display,
    color: colors.text,
  },
  statValueSubtle: {
    color: colors.muted,
  },
  statLabel: {
    marginTop: 2,
    fontSize: 11,
    fontFamily: FontFamily.uiBold,
    color: colors.muted,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  badgesVitrine: {
    backgroundColor: colors.surface,
    borderRadius: Radius.card,
    padding: 16,
    marginBottom: 22,
    borderWidth: 1,
    borderColor: colors.border,
  },
  badgesVitrineTitle: {
    fontSize: 12,
    fontFamily: FontFamily.uiBold,
    color: colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  badgesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  badgeChipImg: { width: 44, height: 44 },
  badgesVitrineLink: {
    marginTop: 12,
    fontSize: 14,
    fontFamily: FontFamily.uiMedium,
    color: colors.primary,
  },
  menuCard: {
    backgroundColor: colors.elevated,
    borderRadius: Radius.card,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
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
    backgroundColor: colors.surface,
  },
  menuIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuText: {
    flex: 1,
  },
  menuLabel: {
    fontSize: 15,
    fontFamily: FontFamily.uiBold,
    color: colors.text,
  },
  menuHelper: {
    marginTop: 2,
    fontSize: 12,
    fontFamily: FontFamily.ui,
    color: colors.muted,
  },
  menuDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginLeft: 66,
  },
  logoutWrap: {
    marginBottom: 16,
  },
  versionText: {
    textAlign: 'center',
    fontSize: 11,
    fontFamily: FontFamily.ui,
    color: colors.muted,
    letterSpacing: 0.5,
    marginTop: 4,
  },
  });
}
