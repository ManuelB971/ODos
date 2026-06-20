import { useCallback, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { fetchFavoriteIds, toggleFavoriteActivity } from '@/scripts/api';
import { useAuth } from '@/context/AuthContext';
import { logError } from '@/utils/errorHandling';

const FAVORITE_IDS_KEY = ['favoriteIds'] as const;

/**
 * Toggle favori centralisé pour les **listes de cartes** (Accueil, Recherche,
 * Favoris, Reco). Source de vérité partagée avec la fiche activité via la clé
 * `['favoriteIds']` : un cœur basculé sur une carte se reflète partout.
 *
 * La fiche activité garde sa propre mutation (déblocage de badges contextuel) ;
 * ici on reste volontairement minimal (toggle + invalidations).
 */
export function useFavoriteToggle() {
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();

  const favoriteIdsQuery = useQuery<number[]>({
    queryKey: FAVORITE_IDS_KEY,
    queryFn: fetchFavoriteIds,
    enabled: isAuthenticated,
    staleTime: 1000 * 60 * 2,
    gcTime: 1000 * 60 * 10,
    retry: 1,
  });

  const favoriteIds = useMemo(() => favoriteIdsQuery.data ?? [], [favoriteIdsQuery.data]);

  const mutation = useMutation({
    mutationFn: ({ activityId, currentlyFavorite }: { activityId: number; currentlyFavorite: boolean }) =>
      toggleFavoriteActivity(activityId, currentlyFavorite),
    onMutate: async ({ activityId, currentlyFavorite }) => {
      await queryClient.cancelQueries({ queryKey: FAVORITE_IDS_KEY });
      const previous = queryClient.getQueryData<number[]>(FAVORITE_IDS_KEY);
      queryClient.setQueryData<number[]>(FAVORITE_IDS_KEY, (old) => {
        const list = old ?? [];
        if (currentlyFavorite) return list.filter((i) => i !== activityId);
        return list.includes(activityId) ? list : [...list, activityId];
      });
      return { previous };
    },
    onError: (err, _vars, context) => {
      if (context?.previous !== undefined) {
        queryClient.setQueryData(FAVORITE_IDS_KEY, context.previous);
      }
      logError('useFavoriteToggle', err);
    },
    onSettled: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: FAVORITE_IDS_KEY }),
        queryClient.invalidateQueries({ queryKey: ['recommendations'] }),
      ]);
    },
  });

  const isFavorite = useCallback((activityId: number) => favoriteIds.includes(activityId), [favoriteIds]);

  const toggleFavorite = useCallback(
    (activityId: number) => {
      if (!isAuthenticated) return;
      mutation.mutate({ activityId, currentlyFavorite: favoriteIds.includes(activityId) });
    },
    [favoriteIds, isAuthenticated, mutation],
  );

  return { favoriteIds, isFavorite, toggleFavorite, canFavorite: isAuthenticated, isPending: mutation.isPending };
}
