import { useQuery } from '@tanstack/react-query';
import { fetchActivities } from '@/scripts/api';
import type { ApiActivity } from '@/types';

export function useActivities() {
  return useQuery<ApiActivity[]>({
    queryKey: ['activities'],
    queryFn: fetchActivities,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 15,
    retry: 2,
  });
}
