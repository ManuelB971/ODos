import { useQuery } from '@tanstack/react-query';
import { fetchSharedActivities } from '@/scripts/api';
import { useAuth } from '@/context/AuthContext';

export function useSharedActivities(page = 1) {
  const { isAuthenticated } = useAuth();

  return useQuery({
    queryKey: ['sharedActivities', page],
    queryFn: () => fetchSharedActivities(page),
    enabled: isAuthenticated,
    staleTime: 60_000,
  });
}
