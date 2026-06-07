import { defaultTheme } from '@/constants/themes/palettes/default';
import { oceanTheme } from '@/constants/themes/palettes/ocean';
import { forestTheme } from '@/constants/themes/palettes/forest';
import type {
  ColorScheme,
  OdosColorPalette,
  ThemeDefinition,
} from '@/constants/themes/types';

export const BUNDLED_THEMES: Record<string, ThemeDefinition> = {
  default: defaultTheme,
  ocean: oceanTheme,
  forest: forestTheme,
};

export function getThemeDefinition(variantId: string): ThemeDefinition {
  return BUNDLED_THEMES[variantId] ?? defaultTheme;
}

export function resolvePalette(
  variantId: string,
  scheme: ColorScheme,
): OdosColorPalette {
  const theme = getThemeDefinition(variantId);
  return scheme === 'dark' ? theme.dark : theme.light;
}

export function listThemeVariants(): ThemeDefinition[] {
  return Object.values(BUNDLED_THEMES);
}
