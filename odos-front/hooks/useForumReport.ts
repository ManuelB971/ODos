import { useMutation } from '@tanstack/react-query';
import { reportForumReply, reportForumThread } from '@/scripts/api';
import type { ForumReportReason } from '@/types';

export function useForumReport() {
  const reportThread = useMutation({
    mutationFn: ({ threadId, reason, details }: { threadId: number; reason: ForumReportReason; details?: string }) =>
      reportForumThread(threadId, reason, details),
  });

  const reportReply = useMutation({
    mutationFn: ({ replyId, reason, details }: { replyId: number; reason: ForumReportReason; details?: string }) =>
      reportForumReply(replyId, reason, details),
  });

  return { reportThread, reportReply };
}
