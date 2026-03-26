import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchFavoriteIds } from '@/scripts/api';
import { useActivities } from '@/hooks/useActivities';
import { useAuth } from '@/context/AuthContext';

export function useFavorites() {
  const { isAuthenticated } = useAuth();
  const activitiesQuery = useActivities();
  const favoriteIdsQuery = useQuery<number[]>({
    queryKey: ['favoriteIds'],
    queryFn: fetchFavoriteIds,
    enabled: isAuthenticated,
    staleTime: 1000 * 60 * 2,
    gcTime: 1000 * 60 * 10,
    retry: 1,
  });

  const favorites = useMemo(() => {
    const activities = activitiesQuery.data ?? [];
    const favoriteIds = favoriteIdsQuery.data ?? [];
    return activities.filter((a) => favoriteIds.includes(a.id));
  }, [activitiesQuery.data, favoriteIdsQuery.data]);

  return {
    favorites,
    isLoading: activitiesQuery.isLoading || favoriteIdsQuery.isLoading,
    isError: activitiesQuery.isError || favoriteIdsQuery.isError,
    error: activitiesQuery.error ?? favoriteIdsQuery.error ?? null,
    refetch: async () => {
      await Promise.all([activitiesQuery.refetch(), favoriteIdsQuery.refetch()]);
    },
  };
}
