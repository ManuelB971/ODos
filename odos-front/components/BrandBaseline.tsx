import React, { useMemo } from 'react';
import { StyleSheet, Text, View, type TextStyle, type ViewStyle } from 'react-native';

import { HERO_BASELINE } from '@/constants/brand';
import { FontFamily } from '@/constants/theme';
import { useOdosColors } from '@/context/ThemeContext';

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
  color,
  style,
  containerStyle,
}: BrandBaselineProps) {
  const colors = useOdosColors();
  const styles = useMemo(() => createStyles(), []);
  const content = variant === 'short' ? 'ὁδός · La voie' : HERO_BASELINE;
  const textColor = color ?? colors.accent;

  const text = (
    <Text style={[styles.base, { color: textColor }, style]} accessibilityRole="text">
      {content}
    </Text>
  );

  return containerStyle ? <View style={containerStyle}>{text}</View> : text;
}

function createStyles() {
  return StyleSheet.create({
    base: {
      fontSize: 17,
      fontFamily: FontFamily.displayItalic,
      fontStyle: 'italic',
      textAlign: 'center',
      lineHeight: 24,
    },
  });
}
