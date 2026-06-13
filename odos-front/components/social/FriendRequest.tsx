import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useOdosColors } from '@/context/ThemeContext';
import { FontFamily } from '@/constants/theme';
import { PopSurface } from '@/components/pop/PopSurface';
import { useIsMosaicPop, usePopTokens } from '@/components/pop/usePop';
import type { FriendshipItem } from '@/types';

type FriendRequestProps = {
  request: FriendshipItem;
  onAccept: () => void;
  onDecline: () => void;
  loading?: boolean;
};

export function FriendRequest({ request, onAccept, onDecline, loading }: FriendRequestProps) {
  const colors = useOdosColors();
  const isMosaicPop = useIsMosaicPop();
  const pop = usePopTokens();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const name = request.otherUser?.displayName ?? 'Utilisateur';

  if (isMosaicPop) {
    return (
      <PopSurface shadow={4} radius={12} style={styles.popWrap} contentStyle={styles.popContent}>
        <Text style={[styles.name, { color: pop.ink, fontFamily: FontFamily.uiBold }]} numberOfLines={1}>
          {name}
        </Text>
        <Pressable
          onPress={onAccept}
          disabled={loading}
          style={[styles.btnPop, { backgroundColor: pop.orange, borderColor: pop.ink }]}
        >
          <Text style={[styles.btnPopText, { color: pop.ink }]}>Accepter</Text>
        </Pressable>
        <Pressable
          onPress={onDecline}
          disabled={loading}
          style={[styles.btnPop, { backgroundColor: pop.paper, borderColor: pop.ink }]}
        >
          <Text style={[styles.btnPopText, { color: pop.muted }]}>Refuser</Text>
        </Pressable>
      </PopSurface>
    );
  }

  return (
    <View style={styles.row}>
      <Text style={styles.name}>{name}</Text>
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
    popWrap: { marginBottom: 4 },
    popContent: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: 12,
      paddingVertical: 10,
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
    btnPop: {
      borderWidth: 2,
      borderRadius: 100,
      paddingHorizontal: 12,
      paddingVertical: 6,
    },
    btnPopText: {
      fontFamily: FontFamily.uiBold,
      fontSize: 12,
    },
  });
}
