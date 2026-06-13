import React, { useMemo } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useOdosColors } from '@/context/ThemeContext';
import { FontFamily } from '@/constants/theme';
import { resolveImageUrl } from '@/utils/imageUrl';
import type { FriendshipItem } from '@/types';

import { useChatMutations } from '@/hooks/useChat';

type FriendCardProps = {
  friendship: FriendshipItem;
};

export function FriendCard({ friendship }: FriendCardProps) {
  const colors = useOdosColors();
  const router = useRouter();
  const { startConversation } = useChatMutations();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const other = friendship.otherUser;
  const avatar = resolveImageUrl(other?.avatarUrl ?? null);

  const openChat = async () => {
    if (!other?.id) return;
    const result = await startConversation.mutateAsync(other.id);
    if (result.conversation?.id) {
      router.push(`/chat/${result.conversation.id}`);
    }
  };

  return (
    <View style={styles.card}>
      <Pressable
        style={styles.main}
        onPress={() => other?.id && router.push(`/profile/${other.id}`)}
      >
      {avatar ? (
        <Image source={{ uri: avatar }} style={styles.avatar} />
      ) : (
        <View style={[styles.avatar, styles.avatarPlaceholder]}>
          <Text style={styles.avatarLetter}>{(other?.displayName ?? '?')[0]}</Text>
        </View>
      )}
      <Text style={styles.name}>{other?.displayName ?? 'Ami'}</Text>
      </Pressable>
      <Pressable onPress={openChat} style={styles.msgBtn}>
        <Text style={styles.msgText}>Message</Text>
      </Pressable>
    </View>
  );
}

function createStyles(colors: ReturnType<typeof useOdosColors>) {
  return StyleSheet.create({
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderWidth: 1,
      borderRadius: 12,
      padding: 14,
    },
    main: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
    avatar: { width: 40, height: 40, borderRadius: 20 },
    avatarPlaceholder: {
      backgroundColor: colors.accentSoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarLetter: {
      fontFamily: FontFamily.uiMedium,
      color: colors.accent,
      fontSize: 16,
    },
    name: {
      fontFamily: FontFamily.uiMedium,
      fontSize: 15,
      color: colors.text,
      flex: 1,
    },
    msgBtn: {
      backgroundColor: colors.accentSoft,
      borderRadius: 8,
      paddingHorizontal: 10,
      paddingVertical: 8,
    },
    msgText: {
      fontFamily: FontFamily.uiMedium,
      fontSize: 12,
      color: colors.accent,
    },
  });
}
