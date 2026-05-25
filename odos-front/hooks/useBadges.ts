import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchMyBadges, patchBadgeDisplay, markBadgeSeen } from '@/scripts/api';
import { useAuth } from '@/context/AuthContext';
import type { BadgesOverview } from '@/types';

export const BADGES_QUERY_KEY = ['myBadges'] as const;

export function useBadges() {
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery<BadgesOverview>({
    queryKey: BADGES_QUERY_KEY,
    queryFn: fetchMyBadges,
    enabled: isAuthenticated,
    staleTime: 1000 * 60,
  });

  const displayMutation = useMutation({
    mutationFn: ({
      badgeId,
      displayOnProfile,
      displayOrder,
    }: {
      badgeId: number;
      displayOnProfile: boolean;
      displayOrder?: number | null;
    }) => patchBadgeDisplay(badgeId, displayOnProfile, displayOrder),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: BADGES_QUERY_KEY }),
  });

  const seenMutation = useMutation({
    mutationFn: (badgeId: number) => markBadgeSeen(badgeId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: BADGES_QUERY_KEY }),
  });

  return {
    overview: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
    setDisplayOnProfile: displayMutation.mutateAsync,
    markSeen: seenMutation.mutateAsync,
  };
}
