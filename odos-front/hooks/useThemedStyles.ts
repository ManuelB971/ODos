import { useMemo } from 'react';
import { StyleSheet, type ImageStyle, type TextStyle, type ViewStyle } from 'react-native';

import type { OdosColorPalette } from '@/constants/themes/types';
import { useOdosColors } from '@/context/ThemeContext';

type NamedStyles<T> = {
  [P in keyof T]: ViewStyle | TextStyle | ImageStyle;
};

/**
 * Styles mémoïsés liés à la palette active (clair / sombre / future variante régionale).
 *
 * @example
 * const styles = useThemedStyles(createScreenStyles);
 * function createScreenStyles(colors: OdosColorPalette) {
 *   return { root: { flex: 1, backgroundColor: colors.background } };
 * }
 */
export function useThemedStyles<T extends NamedStyles<T>>(
  factory: (colors: OdosColorPalette) => T,
): T {
  const colors = useOdosColors();
  return useMemo(() => StyleSheet.create(factory(colors)), [colors]);
}
