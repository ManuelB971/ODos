import React, { useMemo } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useOdosColors } from '@/context/ThemeContext';
import { FontFamily } from '@/constants/theme';
import { resolveImageUrl } from '@/utils/imageUrl';
import { PopSurface } from '@/components/pop/PopSurface';
import { useIsMosaicPop, usePopTokens } from '@/components/pop/usePop';
import type { FriendshipItem } from '@/types';

import { useChatMutations } from '@/hooks/useChat';

type FriendCardProps = {
  friendship: FriendshipItem;
};

export function FriendCard({ friendship }: FriendCardProps) {
  const colors = useOdosColors();
  const router = useRouter();
  const isMosaicPop = useIsMosaicPop();
  const pop = usePopTokens();
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

  const avatarNode = avatar ? (
    <Image source={{ uri: avatar }} style={[styles.avatar, isMosaicPop && styles.avatarPop]} />
  ) : (
    <View
      style={[
        styles.avatar,
        styles.avatarPlaceholder,
        isMosaicPop && { ...styles.avatarPop, backgroundColor: pop.orange, borderColor: pop.ink, borderWidth: 2 },
      ]}
    >
      <Text style={[styles.avatarLetter, isMosaicPop && { color: pop.ink }]}>
        {(other?.displayName ?? '?')[0]}
      </Text>
    </View>
  );

  if (isMosaicPop) {
    return (
      <PopSurface shadow={5} radius={12} contentStyle={styles.popContent}>
        <Pressable
          style={({ pressed }) => [styles.main, pressed && styles.mainPressed]}
          onPress={() => other?.id && router.push(`/profile/${other.id}`)}
        >
          {avatarNode}
          <Text style={[styles.name, { color: pop.ink }]}>{other?.displayName ?? 'Ami'}</Text>
        </Pressable>
        <Pressable onPress={openChat} style={[styles.msgBtnPop, { backgroundColor: pop.orange, borderColor: pop.ink }]}>
          <Text style={[styles.msgTextPop, { color: pop.ink }]}>Message</Text>
        </Pressable>
      </PopSurface>
    );
  }

  return (
    <View style={styles.card}>
      <Pressable
        style={styles.main}
        onPress={() => other?.id && router.push(`/profile/${other.id}`)}
      >
        {avatarNode}
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
    popContent: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      padding: 12,
    },
    main: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
    mainPressed: { opacity: 0.6 },
    avatar: { width: 40, height: 40, borderRadius: 20 },
    avatarPop: { borderRadius: 20 },
    avatarPlaceholder: {
      backgroundColor: colors.accentSoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarLetter: {
      fontFamily: FontFamily.uiBold,
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
    msgBtnPop: {
      borderWidth: 2,
      borderRadius: 100,
      paddingHorizontal: 12,
      paddingVertical: 7,
    },
    msgTextPop: {
      fontFamily: FontFamily.uiBold,
      fontSize: 12,
    },
  });
}
