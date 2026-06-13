import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { fetchForumReplies, fetchForumThread } from '@/scripts/api';
import { useOdosColors } from '@/context/ThemeContext';
import { FontFamily } from '@/constants/theme';
import { ReplyItem } from '@/components/forum/ReplyItem';
import { ReportContentModal } from '@/components/social/ReportContentModal';
import { useForumReport } from '@/hooks/useForumReport';
import { useState } from 'react';
import type { ForumReportReason } from '@/types';

export default function ThreadDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const threadId = Number(id);
  const colors = useOdosColors();
  const [reportReplyId, setReportReplyId] = useState<number | null>(null);
  const [reportThreadOpen, setReportThreadOpen] = useState(false);
  const { reportThread, reportReply } = useForumReport();

  const threadQuery = useQuery({
    queryKey: ['forumThread', threadId],
    queryFn: () => fetchForumThread(threadId),
    enabled: Number.isFinite(threadId),
  });

  const repliesQuery = useQuery({
    queryKey: ['forumReplies', threadId],
    queryFn: () => fetchForumReplies(threadId),
    enabled: Number.isFinite(threadId),
  });

  const thread = threadQuery.data?.thread;
  const replies = repliesQuery.data?.member ?? [];

  const submitThreadReport = (reason: ForumReportReason, details?: string) => {
    reportThread.mutate({ threadId, reason, details }, { onSuccess: () => setReportThreadOpen(false) });
  };

  const submitReplyReport = (reason: ForumReportReason, details?: string) => {
    if (null === reportReplyId) return;
    reportReply.mutate({ replyId: reportReplyId, reason, details }, { onSuccess: () => setReportReplyId(null) });
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {thread ? (
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <Text style={[styles.title, { color: colors.text, fontFamily: FontFamily.display }]}>
            {thread.title}
          </Text>
          <Text style={[styles.body, { color: colors.text, fontFamily: FontFamily.ui }]}>{thread.content}</Text>
          <Pressable onPress={() => setReportThreadOpen(true)}>
            <Text style={[styles.report, { color: colors.muted, fontFamily: FontFamily.ui }]}>Signaler ce fil</Text>
          </Pressable>
        </View>
      ) : null}
      <FlatList
        data={replies}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <ReplyItem reply={item} onReport={() => setReportReplyId(item.id)} />
        )}
      />
      <ReportContentModal
        visible={reportThreadOpen}
        onClose={() => setReportThreadOpen(false)}
        onSubmit={submitThreadReport}
        loading={reportThread.isPending}
      />
      <ReportContentModal
        visible={reportReplyId !== null}
        onClose={() => setReportReplyId(null)}
        onSubmit={submitReplyReport}
        loading={reportReply.isPending}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: 20, borderBottomWidth: 1, gap: 12 },
  title: { fontSize: 22 },
  body: { fontSize: 15, lineHeight: 22 },
  report: { fontSize: 12, marginTop: 4 },
  list: { padding: 16, gap: 10 },
});
