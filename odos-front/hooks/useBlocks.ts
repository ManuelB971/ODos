import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { blockUser, fetchBlockedUsers, unblockUser } from '@/scripts/api';
import { useAuth } from '@/context/AuthContext';
import { FRIENDSHIPS_QUERY_KEY } from '@/hooks/useFriendships';
import { CONVERSATIONS_QUERY_KEY } from '@/hooks/useChat';
import { USER_SEARCH_QUERY_KEY } from '@/hooks/useUserSearch';
import { SOCIAL_UNREAD_QUERY_KEY } from '@/hooks/useSocialUnreadCount';

export const BLOCKED_USERS_QUERY_KEY = ['blockedUsers'] as const;

export function useBlockedUsers(page = 1) {
  const { isAuthenticated, user } = useAuth();

  return useQuery({
    queryKey: [...BLOCKED_USERS_QUERY_KEY, page],
    queryFn: () => fetchBlockedUsers(page),
    enabled: isAuthenticated && !!user?.socialConsentedAt,
    staleTime: 30_000,
  });
}

export function useBlockMutations() {
  const queryClient = useQueryClient();

  const invalidate = (userId: number) => {
    queryClient.invalidateQueries({ queryKey: BLOCKED_USERS_QUERY_KEY });
    queryClient.invalidateQueries({ queryKey: FRIENDSHIPS_QUERY_KEY });
    queryClient.invalidateQueries({ queryKey: CONVERSATIONS_QUERY_KEY });
    queryClient.invalidateQueries({ queryKey: USER_SEARCH_QUERY_KEY });
    queryClient.invalidateQueries({ queryKey: SOCIAL_UNREAD_QUERY_KEY });
    queryClient.invalidateQueries({ queryKey: ['publicProfile', userId] });
  };

  const block = useMutation({
    mutationFn: (userId: number) => blockUser(userId),
    onSuccess: (_data, userId) => invalidate(userId),
  });

  const unblock = useMutation({
    mutationFn: (userId: number) => unblockUser(userId),
    onSuccess: (_data, userId) => invalidate(userId),
  });

  return { block, unblock };
}
