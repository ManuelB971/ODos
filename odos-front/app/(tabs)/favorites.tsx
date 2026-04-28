import React, { useCallback } from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Compass, Heart } from 'lucide-react-native';

import { useFavorites } from '@/hooks/useFavorites';
import { useAuth } from '@/context/AuthContext';
import { Colors, Fonts, Spacing } from '@/constants/theme';
import { toAppError } from '@/utils/errorHandling';
import { toggleFavoriteActivity } from '@/scripts/api';
import { FavoriteCard } from '@/components/FavoriteCard';
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
  const router = useRouter();
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuth();
  const { favorites, isLoading, error } = useFavorites();

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
            <Heart size={28} color={Colors.light.muted} />
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
            <Heart size={28} color={Colors.light.muted} />
          </View>
          <Text style={styles.emptyTitle}>Votre première étape commence ici</Text>
          <Text style={styles.emptySubtitle}>
            Aucun favori pour l&apos;instant. Explorez les activités et tapez
            le cœur pour les retrouver sur cette page.
          </Text>
          <Pressable style={styles.exploreBtn} onPress={() => router.push('/')}>
            <Compass size={16} color="#fff" />
            <Text style={styles.exploreBtnText}>Explorer les activités</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  // ── Grille normale ──
  return (
    <View style={styles.container}>
      <FlatList
        data={favorites}
        keyExtractor={(item) => String(item.id)}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.gridContent}
        ListHeaderComponent={<Header count={favorites.length} />}
        renderItem={({ item }) => (
          <FavoriteCard
            item={item}
            isFavorite
            isPending={toggleMutation.isPending}
            onPress={() => router.push(`/activity/${item.id}`)}
            onToggleFavorite={() => handleToggle(item.id)}
          />
        )}
      />
    </View>
  );
}

/**
 * Header éditorial de la page, avec compteur (ou rien quand non-authentifié / loading).
 */
function Header({ count }: { count: number | null }) {
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
    paddingTop: 28,
  },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: 16,
  },
  subtitleEyebrow: {
    fontSize: 11,
    letterSpacing: 2,
    color: Colors.light.muted,
    fontWeight: '700',
    marginBottom: 4,
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.light.text,
    fontFamily: Fonts?.serif,
  },
  countText: {
    marginTop: 6,
    fontSize: 13,
    color: Colors.light.muted,
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
    backgroundColor: Colors.light.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  emptyTitle: {
    fontSize: 19,
    fontWeight: '700',
    color: Colors.light.text,
    textAlign: 'center',
    fontFamily: Fonts?.serif,
  },
  emptySubtitle: {
    fontSize: 14,
    color: Colors.light.muted,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 320,
  },
  exploreBtn: {
    marginTop: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.light.accent,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 16,
  },
  exploreBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
});
