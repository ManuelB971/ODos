import { useQuery } from '@tanstack/react-query';

import { fetchRecommendations } from '@/scripts/api';
import { useAuth } from '@/context/AuthContext';
import { ApiActivity } from '@/types';
import { toAppError } from '@/utils/errorHandling';

/**
 * Recommandations personnalisées pour l'utilisateur courant.
 *
 * La `queryKey` intègre explicitement `user.id` (en plus des intérêts) pour
 * que deux comptes ne partagent jamais le même cache local — un A→B→A doit
 * toujours renvoyer la reco de l'utilisateur concerné, même si la liste
 * d'intérêts a exactement la même empreinte textuelle.
 *
 * Côté serveur, `/api/recommendations` est basé sur `Security::getUser()`
 * donc l'argument `interests` ici ne sert qu'à invalider le cache client ;
 * le backend ne fait jamais confiance à cette liste.
 */
export const useRecommendations = (interests: string[]) => {
  const { user } = useAuth();
  const userKey = user?.id ?? 'anon';

  const query = useQuery<ApiActivity[]>({
    queryKey: ['recommendations', userKey, interests],
    queryFn: fetchRecommendations,
    enabled: !!user && interests.length > 0,
    staleTime: 1000 * 60 * 2,
    retry: 1,
  });

  return {
    recommendations: interests.length > 0 ? (query.data ?? []) : [],
    loading: query.isLoading,
    error: query.error ? toAppError(query.error, 'Impossible de charger les recommandations.').userMessage : null,
    refresh: query.refetch,
  };
};
