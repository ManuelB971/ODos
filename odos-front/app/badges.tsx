import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, Award, Lock } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useBadges, BADGES_QUERY_KEY } from '@/hooks/useBadges';
import { useAuth } from '@/context/AuthContext';
import { Colors, Spacing } from '@/constants/theme';
import { resolveImageUrl } from '@/utils/imageUrl';
import type { BadgeItem } from '@/types';
import api from '@/scripts/api';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { logError } from '@/utils/errorHandling';

function BadgeCard({
  badge,
  onToggleDisplay,
  toggling,
}: {
  badge: BadgeItem;
  onToggleDisplay?: (show: boolean) => void;
  toggling?: boolean;
}) {
  const owned = badge.owned;
  const uri = resolveImageUrl(badge.imageUrl);

  return (
    <View style={[styles.card, !owned && styles.cardLocked]}>
      <View style={styles.cardIcon}>
        {uri ? (
          <Image source={{ uri }} style={styles.cardImage} resizeMode="cover" />
        ) : owned ? (
          <Award size={28} color={Colors.light.accent} />
        ) : (
          <Lock size={24} color={Colors.light.muted} />
        )}
      </View>
      <View style={styles.cardBody}>
        <Text style={styles.cardTitle}>{badge.name}</Text>
        <Text style={styles.cardDesc} numberOfLines={3}>
          {owned ? badge.description : badge.ruleHint}
        </Text>
        {owned && badge.unlockedAt && (
          <Text style={styles.cardDate}>
            Débloqué le {new Date(badge.unlockedAt).toLocaleDateString('fr-FR')}
          </Text>
        )}
        {owned && onToggleDisplay && (
          <View style={styles.toggleRow}>
            <Text style={styles.toggleLabel}>Afficher sur mon profil</Text>
            <Switch
              value={badge.displayOnProfile !== false}
              onValueChange={onToggleDisplay}
              disabled={toggling}
              trackColor={{ true: Colors.light.primary }}
            />
          </View>
        )}
      </View>
    </View>
  );
}

export default function BadgesScreen() {
  const router = useRouter();
  const { user, setUser, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const { overview, isLoading, setDisplayOnProfile } = useBadges();

  const hideAllMutation = useMutation({
    mutationFn: async (hide: boolean) => {
      if (!user?.id) return;
      await api.patch(`/api/users/${user.id}`, { hideBadgesOnProfile: hide }, {
        headers: { 'Content-Type': 'application/merge-patch+json' },
      });
    },
    onSuccess: async (_d, hide) => {
      setUser((u) => (u ? { ...u, hideBadgesOnProfile: hide } : u));
      await queryClient.invalidateQueries({ queryKey: BADGES_QUERY_KEY });
    },
    onError: (err) => {
      logError('Badges.hideAll', err);
    },
  });

  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.screen}>
        <Text style={styles.msg}>Connectez-vous pour voir vos badges.</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={8} accessibilityLabel="Retour">
          <ArrowLeft size={22} color={Colors.light.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Mes badges</Text>
        <View style={{ width: 22 }} />
      </View>

      {isLoading && (
        <View style={styles.centered}>
          <ActivityIndicator color={Colors.light.primary} />
        </View>
      )}

      {!isLoading && overview && (
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={styles.masterToggle}>
            <Text style={styles.masterLabel}>Masquer tous les badges sur le profil</Text>
            <Switch
              value={overview.hideAllOnProfile}
              onValueChange={(v) => hideAllMutation.mutate(v)}
              disabled={hideAllMutation.isPending}
              trackColor={{ true: Colors.light.primary }}
            />
          </View>

          <Text style={styles.sectionLabel}>Obtenus ({overview.earned.length})</Text>
          {overview.earned.length === 0 && (
            <Text style={styles.hint}>Explore des activités pour débloquer tes premiers badges.</Text>
          )}
          {overview.earned.map((b) => (
            <BadgeCard
              key={b.id}
              badge={b}
              onToggleDisplay={async (show) => {
                try {
                  await setDisplayOnProfile({
                    badgeId: b.id,
                    displayOnProfile: show,
                  });
                } catch (err) {
                  logError('Badges.toggle', err);
                }
              }}
            />
          ))}

          <Text style={[styles.sectionLabel, { marginTop: Spacing.lg }]}>
            À découvrir ({overview.available.length})
          </Text>
          {overview.available.map((b) => (
            <BadgeCard key={b.id} badge={b} />
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.light.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: Colors.light.text },
  scroll: { padding: Spacing.md, paddingBottom: 40 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  msg: { textAlign: 'center', marginTop: 40, color: Colors.light.muted },
  masterToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.light.surface,
    padding: Spacing.md,
    borderRadius: 12,
    marginBottom: Spacing.lg,
  },
  masterLabel: { flex: 1, fontSize: 14, color: Colors.light.text, marginRight: 12 },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.light.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Spacing.sm,
  },
  hint: { color: Colors.light.muted, marginBottom: Spacing.md, fontSize: 14 },
  card: {
    flexDirection: 'row',
    backgroundColor: Colors.light.surface,
    borderRadius: 14,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    gap: Spacing.md,
  },
  cardLocked: { opacity: 0.72 },
  cardIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.light.background,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  cardImage: { width: 56, height: 56 },
  cardBody: { flex: 1 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: Colors.light.text },
  cardDesc: { fontSize: 13, color: Colors.light.muted, marginTop: 4, lineHeight: 18 },
  cardDate: { fontSize: 11, color: Colors.light.muted, marginTop: 6 },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  toggleLabel: { fontSize: 13, color: Colors.light.text },
});
