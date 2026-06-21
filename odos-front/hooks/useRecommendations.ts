import { useQuery } from '@tanstack/react-query';

import { fetchRecommendations } from '@/scripts/api';
import { useAuth } from '@/context/AuthContext';
import { ApiActivity } from '@/types';
import { toAppError } from '@/utils/errorHandling';

/**
 * Recommandations personnalisées pour l'utilisateur courant.
 *
 * La `queryKey` intègre explicitement `user.id`, les intérêts et la ville
 * sélectionnée pour que deux comptes ou deux villes ne partagent jamais le même cache.
 */
export const useRecommendations = (interests: string[], city: string | null) => {
  const { user } = useAuth();
  const userKey = user?.id ?? 'anon';
  const cityKey = city?.trim() || 'none';

  const query = useQuery<ApiActivity[]>({
    queryKey: ['recommendations', userKey, interests, cityKey],
    queryFn: () => fetchRecommendations(city),
    enabled: !!user && interests.length > 0 && !!city?.trim(),
    staleTime: 1000 * 60 * 2,
    retry: 1,
  });

  return {
    recommendations: interests.length > 0 && city?.trim() ? (query.data ?? []) : [],
    loading: query.isLoading,
    error: query.error ? toAppError(query.error, 'Impossible de charger les recommandations.').userMessage : null,
    refresh: query.refetch,
  };
};
