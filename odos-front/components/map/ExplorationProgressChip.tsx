import React, { useMemo } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';

import { useOdosColors, type OdosColorPalette } from '@/context/ThemeContext';

type ExplorationProgressChipProps = {
  percent: number;
  visitedCount: number;
  total: number;
  /** Libellé de l'unité comptée (ex. "lieux", "zones"). */
  unitLabel?: string;
};

export function ExplorationProgressChip({
  percent,
  visitedCount,
  total,
  unitLabel = 'lieux',
}: ExplorationProgressChipProps) {
  const colors = useOdosColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  if (total <= 0) return null;

  return (
    <View style={styles.chip} pointerEvents="none">
      <Text style={styles.label}>Exploration</Text>
      <Text style={styles.value}>{percent.toFixed(percent % 1 === 0 ? 0 : 1)} %</Text>
      <Text style={styles.sub}>
        {visitedCount}/{total} {unitLabel}
      </Text>
    </View>
  );
}

function createStyles(colors: OdosColorPalette) {
  return StyleSheet.create({
    chip: {
      alignSelf: 'flex-start',
      marginLeft: 12,
      marginTop: 4,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 14,
      backgroundColor: colors.overlay,
      borderWidth: 1,
      borderColor: colors.border,
      ...Platform.select({
        ios: {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 6,
        },
        android: { elevation: 3 },
      }),
    },
    label: {
      fontSize: 10,
      fontWeight: '600',
      color: colors.muted,
      textTransform: 'uppercase',
      letterSpacing: 0.4,
    },
    value: {
      fontSize: 18,
      fontWeight: '800',
      color: colors.mapPrimaryCta,
      marginTop: 2,
    },
    sub: {
      fontSize: 10,
      color: colors.muted,
      marginTop: 1,
    },
  });
}
