import React from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { FontFamily } from '@/constants/theme';
import { usePopTokens } from './usePop';

/**
 * Pastille « pop » (greek.css `.pop-cat`) : fond accent, contour encre, petite
 * ombre dure. Utilisée pour catégories, rôles, statuts.
 */
export function PopPill({
  label,
  accent,
  style,
}: {
  label: string;
  /** Couleur de fond. Défaut: orange (`accent`). */
  accent?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const t = usePopTokens();
  const bg = accent ?? t.orange;
  return (
    <View style={[styles.pillWrap, style]}>
      <View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, styles.pillShadow, { backgroundColor: t.ink }]}
      />
      <View style={[styles.pill, { backgroundColor: bg, borderColor: t.ink }]}>
        <Text style={[styles.pillText, { color: t.ink }]} numberOfLines={1}>
          {label.toUpperCase()}
        </Text>
      </View>
    </View>
  );
}

/**
 * Badge compteur « pop » (non‑lus, demandes…) : pastille ronde encre + accent.
 */
export function PopBadge({
  count,
  accent,
  style,
}: {
  count: number;
  accent?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const t = usePopTokens();
  if (count <= 0) return null;
  return (
    <View style={[styles.badge, { backgroundColor: accent ?? t.orange, borderColor: t.ink }, style]}>
      <Text style={[styles.badgeText, { color: t.ink }]}>{count > 99 ? '99+' : count}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pillWrap: {
    alignSelf: 'flex-start',
    marginRight: 2,
    marginBottom: 2,
  },
  pillShadow: {
    borderRadius: 100,
    transform: [{ translateX: 2 }, { translateY: 2 }],
  },
  pill: {
    borderWidth: 2,
    borderRadius: 100,
    paddingHorizontal: 10,
    paddingVertical: 2,
  },
  pillText: {
    fontSize: 9.5,
    fontFamily: FontFamily.uiBold,
    letterSpacing: 1.4,
  },
  badge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    paddingHorizontal: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontSize: 11,
    fontFamily: FontFamily.uiBold,
  },
});
