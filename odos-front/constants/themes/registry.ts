import { defaultTheme } from '@/constants/themes/palettes/default';
import { oceanTheme } from '@/constants/themes/palettes/ocean';
import { forestTheme } from '@/constants/themes/palettes/forest';
import { sunsetTheme } from '@/constants/themes/palettes/sunset';
import { vineyardTheme } from '@/constants/themes/palettes/vineyard';
import { slateTheme } from '@/constants/themes/palettes/slate';
import type {
  ColorScheme,
  OdosColorPalette,
  ThemeDefinition,
} from '@/constants/themes/types';

export const BUNDLED_THEMES: Record<string, ThemeDefinition> = {
  default: defaultTheme,
  ocean: oceanTheme,
  forest: forestTheme,
  sunset: sunsetTheme,
  vineyard: vineyardTheme,
  slate: slateTheme,
};

export function getThemeDefinition(variantId: string): ThemeDefinition {
  return BUNDLED_THEMES[variantId] ?? defaultTheme;
}

export function resolvePalette(
  variantId: string,
  scheme: ColorScheme,
  themes: Record<string, { light: OdosColorPalette; dark: OdosColorPalette }> = BUNDLED_THEMES,
): OdosColorPalette {
  const theme = themes[variantId] ?? defaultTheme;
  return scheme === 'dark' ? theme.dark : theme.light;
}

export function listThemeVariants(): ThemeDefinition[] {
  return Object.values(BUNDLED_THEMES);
}
