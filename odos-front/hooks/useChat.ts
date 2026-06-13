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

export const CONVERSATIONS_QUERY_KEY = ['conversations'] as const;

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
    queryKey: ['chatMessages', conversationId],
    queryFn: () => fetchChatMessages(conversationId),
    enabled: isAuthenticated && !!user?.socialConsentedAt && conversationId > 0,
    staleTime: 5_000,
    refetchInterval: 10_000,
  });
}

export function useChatMutations() {
  const queryClient = useQueryClient();

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
    onSuccess: invalidate,
  });

  const markRead = useMutation({
    mutationFn: (conversationId: number) => markConversationRead(conversationId),
    onSuccess: invalidate,
  });

  return { startConversation, sendMessage, markRead };
}
