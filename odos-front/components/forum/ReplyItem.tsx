import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useOdosColors } from '@/context/ThemeContext';
import { FontFamily } from '@/constants/theme';
import type { ForumReplyItem } from '@/types';

type ReplyItemProps = {
  reply: ForumReplyItem;
  onToggleLike?: () => void;
  onReport?: () => void;
  liking?: boolean;
};

export function ReplyItem({ reply, onToggleLike, onReport, liking }: ReplyItemProps) {
  const colors = useOdosColors();
  const router = useRouter();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.card}>
      <Pressable
        onPress={() => reply.author?.id && router.push(`/profile/${reply.author.id}`)}
        disabled={!reply.author?.id}
      >
        <Text style={styles.author}>{reply.author?.displayName ?? 'Anonyme'}</Text>
      </Pressable>
      <Text style={styles.content}>{reply.content}</Text>
      <View style={styles.footer}>
        <Pressable onPress={onToggleLike} disabled={liking || !onToggleLike} style={styles.likeBtn}>
          <Text style={[styles.likeText, reply.likedByMe && styles.liked]}>
            {reply.likedByMe ? '♥' : '♡'} {reply.likeCount}
          </Text>
        </Pressable>
        {onReport ? (
          <Pressable onPress={onReport} style={styles.likeBtn}>
            <Text style={styles.likeText}>Signaler</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

function createStyles(colors: ReturnType<typeof useOdosColors>) {
  return StyleSheet.create({
    card: {
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderWidth: 1,
      borderRadius: 10,
      padding: 12,
      gap: 6,
    },
    author: {
      fontFamily: FontFamily.uiMedium,
      fontSize: 12,
      color: colors.accent,
    },
    content: {
      fontFamily: FontFamily.ui,
      fontSize: 14,
      color: colors.text,
      lineHeight: 20,
    },
    footer: { flexDirection: 'row' },
    likeBtn: { paddingVertical: 4 },
    likeText: {
      fontFamily: FontFamily.ui,
      fontSize: 13,
      color: colors.muted,
    },
    liked: { color: colors.danger },
  });
}
