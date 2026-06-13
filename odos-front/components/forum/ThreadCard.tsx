import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useOdosColors } from '@/context/ThemeContext';
import { FontFamily } from '@/constants/theme';
import { PopSurface } from '@/components/pop/PopSurface';
import { useIsMosaicPop, usePopTokens } from '@/components/pop/usePop';
import type { ForumThreadItem } from '@/types';

type ThreadCardProps = {
  thread: ForumThreadItem;
};

export function ThreadCard({ thread }: ThreadCardProps) {
  const colors = useOdosColors();
  const router = useRouter();
  const isMosaicPop = useIsMosaicPop();
  const pop = usePopTokens();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const meta = `${thread.author?.displayName ?? 'Anonyme'} · ${thread.replyCount} réponses`;

  if (isMosaicPop) {
    return (
      <Pressable
        onPress={() => router.push(`/thread/${thread.id}`)}
        style={({ pressed }) => (pressed ? styles.popPressed : undefined)}
      >
        <PopSurface shadow={5} radius={12} contentStyle={styles.popContent}>
          {thread.isPinned ? (
            <Text style={[styles.pinned, { color: pop.terra }]}>Épinglé</Text>
          ) : null}
          <Text style={[styles.popTitle, { color: pop.ink }]} numberOfLines={2}>
            {thread.title}
          </Text>
          <Text style={[styles.meta, { color: pop.muted }]}>{meta}</Text>
        </PopSurface>
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={() => router.push(`/thread/${thread.id}`)}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      {thread.isPinned ? <Text style={styles.pinned}>Épinglé</Text> : null}
      <Text style={styles.title} numberOfLines={2}>
        {thread.title}
      </Text>
      <Text style={styles.meta}>{meta}</Text>
    </Pressable>
  );
}

function createStyles(colors: ReturnType<typeof useOdosColors>) {
  return StyleSheet.create({
    card: {
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderWidth: 1,
      borderRadius: 12,
      padding: 16,
      gap: 6,
    },
    pressed: { opacity: 0.85 },
    popContent: { padding: 14, gap: 5 },
    popPressed: { transform: [{ translateX: 1.5 }, { translateY: 1.5 }] },
    pinned: {
      fontFamily: FontFamily.uiBold,
      fontSize: 10,
      color: colors.accent,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    title: {
      fontFamily: FontFamily.uiMedium,
      fontSize: 16,
      color: colors.text,
    },
    popTitle: {
      fontFamily: FontFamily.display,
      fontSize: 19,
      lineHeight: 22,
    },
    meta: {
      fontFamily: FontFamily.ui,
      fontSize: 12,
      color: colors.muted,
    },
  });
}
