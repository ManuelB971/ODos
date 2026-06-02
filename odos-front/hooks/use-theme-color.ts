import { useTheme } from '@/context/ThemeContext';
import type { OdosColorPalette } from '@/constants/themes/types';

/**
 * Couleur sémantique de la palette active (respecte préférence clair/sombre/system).
 */
export function useThemeColor(
  props: { light?: string; dark?: string },
  colorName: keyof OdosColorPalette,
): string {
  const { colors, isDark } = useTheme();
  const override = isDark ? props.dark : props.light;
  if (override) {
    return override;
  }
  return colors[colorName];
}
