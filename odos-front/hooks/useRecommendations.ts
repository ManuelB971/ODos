import { useQuery } from '@tanstack/react-query';
import { fetchRecommendations } from '@/scripts/api';
import { ApiActivity } from '@/types';
import { toAppError } from '@/utils/errorHandling';

export const useRecommendations = (interests: string[]) => {
  const query = useQuery<ApiActivity[]>({
    queryKey: ['recommendations', interests],
    queryFn: fetchRecommendations,
    enabled: interests.length > 0,
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
