import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { useOdosColors } from '@/context/ThemeContext';
import { FontFamily } from '@/constants/theme';
import { PopSurface } from '@/components/pop/PopSurface';
import { useIsMosaicPop, usePopTokens } from '@/components/pop/usePop';
import type { ActivityGroupItem } from '@/types';

type GroupCardProps = {
  group: ActivityGroupItem;
  onJoin?: () => void;
  joining?: boolean;
};

export function GroupCard({ group, onJoin, joining }: GroupCardProps) {
  const colors = useOdosColors();
  const router = useRouter();
  const isMosaicPop = useIsMosaicPop();
  const pop = usePopTokens();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const meta = `${group.memberCount} membres${group.isPrivate ? ' · Privé' : ''}`;

  if (isMosaicPop) {
    return (
      <Pressable onPress={() => router.push(`/group/${group.id}`)}>
        <PopSurface shadow={5} radius={12} contentStyle={styles.popContent}>
          <Text style={[styles.name, { color: pop.ink, fontFamily: FontFamily.display, fontSize: 19 }]}>
            {group.name}
          </Text>
          <Text style={[styles.meta, { color: pop.muted }]}>{meta}</Text>
          {group.description ? (
            <Text style={[styles.desc, { color: pop.ink }]} numberOfLines={2}>
              {group.description}
            </Text>
          ) : null}
          {onJoin ? (
            <Pressable
              onPress={onJoin}
              disabled={joining}
              style={[styles.joinBtnPop, { backgroundColor: pop.orange, borderColor: pop.ink }]}
            >
              <Text style={[styles.joinTextPop, { color: pop.ink }]}>{joining ? '…' : 'Rejoindre'}</Text>
            </Pressable>
          ) : null}
        </PopSurface>
      </Pressable>
    );
  }

  return (
    <Pressable style={styles.card} onPress={() => router.push(`/group/${group.id}`)}>
      <Text style={styles.name}>{group.name}</Text>
      <Text style={styles.meta}>{meta}</Text>
      {group.description ? (
        <Text style={styles.desc} numberOfLines={2}>{group.description}</Text>
      ) : null}
      {onJoin ? (
        <Pressable onPress={onJoin} disabled={joining} style={styles.joinBtn}>
          <Text style={styles.joinText}>{joining ? '…' : 'Rejoindre'}</Text>
        </Pressable>
      ) : null}
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
      padding: 14,
      gap: 6,
    },
    popContent: { padding: 14, gap: 6 },
    name: {
      fontFamily: FontFamily.uiMedium,
      fontSize: 16,
      color: colors.text,
    },
    meta: {
      fontFamily: FontFamily.ui,
      fontSize: 12,
      color: colors.muted,
    },
    desc: {
      fontFamily: FontFamily.ui,
      fontSize: 13,
      color: colors.text,
      opacity: 0.8,
    },
    joinBtn: {
      alignSelf: 'flex-start',
      marginTop: 4,
      backgroundColor: colors.accent,
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 8,
    },
    joinText: {
      color: colors.onAccent,
      fontFamily: FontFamily.uiMedium,
      fontSize: 13,
    },
    joinBtnPop: {
      alignSelf: 'flex-start',
      marginTop: 4,
      borderWidth: 2,
      borderRadius: 100,
      paddingHorizontal: 14,
      paddingVertical: 7,
    },
    joinTextPop: {
      fontFamily: FontFamily.uiBold,
      fontSize: 13,
    },
  });
}
