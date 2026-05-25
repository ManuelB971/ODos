import React from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';

import { Colors } from '@/constants/theme';

type ExplorationProgressChipProps = {
  percent: number;
  visitedCount: number;
  totalCells: number;
};

export function ExplorationProgressChip({
  percent,
  visitedCount,
  totalCells,
}: ExplorationProgressChipProps) {
  if (totalCells <= 0) return null;

  return (
    <View style={styles.chip} pointerEvents="none">
      <Text style={styles.label}>Exploration</Text>
      <Text style={styles.value}>{percent.toFixed(percent % 1 === 0 ? 0 : 1)} %</Text>
      <Text style={styles.sub}>
        {visitedCount}/{totalCells} zones
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    alignSelf: 'flex-start',
    marginLeft: 12,
    marginTop: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.94)',
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
    color: Colors.light.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  value: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.light.mapPrimaryCta,
    marginTop: 2,
  },
  sub: {
    fontSize: 10,
    color: Colors.light.muted,
    marginTop: 1,
  },
});
