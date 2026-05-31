import React from 'react';
import { StyleSheet, Text, type TextStyle, type ViewStyle } from 'react-native';

import { HERO_BASELINE } from '@/constants/brand';
import { Colors, FontFamily } from '@/constants/theme';

type BrandBaselineProps = {
  /** Afficher la baseline complète multilingue (défaut) ou seulement « ὁδός · La voie ». */
  variant?: 'full' | 'short';
  color?: string;
  style?: TextStyle;
  containerStyle?: ViewStyle;
};

/**
 * Baseline éditoriale ODOS — Cormorant italique orange (DA §3).
 */
export function BrandBaseline({
  variant = 'full',
  color = Colors.light.accent,
  style,
  containerStyle,
}: BrandBaselineProps) {
  const text = variant === 'short' ? 'ὁδός · La voie' : HERO_BASELINE;

  return (
    <Text style={[styles.base, { color }, containerStyle, style]} accessibilityRole="text">
      {text}
    </Text>
  );
}

const styles = StyleSheet.create({
  base: {
    fontSize: 17,
    fontFamily: FontFamily.displayItalic,
    fontStyle: 'italic',
    textAlign: 'center',
    lineHeight: 24,
  },
});
