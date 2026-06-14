import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchGroupMessages, markGroupMessagesRead, sendGroupMessage } from '@/scripts/api';
import { useAuth } from '@/context/AuthContext';
import { SOCIAL_UNREAD_QUERY_KEY } from '@/hooks/useSocialUnreadCount';
import { GROUPS_QUERY_KEY } from '@/hooks/useGroups';
import type { GroupMessageItem, PaginatedMember } from '@/types';

export function groupMessagesKey(groupId: number) {
  return ['groupMessages', groupId] as const;
}

export function useGroupMessages(groupId: number) {
  const { isAuthenticated, user } = useAuth();

  return useQuery({
    queryKey: groupMessagesKey(groupId),
    queryFn: () => fetchGroupMessages(groupId),
    enabled: isAuthenticated && !!user?.socialConsentedAt && groupId > 0,
    staleTime: 1_500,
    refetchInterval: 3_500,
  });
}

export function useGroupChatMutations(groupId: number) {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const send = useMutation({
    mutationFn: (content: string) => sendGroupMessage(groupId, content),
    onMutate: async (content: string) => {
      const key = groupMessagesKey(groupId);
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<PaginatedMember<GroupMessageItem>>(key);
      const optimistic: GroupMessageItem = {
        id: -Date.now(),
        content,
        author: user
          ? { id: user.id, displayName: user.displayName ?? '…', avatarUrl: user.avatarUrl ?? null }
          : null,
        groupId,
        isMine: true,
        createdAt: new Date().toISOString(),
      };
      queryClient.setQueryData<PaginatedMember<GroupMessageItem>>(key, (old) =>
        old ? { ...old, member: [...old.member, optimistic] } : old,
      );
      return { previous };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.previous) {
        queryClient.setQueryData(groupMessagesKey(groupId), ctx.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: groupMessagesKey(groupId) });
    },
  });

  const markRead = useMutation({
    mutationFn: () => markGroupMessagesRead(groupId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: GROUPS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: SOCIAL_UNREAD_QUERY_KEY });
    },
  });

  return { send, markRead };
}
