import React, { useCallback, useMemo, useState } from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Compass, Heart, LayoutGrid, List } from 'lucide-react-native';

import { useFavorites } from '@/hooks/useFavorites';
import { useResponsive } from '@/hooks/useResponsive';
import { useAuth } from '@/context/AuthContext';
import { Fonts, FontFamily, Spacing } from '@/constants/theme';
import { useOdosColors, useTheme, type OdosColorPalette } from '@/context/ThemeContext';
import { toAppError } from '@/utils/errorHandling';
import { toggleFavoriteActivity } from '@/scripts/api';
import { FavoriteCard } from '@/components/FavoriteCard';
import { MosaicPopCard, MosaicPopRow } from '@/components/cards/MosaicPopCard';
import { SkeletonFavoriteCard } from '@/components/ui/Skeleton';
import { CTAButton } from '@/components/ui/CTAButton';

/**
 * Écran "Mes favoris".
 *
 * - Grille 2 colonnes de `<FavoriteCard>`.
 * - Toggle favori via mutation react-query + optimistic update : on retire
 *   visuellement la card dès le clic (rollback automatique en cas d'erreur API).
 * - Skeletons pendant le chargement initial.
 * - État vide éditorial (titre serif, sous-texte, CTA vers la découverte).
 */
export default function FavoritesScreen() {
  const colors = useOdosColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const router = useRouter();
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuth();
  const { cardStyle } = useTheme();
  const { favorites, isLoading, error, refetch } = useFavorites();
  // Colonnes adaptées à la largeur (2 phone / 3 tablette / 4-5 desktop) : évite
  // les cartes géantes sur web. Mode "liste" (1 col, lignes compactes) pour voir
  // un maximum de favoris d'un coup. Voir docs/AUDIT_RESPONSIVE_WEB.md.
  const { gridColumns } = useResponsive();
  const [dense, setDense] = useState(false);
  const numColumns = dense ? 1 : gridColumns;

  const errorMessage = error
    ? toAppError(error, 'Impossible de charger vos favoris.').userMessage
    : null;

  const toggleMutation = useMutation({
    mutationFn: ({ activityId, currentlyFavorite }: { activityId: number; currentlyFavorite: boolean }) =>
      toggleFavoriteActivity(activityId, currentlyFavorite),
    onMutate: async ({ activityId, currentlyFavorite }) => {
      await queryClient.cancelQueries({ queryKey: ['favoriteIds'] });
      const previous = queryClient.getQueryData<number[]>(['favoriteIds']);
      queryClient.setQueryData<number[]>(['favoriteIds'], (old) => {
        const list = old ?? [];
        if (currentlyFavorite) return list.filter((i) => i !== activityId);
        return list.includes(activityId) ? list : [...list, activityId];
      });
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous !== undefined) {
        queryClient.setQueryData(['favoriteIds'], ctx.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['favoriteIds'] });
    },
  });

  const handleToggle = useCallback(
    (activityId: number) => {
      toggleMutation.mutate({ activityId, currentlyFavorite: true });
    },
    [toggleMutation]
  );

  // ── Non authentifié ──
  if (!isAuthenticated) {
    return (
      <View style={styles.container}>
        <Header count={null} />
        <View style={styles.emptyState}>
          <View style={styles.emptyIconWrap}>
            <Heart size={28} color={colors.muted} />
          </View>
          <Text style={styles.emptyTitle}>Connectez-vous pour commencer</Text>
          <Text style={styles.emptySubtitle}>
            Vos lieux favoris vous suivent d&apos;un appareil à l&apos;autre.
          </Text>
          <CTAButton
            label="Se connecter"
            onPress={() => router.push('/login')}
            size="md"
            style={{ marginTop: 18 }}
          />
        </View>
      </View>
    );
  }

  // ── Loading initial : grille de skeletons ──
  if (isLoading) {
    return (
      <View style={styles.container}>
        <Header count={null} />
        <View style={styles.gridPad}>
          <View style={styles.row}>
            <SkeletonFavoriteCard />
            <SkeletonFavoriteCard />
          </View>
          <View style={styles.row}>
            <SkeletonFavoriteCard />
            <SkeletonFavoriteCard />
          </View>
        </View>
      </View>
    );
  }

  // ── Erreur ──
  if (errorMessage) {
    return (
      <View style={styles.container}>
        <Header count={null} />
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>Une erreur est survenue</Text>
          <Text style={styles.emptySubtitle}>{errorMessage}</Text>
          <CTAButton label="Réessayer" variant="secondary" onPress={() => refetch()} style={styles.retryBtn} />
        </View>
      </View>
    );
  }

  // ── Liste vide ──
  if (favorites.length === 0) {
    return (
      <View style={styles.container}>
        <Header count={0} />
        <View style={styles.emptyState}>
          <View style={styles.emptyIconWrap}>
            <Heart size={28} color={colors.muted} />
          </View>
          <Text style={[styles.emptyTitle, styles.emptyTitleWarm]}>Votre première étape commence ici</Text>
          <Text style={styles.emptySubtitle}>
            Aucun favori pour l&apos;instant. Explorez les activités et tapez
            le cœur pour les retrouver sur cette page.
          </Text>
          <CTAButton
            label="Explorer les activités"
            onPress={() => router.push('/')}
            leftIcon={<Compass size={16} color={colors.onAccent} />}
            style={styles.retryBtn}
          />
        </View>
      </View>
    );
  }

  // ── Grille normale ──
  return (
    <View style={styles.container}>
      <FlatList
        data={favorites}
        // `key` force le remount quand le nb de colonnes change (exigence FlatList).
        key={`fav-${dense ? 'list' : numColumns}`}
        keyExtractor={(item) => String(item.id)}
        numColumns={numColumns}
        columnWrapperStyle={numColumns > 1 ? styles.row : undefined}
        contentContainerStyle={styles.gridContent}
        ListHeaderComponent={
          <>
            <Header count={favorites.length} />
            <DensityToggle dense={dense} onChange={setDense} />
          </>
        }
        renderItem={({ item }) =>
          dense ? (
            <MosaicPopRow item={item} />
          ) : cardStyle === 'mosaicPop' ? (
            <MosaicPopCard
              item={item}
              variant="grid"
              isFavorite
              onToggleFavorite={() => handleToggle(item.id)}
            />
          ) : (
            <FavoriteCard
              item={item}
              isFavorite
              isPending={toggleMutation.isPending}
              onPress={() => router.push(`/activity/${item.id}`)}
              onToggleFavorite={() => handleToggle(item.id)}
            />
          )
        }
      />
    </View>
  );
}

/** Bascule grille (cartes) ↔ liste (lignes compactes, plus dense). */
function DensityToggle({ dense, onChange }: { dense: boolean; onChange: (v: boolean) => void }) {
  const colors = useOdosColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <View style={styles.densityRow}>
      <Pressable
        onPress={() => onChange(false)}
        style={[styles.densityBtn, !dense && styles.densityBtnActive]}
        accessibilityRole="button"
        accessibilityLabel="Affichage en grille"
      >
        <LayoutGrid size={16} color={!dense ? colors.onAccent : colors.muted} />
      </Pressable>
      <Pressable
        onPress={() => onChange(true)}
        style={[styles.densityBtn, dense && styles.densityBtnActive]}
        accessibilityRole="button"
        accessibilityLabel="Affichage en liste"
      >
        <List size={16} color={dense ? colors.onAccent : colors.muted} />
      </Pressable>
    </View>
  );
}

/**
 * Header éditorial de la page, avec compteur (ou rien quand non-authentifié / loading).
 */
function Header({ count }: { count: number | null }) {
  const colors = useOdosColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <View style={styles.header}>
      <Text style={styles.subtitleEyebrow}>MA COLLECTION</Text>
      <Text style={styles.pageTitle}>Mes favoris</Text>
      {typeof count === 'number' ? (
        <Text style={styles.countText}>
          {count} lieu{count > 1 ? 'x' : ''} sauvegardé{count > 1 ? 's' : ''}
        </Text>
      ) : null}
    </View>
  );
}

function createStyles(colors: OdosColorPalette) {
  return StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingTop: 28,
  },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: 16,
  },
  subtitleEyebrow: {
    fontSize: 11,
    letterSpacing: 2,
    color: colors.muted,
    fontWeight: '700',
    marginBottom: 4,
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.text,
    fontFamily: Fonts?.serif,
  },
  countText: {
    marginTop: 6,
    fontSize: 13,
    color: colors.muted,
  },
  gridPad: {
    paddingHorizontal: Spacing.lg,
  },
  gridContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: 100,
  },
  row: {
    gap: 14,
  },
  densityRow: {
    flexDirection: 'row',
    alignSelf: 'flex-end',
    gap: 6,
    paddingHorizontal: Spacing.lg,
    marginBottom: 12,
  },
  densityBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  densityBtnActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingTop: 40,
    gap: 10,
  },
  emptyIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  emptyTitle: {
    fontSize: 19,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    fontFamily: Fonts?.serif,
  },
  emptyTitleWarm: {
    fontFamily: FontFamily.accent,
    fontWeight: '400',
  },
  emptySubtitle: {
    fontSize: 14,
    color: colors.muted,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 320,
  },
  retryBtn: {
    marginTop: 18,
    minWidth: 200,
  },
});
}
