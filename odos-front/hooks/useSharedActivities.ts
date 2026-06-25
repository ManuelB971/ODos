import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchSharedActivities, markSharedActivitySeen } from '@/scripts/api';
import { useAuth } from '@/context/AuthContext';
import { SOCIAL_UNREAD_QUERY_KEY } from '@/hooks/useSocialUnreadCount';

export function useSharedActivities(page = 1) {
  const { isAuthenticated } = useAuth();

  return useQuery({
    queryKey: ['sharedActivities', page],
    queryFn: () => fetchSharedActivities(page),
    enabled: isAuthenticated,
    staleTime: 60_000,
  });
}

export function useSharedActivitiesMutations() {
  const queryClient = useQueryClient();

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['sharedActivities'] });
    queryClient.invalidateQueries({ queryKey: SOCIAL_UNREAD_QUERY_KEY });
  };

  const markSeen = useMutation({
    mutationFn: (id: number) => markSharedActivitySeen(id),
    onSettled: invalidate,
  });

  return { markSeen };
}
