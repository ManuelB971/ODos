import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useOdosColors } from '@/context/ThemeContext';
import { FontFamily } from '@/constants/theme';
import type { ForumThreadItem } from '@/types';

type ThreadCardProps = {
  thread: ForumThreadItem;
};

export function ThreadCard({ thread }: ThreadCardProps) {
  const colors = useOdosColors();
  const router = useRouter();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <Pressable
      onPress={() => router.push(`/thread/${thread.id}`)}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      {thread.isPinned ? (
        <Text style={styles.pinned}>Épinglé</Text>
      ) : null}
      <Text style={styles.title} numberOfLines={2}>
        {thread.title}
      </Text>
      <Text style={styles.meta}>
        {thread.author?.displayName ?? 'Anonyme'} · {thread.replyCount} réponses
      </Text>
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
    pinned: {
      fontFamily: FontFamily.uiMedium,
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
    meta: {
      fontFamily: FontFamily.ui,
      fontSize: 12,
      color: colors.muted,
    },
  });
}
