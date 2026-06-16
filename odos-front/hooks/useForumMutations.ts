import { useMutation, useQueryClient } from '@tanstack/react-query';

import { createForumReply, createForumThread, setForumReplyLike } from '@/scripts/api';
import { logError } from '@/utils/errorHandling';
import type { ForumReplyItem, PaginatedMember } from '@/types';

function repliesKey(threadId: number) {
  return ['forumReplies', threadId] as const;
}

/**
 * Mutations d'écriture du forum (création de sujet, réponse, like).
 *
 * Le backend ([ForumThreadController], [ForumReplyController]) exposait déjà ces
 * actions ; ce hook les câble côté app. Le like est optimiste pour rester
 * instantané (Emil : pas d'attente sur une action haute-fréquence).
 */
export function useForumMutations() {
  const queryClient = useQueryClient();

  const createThread = useMutation({
    mutationFn: (payload: { title: string; content: string; categoryId?: number; activityId?: number; groupId?: number }) =>
      createForumThread(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['forumThreads'] });
    },
    onError: (err) => logError('useForumMutations.createThread', err),
  });

  const createReply = useMutation({
    mutationFn: ({ threadId, content }: { threadId: number; content: string }) =>
      createForumReply(threadId, content),
    onSuccess: (_data, { threadId }) => {
      queryClient.invalidateQueries({ queryKey: repliesKey(threadId) });
      queryClient.invalidateQueries({ queryKey: ['forumThread', threadId] });
      queryClient.invalidateQueries({ queryKey: ['forumThreads'] });
    },
    onError: (err) => logError('useForumMutations.createReply', err),
  });

  const toggleLike = useMutation({
    mutationFn: ({ reply }: { reply: ForumReplyItem }) =>
      setForumReplyLike(reply.id, !reply.likedByMe),
    onMutate: async ({ reply }) => {
      const key = repliesKey(reply.threadId);
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<PaginatedMember<ForumReplyItem>>(key);
      queryClient.setQueryData<PaginatedMember<ForumReplyItem>>(key, (old) =>
        old
          ? {
              ...old,
              member: old.member.map((r) =>
                r.id === reply.id
                  ? { ...r, likedByMe: !r.likedByMe, likeCount: r.likeCount + (r.likedByMe ? -1 : 1) }
                  : r,
              ),
            }
          : old,
      );
      return { previous, key };
    },
    onError: (err, _vars, ctx) => {
      logError('useForumMutations.toggleLike', err);
      if (ctx?.previous) queryClient.setQueryData(ctx.key, ctx.previous);
    },
    onSettled: (_data, _err, { reply }) => {
      queryClient.invalidateQueries({ queryKey: repliesKey(reply.threadId) });
    },
  });

  return { createThread, createReply, toggleLike };
}
