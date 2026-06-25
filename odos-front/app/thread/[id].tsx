import { useState } from 'react';
import {
  Animated,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Send, MessagesSquare } from 'lucide-react-native';
import { useHeaderHeight } from '@react-navigation/elements';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { fetchForumReplies, fetchForumThread } from '@/scripts/api';
import { useAuth } from '@/context/AuthContext';
import { useOdosColors } from '@/context/ThemeContext';
import { FontFamily } from '@/constants/theme';
import { ReplyItem } from '@/components/forum/ReplyItem';
import { ReportContentModal } from '@/components/social/ReportContentModal';
import { useForumReport } from '@/hooks/useForumReport';
import { useForumMutations } from '@/hooks/useForumMutations';
import type { ForumReportReason } from '@/types';
import { PopSurface } from '@/components/pop/PopSurface';
import { PopEmptyState } from '@/components/pop/PopEmptyState';
import { useIsMosaicPop, usePopTokens } from '@/components/pop/usePop';
import { useKeyboardComposerMotion } from '@/hooks/useKeyboardComposerMotion';

export default function ThreadDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const threadId = Number(id);
  const colors = useOdosColors();
  const isMosaicPop = useIsMosaicPop();
  const pop = usePopTokens();
  const headerHeight = useHeaderHeight();
  const insets = useSafeAreaInsets();
  const { animatedStyle: composerAnimatedStyle } = useKeyboardComposerMotion();
  const { user } = useAuth();
  const [reportReplyId, setReportReplyId] = useState<number | null>(null);
  const [reportThreadOpen, setReportThreadOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const { reportThread, reportReply } = useForumReport();
  const { createReply, toggleLike } = useForumMutations();

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

  const onSendReply = () => {
    const content = draft.trim();
    if (!content || createReply.isPending) return;
    setDraft('');
    createReply.mutate({ threadId, content });
  };

  const canSend = draft.trim().length > 0;
  const ink = isMosaicPop ? pop.ink : colors.text;

  const header = thread ? (
    isMosaicPop ? (
      <PopSurface shadow={6} radius={12} style={styles.popHeaderWrap} contentStyle={styles.popHeader}>
        <Text style={[styles.title, { color: pop.ink, fontFamily: FontFamily.display }]}>{thread.title}</Text>
        <Text style={[styles.body, { color: pop.ink, fontFamily: FontFamily.ui }]}>{thread.content}</Text>
        <Pressable onPress={() => setReportThreadOpen(true)}>
          <Text style={[styles.report, { color: pop.muted, fontFamily: FontFamily.ui }]}>Signaler ce fil</Text>
        </Pressable>
      </PopSurface>
    ) : (
      <View style={[styles.headerCard, { borderBottomColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.text, fontFamily: FontFamily.display }]}>{thread.title}</Text>
        <Text style={[styles.body, { color: colors.text, fontFamily: FontFamily.ui }]}>{thread.content}</Text>
        <Pressable onPress={() => setReportThreadOpen(true)}>
          <Text style={[styles.report, { color: colors.muted, fontFamily: FontFamily.ui }]}>Signaler ce fil</Text>
        </Pressable>
      </View>
    )
  ) : null;

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: isMosaicPop ? pop.paper : colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={headerHeight}
    >
      <Stack.Screen options={{ title: 'Discussion', headerShown: true, headerBackTitle: 'Retour' }} />
      <FlatList
        data={replies}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={[styles.list, { paddingBottom: 92 + Math.max(insets.bottom, 8) }]}
        keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
        ListHeaderComponent={header}
        refreshing={repliesQuery.isRefetching}
        onRefresh={() => repliesQuery.refetch()}
        ListEmptyComponent={
          repliesQuery.isLoading ? null : (
            <PopEmptyState
              icon={<MessagesSquare size={28} color={isMosaicPop ? pop.ink : colors.onAccent} />}
              title="Aucune réponse"
              subtitle="Soyez le premier à répondre à ce sujet."
            />
          )
        }
        renderItem={({ item }) => {
          const isOwn = item.author?.id === user?.id;
          return (
            <ReplyItem
              reply={item}
              onToggleLike={isOwn ? undefined : () => toggleLike.mutate({ reply: item })}
              liking={toggleLike.isPending && toggleLike.variables?.reply.id === item.id}
              onReport={isOwn ? undefined : () => setReportReplyId(item.id)}
            />
          );
        }}
      />

      {thread?.isLocked ? (
        <View style={[styles.lockedBar, { borderTopColor: colors.border, backgroundColor: colors.surface }]}>
          <Text style={{ color: colors.muted, fontFamily: FontFamily.ui, fontSize: 13 }}>
            🔒 Ce fil est verrouillé.
          </Text>
        </View>
      ) : (
        <Animated.View style={composerAnimatedStyle}>
        <View
          style={[
            styles.composer,
            { borderTopColor: colors.border, backgroundColor: colors.surface },
            isMosaicPop && { borderTopWidth: 2.5, borderTopColor: pop.ink, backgroundColor: pop.paper },
            { paddingBottom: Math.max(insets.bottom, 8) },
          ]}
        >
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder="Votre réponse…"
            placeholderTextColor={colors.muted}
            multiline
            style={[
              styles.input,
              { color: ink, fontFamily: FontFamily.ui },
              isMosaicPop && { borderWidth: 2, borderColor: pop.ink, backgroundColor: pop.background },
            ]}
          />
          <Pressable
            onPress={onSendReply}
            disabled={!canSend || createReply.isPending}
            accessibilityRole="button"
            accessibilityLabel="Envoyer la réponse"
            style={({ pressed }) => [
              styles.send,
              { backgroundColor: colors.accent, opacity: canSend && !createReply.isPending ? 1 : 0.5 },
              isMosaicPop && { backgroundColor: pop.orange, borderWidth: 2, borderColor: pop.ink, borderRadius: 100 },
              pressed && canSend && !createReply.isPending && styles.composerPressed,
            ]}
          >
            <Send size={18} color={isMosaicPop ? pop.ink : colors.onAccent} />
          </Pressable>
        </View>
        </Animated.View>
      )}

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
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerCard: { padding: 20, borderBottomWidth: 1, gap: 12, marginBottom: 4 },
  popHeaderWrap: { margin: 16 },
  popHeader: { padding: 16, gap: 10 },
  title: { fontSize: 22 },
  body: { fontSize: 15, lineHeight: 22 },
  report: { fontSize: 12, marginTop: 4 },
  list: { padding: 16, gap: 10, flexGrow: 1 },
  composer: { flexDirection: 'row', gap: 8, paddingHorizontal: 12, paddingTop: 12, borderTopWidth: 1, alignItems: 'flex-end' },
  input: { flex: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, maxHeight: 120, textAlignVertical: 'top' },
  send: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  composerPressed: { transform: [{ scale: 0.97 }] },
  lockedBar: { padding: 16, borderTopWidth: 1, alignItems: 'center' },
});
