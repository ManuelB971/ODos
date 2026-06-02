import { defaultTheme } from '@/constants/themes/palettes/default';
import type {
  ColorScheme,
  OdosColorPalette,
  ThemeDefinition,
  ThemeVariantId,
} from '@/constants/themes/types';

const themes: Record<ThemeVariantId, ThemeDefinition> = {
  default: defaultTheme,
};

export function getThemeDefinition(variantId: ThemeVariantId): ThemeDefinition {
  return themes[variantId] ?? defaultTheme;
}

export function resolvePalette(
  variantId: ThemeVariantId,
  scheme: ColorScheme,
): OdosColorPalette {
  const theme = getThemeDefinition(variantId);
  return scheme === 'dark' ? theme.dark : theme.light;
}

export function listThemeVariants(): ThemeDefinition[] {
  return Object.values(themes);
}
