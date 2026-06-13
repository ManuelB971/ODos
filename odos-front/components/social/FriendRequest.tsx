import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useOdosColors } from '@/context/ThemeContext';
import { FontFamily } from '@/constants/theme';
import type { FriendshipItem } from '@/types';

type FriendRequestProps = {
  request: FriendshipItem;
  onAccept: () => void;
  onDecline: () => void;
  loading?: boolean;
};

export function FriendRequest({ request, onAccept, onDecline, loading }: FriendRequestProps) {
  const colors = useOdosColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.row}>
      <Text style={styles.name}>{request.otherUser?.displayName ?? 'Utilisateur'}</Text>
      <Pressable onPress={onAccept} disabled={loading} style={[styles.btn, styles.accept]}>
        <Text style={styles.acceptText}>Accepter</Text>
      </Pressable>
      <Pressable onPress={onDecline} disabled={loading} style={[styles.btn, styles.decline]}>
        <Text style={styles.declineText}>Refuser</Text>
      </Pressable>
    </View>
  );
}

function createStyles(colors: ReturnType<typeof useOdosColors>) {
  return StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingVertical: 8,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    name: {
      flex: 1,
      fontFamily: FontFamily.ui,
      fontSize: 14,
      color: colors.text,
    },
    btn: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 8,
    },
    accept: { backgroundColor: colors.accent },
    acceptText: { color: colors.onAccent, fontFamily: FontFamily.uiMedium, fontSize: 13 },
    decline: { borderWidth: 1, borderColor: colors.border },
    declineText: { color: colors.muted, fontFamily: FontFamily.ui, fontSize: 13 },
  });
}
