import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  fetchChatMessages,
  fetchConversations,
  markConversationRead,
  openConversation,
  sendChatMessage,
} from '@/scripts/api';
import { useAuth } from '@/context/AuthContext';
import { SOCIAL_UNREAD_QUERY_KEY } from '@/hooks/useSocialUnreadCount';
import type { ChatMessageItem, PaginatedMember } from '@/types';

export const CONVERSATIONS_QUERY_KEY = ['conversations'] as const;

function chatMessagesKey(conversationId: number) {
  return ['chatMessages', conversationId] as const;
}

export function useConversations(page = 1) {
  const { isAuthenticated, user } = useAuth();

  return useQuery({
    queryKey: [...CONVERSATIONS_QUERY_KEY, page],
    queryFn: () => fetchConversations(page),
    enabled: isAuthenticated && !!user?.socialConsentedAt,
    staleTime: 15_000,
    refetchInterval: 15_000,
  });
}

export function useChatMessages(conversationId: number) {
  const { isAuthenticated, user } = useAuth();

  return useQuery({
    queryKey: chatMessagesKey(conversationId),
    queryFn: () => fetchChatMessages(conversationId),
    enabled: isAuthenticated && !!user?.socialConsentedAt && conversationId > 0,
    staleTime: 1_500,
    refetchInterval: 3_500,
  });
}

export function useChatMutations() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: CONVERSATIONS_QUERY_KEY });
    queryClient.invalidateQueries({ queryKey: ['chatMessages'] });
    queryClient.invalidateQueries({ queryKey: SOCIAL_UNREAD_QUERY_KEY });
  };

  const startConversation = useMutation({
    mutationFn: (userId: number) => openConversation(userId),
    onSuccess: invalidate,
  });

  const sendMessage = useMutation({
    mutationFn: ({ conversationId, content }: { conversationId: number; content: string }) =>
      sendChatMessage(conversationId, content),
    onMutate: async ({ conversationId, content }) => {
      const key = chatMessagesKey(conversationId);
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<PaginatedMember<ChatMessageItem>>(key);
      const optimistic: ChatMessageItem = {
        id: -Date.now(),
        content,
        author: user
          ? { id: user.id, displayName: user.displayName ?? '…', avatarUrl: user.avatarUrl ?? null }
          : null,
        conversationId,
        isMine: true,
        readAt: null,
        createdAt: new Date().toISOString(),
      };
      queryClient.setQueryData<PaginatedMember<ChatMessageItem>>(key, (old) =>
        old ? { ...old, member: [...old.member, optimistic] } : old,
      );
      return { previous, conversationId };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.previous) {
        queryClient.setQueryData(chatMessagesKey(ctx.conversationId), ctx.previous);
      }
    },
    onSettled: (_d, _e, { conversationId }) => {
      queryClient.invalidateQueries({ queryKey: chatMessagesKey(conversationId) });
      queryClient.invalidateQueries({ queryKey: CONVERSATIONS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: SOCIAL_UNREAD_QUERY_KEY });
    },
  });

  const markRead = useMutation({
    mutationFn: (conversationId: number) => markConversationRead(conversationId),
    onSuccess: invalidate,
  });

  return { startConversation, sendMessage, markRead };
}
