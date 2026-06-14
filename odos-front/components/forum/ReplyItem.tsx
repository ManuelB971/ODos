import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useOdosColors } from '@/context/ThemeContext';
import { FontFamily } from '@/constants/theme';
import { PopSurface } from '@/components/pop/PopSurface';
import { useIsMosaicPop, usePopTokens } from '@/components/pop/usePop';
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
  const isMosaicPop = useIsMosaicPop();
  const pop = usePopTokens();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const inner = (
    <>
      <Pressable
        onPress={() => reply.author?.id && router.push(`/profile/${reply.author.id}`)}
        disabled={!reply.author?.id}
      >
        <Text style={[styles.author, isMosaicPop && { color: pop.terra, fontFamily: FontFamily.uiBold }]}>
          {reply.author?.displayName ?? 'Anonyme'}
        </Text>
      </Pressable>
      <Text style={[styles.content, isMosaicPop && { color: pop.ink }]}>{reply.content}</Text>
      <View style={styles.footer}>
        <Pressable onPress={onToggleLike} disabled={liking || !onToggleLike} style={styles.likeBtn}>
          <Text style={[styles.likeText, isMosaicPop && { color: pop.muted }, reply.likedByMe && styles.liked]}>
            {reply.likedByMe ? '♥' : '♡'} {reply.likeCount}
          </Text>
        </Pressable>
        {onReport ? (
          <Pressable onPress={onReport} style={styles.likeBtn}>
            <Text style={[styles.likeText, isMosaicPop && { color: pop.muted }]}>Signaler</Text>
          </Pressable>
        ) : null}
      </View>
    </>
  );

  if (isMosaicPop) {
    return (
      <PopSurface shadow={4} radius={10} contentStyle={styles.popContent}>
        {inner}
      </PopSurface>
    );
  }

  return <View style={styles.card}>{inner}</View>;
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
    popContent: { padding: 12, gap: 6 },
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
    footer: { flexDirection: 'row', gap: 12 },
    likeBtn: { paddingVertical: 4 },
    likeText: {
      fontFamily: FontFamily.ui,
      fontSize: 13,
      color: colors.muted,
    },
    liked: { color: colors.danger },
  });
}
