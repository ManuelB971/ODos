import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { deleteFriendship, fetchFriendships, patchFriendship, sendFriendRequest } from '@/scripts/api';
import { useAuth } from '@/context/AuthContext';
import type { FriendshipItem } from '@/types';

export const FRIENDSHIPS_QUERY_KEY = ['friendships'] as const;

export function useFriendships(page = 1) {
  const { isAuthenticated } = useAuth();

  const query = useQuery({
    queryKey: [...FRIENDSHIPS_QUERY_KEY, page],
    queryFn: () => fetchFriendships(page),
    enabled: isAuthenticated,
    staleTime: 60_000,
  });

  const friends = (query.data?.member ?? []).filter((f) => f.status === 'accepted');
  const pending = (query.data?.member ?? []).filter((f) => f.status === 'pending');

  return { ...query, friends, pending };
}

export function useFriendshipMutations() {
  const queryClient = useQueryClient();

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: FRIENDSHIPS_QUERY_KEY });
    queryClient.invalidateQueries({ queryKey: ['socialUnreadCount'] });
  };

  const sendRequest = useMutation({
    mutationFn: (receiverId: number) => sendFriendRequest(receiverId),
    onMutate: async (receiverId) => {
      await queryClient.cancelQueries({ queryKey: FRIENDSHIPS_QUERY_KEY });
      const previous = queryClient.getQueriesData<{ member: FriendshipItem[] }>({ queryKey: FRIENDSHIPS_QUERY_KEY });
      queryClient.setQueriesData<{ member: FriendshipItem[] }>({ queryKey: FRIENDSHIPS_QUERY_KEY }, (old) => {
        if (!old) return old;
        const optimistic: FriendshipItem = {
          id: -receiverId,
          status: 'pending',
          isIncoming: false,
          otherUser: { id: receiverId, displayName: '…', avatarUrl: null },
          createdAt: new Date().toISOString(),
          acceptedAt: null,
        };
        return { ...old, member: [optimistic, ...old.member] };
      });
      return { previous };
    },
    onError: (_e, _v, ctx) => {
      ctx?.previous?.forEach(([key, data]) => queryClient.setQueryData(key, data));
    },
    onSettled: invalidate,
  });

  const acceptRequest = useMutation({
    mutationFn: (id: number) => patchFriendship(id, 'accepted'),
    onSettled: invalidate,
  });

  const declineRequest = useMutation({
    mutationFn: (id: number) => deleteFriendship(id),
    onSettled: invalidate,
  });

  return { sendRequest, acceptRequest, declineRequest };
}
