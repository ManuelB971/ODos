import { useMemo, useRef, useState } from 'react';
import {
  Animated,
  ActivityIndicator,
  Alert,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { Pencil, Trash2, Send, Flag } from 'lucide-react-native';
import { DaIcon } from '@/components/ui/DaIcon';
import * as Haptics from 'expo-haptics';
import { Spacing } from '@/constants/theme';
import { useOdosColors, type OdosColorPalette } from '@/context/ThemeContext';
import { Skeleton } from '@/components/ui/Skeleton';
import { CTAButton } from '@/components/ui/CTAButton';
import { InlineToast, InlineToastVariant } from '@/components/InlineToast';
import { UserLink } from '@/components/social/UserLink';
import { ReportContentModal } from '@/components/social/ReportContentModal';
import { useContentReport } from '@/hooks/useContentReport';
import { resolveImageUrl } from '@/utils/imageUrl';
import type { ActivityComment, User } from '@/types';

const MAX_LEN = 1000;

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "À l'instant";
  if (min < 60) return `Il y a ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `Il y a ${h} h`;
  const d = Math.floor(h / 24);
  return `Il y a ${d} j`;
}

function AuthorAvatar({ name, avatarUrl }: { name: string; avatarUrl?: string | null }) {
  const colors = useOdosColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const uri = resolveImageUrl(avatarUrl ?? null);
  const initials = name.slice(0, 2).toUpperCase();
  if (uri) {
    return <Image source={{ uri }} style={styles.avatar} contentFit="cover" />;
  }
  return (
    <View style={[styles.avatar, styles.avatarFallback]}>
      <Text style={styles.avatarInitials}>{initials}</Text>
    </View>
  );
}

export type ActivityCommentsSectionProps = {
  comments: ActivityComment[];
  loading: boolean;
  error: string | null;
  isAuthenticated: boolean;
  currentUser: User | null;
  commentDraft: string;
  onChangeDraft: (t: string) => void;
  editingCommentId: number | null;
  editingText: string;
  onChangeEditingText: (t: string) => void;
  onStartEdit: (c: ActivityComment) => void;
  onCancelEdit: () => void;
  onSaveEdit: (commentId: number, text: string) => void;
  onDelete: (commentId: number) => void;
  onPost: () => void;
  postPending: boolean;
  patchPending: boolean;
  deletePending: boolean;
  commentToast: {
    variant: InlineToastVariant;
    message: string;
    retryAfterSeconds?: number;
    retry?: () => void;
  } | null;
  onDismissToast: () => void;
  onLoginPress: () => void;
  onComposeFocus?: () => void;
};

export function ActivityCommentsSection({
  comments,
  loading,
  error,
  isAuthenticated,
  currentUser,
  commentDraft,
  onChangeDraft,
  editingCommentId,
  editingText,
  onChangeEditingText,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onDelete,
  onPost,
  postPending,
  patchPending,
  deletePending,
  commentToast,
  onDismissToast,
  onLoginPress,
  onComposeFocus,
}: ActivityCommentsSectionProps) {
  const colors = useOdosColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const draftLen = commentDraft.length;
  const { report } = useContentReport();
  const [reportCommentId, setReportCommentId] = useState<number | null>(null);
  const composeFocus = useRef(new Animated.Value(0)).current;

  const animateComposeFocus = (focused: boolean) => {
    Animated.timing(composeFocus, {
      toValue: focused ? 1 : 0,
      duration: 200,
      easing: Easing.bezier(0.2, 0.8, 0.2, 1),
      useNativeDriver: true,
    }).start();
  };

  const handlePost = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPost();
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.sectionTitleRow}>
        <DaIcon name="bulle-chat" variant="input" accessibilityLabel="Commentaires" />
        <Text style={styles.sectionTitle}>Commentaires</Text>
      </View>

      {commentToast && (
        <InlineToast
          variant={commentToast.variant}
          message={commentToast.message}
          countdownSeconds={commentToast.retryAfterSeconds}
          action={
            commentToast.retry
              ? { label: 'Réessayer', onPress: commentToast.retry, disabled: postPending }
              : undefined
          }
          onDismiss={onDismissToast}
        />
      )}

      {loading && (
        <View style={styles.skeletonList}>
          {[1, 2].map((k) => (
            <View key={k} style={styles.skeletonRow}>
              <Skeleton width={40} height={40} radius={20} />
              <View style={{ flex: 1, gap: 8 }}>
                <Skeleton width="40%" height={14} />
                <Skeleton width="90%" height={48} radius={12} />
              </View>
            </View>
          ))}
        </View>
      )}

      {error && <Text style={styles.warn}>{error}</Text>}

      {!loading && comments.length === 0 && !error && (
        <View style={styles.empty}>
          <Text style={styles.emptyEmoji}>🎉</Text>
          <Text style={styles.emptyTitle}>Sois le premier à réagir</Text>
          <Text style={styles.emptySub}>Partage ton ressenti sur cette expérience.</Text>
        </View>
      )}

      {!loading &&
        comments.map((c) => {
          const isMine =
            currentUser != null && c.author != null && c.author.id === currentUser.id;
          const authorName = c.author?.displayName ?? 'Voyageur';
          const isEditing = editingCommentId === c.id;

          return (
            <View
              key={c.id}
              style={[styles.bubbleRow, isMine ? styles.bubbleRowMine : styles.bubbleRowOther]}
            >
              {!isMine && (
                <UserLink userId={c.author?.id} name={authorName}>
                  <AuthorAvatar name={authorName} avatarUrl={c.author?.avatarUrl} />
                </UserLink>
              )}
              <View style={[styles.bubble, isMine ? styles.bubbleMine : styles.bubbleOther]}>
                {!isMine && (
                  <UserLink userId={c.author?.id} name={authorName}>
                    <Text style={styles.authorName}>{authorName}</Text>
                  </UserLink>
                )}
                {c.isHidden && (
                  <Text style={styles.hiddenTag}>Masqué (admin)</Text>
                )}
                {isEditing ? (
                  <>
                    <TextInput
                      style={styles.input}
                      value={editingText}
                      onChangeText={onChangeEditingText}
                      multiline
                      maxLength={MAX_LEN}
                    />
                    <View style={styles.actions}>
                      <Pressable onPress={() => onSaveEdit(c.id, editingText.trim())} disabled={patchPending}>
                        <Text style={styles.link}>Enregistrer</Text>
                      </Pressable>
                      <Pressable onPress={onCancelEdit}>
                        <Text style={styles.muted}>Annuler</Text>
                      </Pressable>
                    </View>
                  </>
                ) : (
                  <>
                    <Text style={[styles.body, isMine && styles.bodyMine]}>{c.content}</Text>
                    <Text style={[styles.time, isMine && styles.timeMine]}>
                      {relativeTime(c.createdAt)}
                      {c.isEdited ? ' · modifié' : ''}
                    </Text>
                    {!isMine && isAuthenticated && (
                      <View style={styles.actions}>
                        <Pressable
                          onPress={() => setReportCommentId(c.id)}
                          style={styles.actionBtn}
                          accessibilityRole="button"
                          accessibilityLabel={`Signaler le commentaire de ${authorName}`}
                        >
                          <Flag size={13} color={colors.muted} />
                        </Pressable>
                      </View>
                    )}
                    {isMine && (
                      <View style={styles.actions}>
                        <Pressable
                          onPress={() => onStartEdit(c)}
                          style={styles.actionBtn}
                          accessibilityLabel="Modifier"
                        >
                          <Pencil size={14} color={isMine ? '#fff' : colors.primary} />
                        </Pressable>
                        <Pressable
                          onPress={() =>
                            Alert.alert('Supprimer', 'Masquer ce commentaire ?', [
                              { text: 'Annuler', style: 'cancel' },
                              {
                                text: 'Supprimer',
                                style: 'destructive',
                                onPress: () => onDelete(c.id),
                              },
                            ])
                          }
                          style={styles.actionBtn}
                          disabled={deletePending}
                          accessibilityLabel="Supprimer"
                        >
                          <Trash2 size={14} color={isMine ? '#fff' : colors.danger} />
                        </Pressable>
                      </View>
                    )}
                  </>
                )}
              </View>
              {isMine && <AuthorAvatar name={authorName} avatarUrl={c.author?.avatarUrl} />}
            </View>
          );
        })}

      {isAuthenticated ? (
        <Animated.View
          style={[
            styles.compose,
            {
              transform: [
                {
                  translateY: composeFocus.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, -2],
                  }),
                },
              ],
            },
          ]}
        >
          <Text style={styles.composeLabel}>Ton message</Text>
          <TextInput
            style={styles.composeInput}
            placeholder="Une idée, un conseil, un coup de cœur…"
            placeholderTextColor={colors.muted}
            value={commentDraft}
            onChangeText={onChangeDraft}
            onFocus={() => {
              animateComposeFocus(true);
              onComposeFocus?.();
            }}
            onBlur={() => animateComposeFocus(false)}
            multiline
            maxLength={MAX_LEN}
          />
          <View style={styles.composeFooter}>
            <Text
              style={[
                styles.counter,
                draftLen > MAX_LEN * 0.9 && { color: colors.accent },
              ]}
            >
              {draftLen}/{MAX_LEN}
            </Text>
            <Pressable
              style={({ pressed }) => [
                styles.sendBtn,
                draftLen < 2 && styles.sendBtnDisabled,
                pressed && draftLen >= 2 && !postPending && styles.sendBtnPressed,
              ]}
              onPress={handlePost}
              disabled={draftLen < 2 || postPending}
            >
              {postPending ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Send size={18} color="#fff" />
              )}
            </Pressable>
          </View>
        </Animated.View>
      ) : (
        <CTAButton label="Se connecter pour commenter" onPress={onLoginPress} variant="secondary" />
      )}

      <ReportContentModal
        visible={reportCommentId !== null}
        onClose={() => setReportCommentId(null)}
        loading={report.isPending}
        onSubmit={(reason, details) => {
          if (reportCommentId === null) return;
          report.mutate(
            { target: { kind: 'comment', id: reportCommentId }, reason, details },
            {
              onSuccess: () => {
                setReportCommentId(null);
                Alert.alert('Merci', 'Votre signalement a été transmis à notre équipe.');
              },
              onError: () => {
                setReportCommentId(null);
                Alert.alert('Signalement', 'Impossible d’envoyer le signalement pour le moment.');
              },
            },
          );
        }}
      />
    </View>
  );
}

function createStyles(colors: OdosColorPalette) {
  return StyleSheet.create({
  wrap: { marginTop: Spacing.md },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: Spacing.sm,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: 0.2,
  },
  skeletonList: { gap: Spacing.md },
  skeletonRow: { flexDirection: 'row', gap: Spacing.sm, alignItems: 'flex-start' },
  warn: { color: colors.danger, marginBottom: Spacing.sm },
  empty: {
    alignItems: 'center',
    paddingVertical: Spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: 16,
    marginBottom: Spacing.md,
  },
  emptyEmoji: { fontSize: 32 },
  emptyTitle: { fontSize: 17, fontWeight: '600', color: colors.text, marginTop: 8 },
  emptySub: { fontSize: 14, color: colors.muted, marginTop: 4 },
  bubbleRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    marginBottom: Spacing.sm,
    maxWidth: '100%',
  },
  bubbleRowMine: { justifyContent: 'flex-end' },
  bubbleRowOther: { justifyContent: 'flex-start' },
  avatar: { width: 36, height: 36, borderRadius: 18 },
  avatarFallback: {
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: { color: colors.onAccent, fontWeight: '700', fontSize: 12 },
  bubble: {
    maxWidth: '78%',
    borderRadius: 16,
    padding: 12,
  },
  bubbleMine: {
    backgroundColor: colors.primary,
    borderBottomRightRadius: 4,
  },
  bubbleOther: {
    backgroundColor: colors.surface,
    borderBottomLeftRadius: 4,
  },
  authorName: { fontSize: 12, fontWeight: '600', color: colors.muted, marginBottom: 4 },
  hiddenTag: { fontSize: 11, color: colors.danger, marginBottom: 4 },
  body: { fontSize: 15, lineHeight: 21, color: colors.text },
  bodyMine: { color: colors.onAccent },
  time: { fontSize: 11, color: colors.muted, marginTop: 6 },
  timeMine: { color: `${colors.onAccent}BF` },
  actions: { flexDirection: 'row', gap: 12, marginTop: 8, alignItems: 'center' },
  actionBtn: { padding: 4 },
  link: { color: colors.primary, fontWeight: '600' },
  muted: { color: colors.muted },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 10,
    minHeight: 72,
    color: colors.text,
  },
  compose: {
    marginTop: Spacing.md,
    padding: Spacing.md,
    backgroundColor: colors.surface,
    borderRadius: 16,
  },
  composeLabel: { fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: 8 },
  composeInput: {
    minHeight: 88,
    fontSize: 15,
    color: colors.text,
    textAlignVertical: 'top',
  },
  composeFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  counter: { fontSize: 12, color: colors.muted },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: { opacity: 0.45 },
  sendBtnPressed: { transform: [{ scale: 0.97 }] },
});
}
