/**
 * Tokens DA ODOS — point d’entrée public.
 * Palettes : `constants/themes/` (extensible par ville / pays).
 */

import { Platform } from 'react-native';

import { legacyColors } from '@/constants/themes/palettes/default';

export { OdosTokens } from '@/constants/themes/tokens';
export type {
  ColorScheme,
  OdosColorPalette,
  ThemeDefinition,
  ThemePreference,
  ThemeVariantId,
} from '@/constants/themes/types';

/** @deprecated Préférer `useOdosColors()` — conservé pour migration progressive. */
export const Colors = legacyColors;

export const Radius = {
  pill: 100,
  card: 20,
  modal: 24,
} as const;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const FontFamily = {
  display: 'CormorantGaramond_600SemiBold',
  displayItalic: 'CormorantGaramond_600SemiBold_Italic',
  ui: 'DMSans_400Regular',
  uiMedium: 'DMSans_500Medium',
  uiBold: 'DMSans_700Bold',
  accent: 'Courgette_400Regular',
} as const;

/** @deprecated Préférer `FontFamily` */
export const Fonts = Platform.select({
  ios: {
    sans: FontFamily.ui,
    serif: FontFamily.display,
    rounded: FontFamily.ui,
    mono: 'ui-monospace',
  },
  default: {
    sans: FontFamily.ui,
    serif: FontFamily.display,
    rounded: FontFamily.ui,
    mono: 'monospace',
  },
  web: {
    sans: `'DM Sans', system-ui, sans-serif`,
    serif: `'Cormorant Garamond', Georgia, serif`,
    rounded: `'DM Sans', system-ui, sans-serif`,
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, monospace",
  },
});
