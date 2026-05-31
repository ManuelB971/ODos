/**
 * Tokens DA ODOS — alignés sur docs/DESIGN_DIRECTION.md (landing → app).
 */

import { Platform } from 'react-native';

/** Palette canonique (§2). */
export const OdosTokens = {
  orangePrimary: '#F4A261',
  orangeHover: '#E07D3A',
  orangeSoft: '#F9C49A',
  blueAction: '#3B82F6',
  tealAccent: '#5FC2D8',
  textPrimary: '#11181C',
  textMuted: '#6B6560',
  bgPage: '#FDF8F2',
  bgSurface: '#F5EDE0',
  bgElevated: '#FFFFFF',
  borderWarm: '#E8DFD3',
  darkBgPage: '#171412',
  darkBgSurface: '#211D1A',
  darkText: '#F4EFE9',
  darkTextMuted: '#C8BCB1',
  darkBorder: '#3B342E',
} as const;

export const Radius = {
  pill: 100,
  card: 20,
  modal: 24,
} as const;

const tintColorLight = OdosTokens.blueAction;
const tintColorDark = '#fff';

export const Colors = {
  light: {
    text: OdosTokens.textPrimary,
    background: OdosTokens.bgPage,
    tint: tintColorLight,
    icon: '#687076',
    tabIconDefault: '#687076',
    tabIconSelected: tintColorLight,
    primary: OdosTokens.blueAction,
    accent: OdosTokens.orangePrimary,
    accentHover: OdosTokens.orangeHover,
    accentSoft: OdosTokens.orangeSoft,
    turquoise: OdosTokens.tealAccent,
    surface: OdosTokens.bgSurface,
    elevated: OdosTokens.bgElevated,
    border: OdosTokens.borderWarm,
    muted: OdosTokens.textMuted,
    danger: '#ef4444',
    mapPrimaryCta: OdosTokens.orangePrimary,
    mapSecondary: OdosTokens.blueAction,
    mapAccent: OdosTokens.tealAccent,
  },
  dark: {
    text: OdosTokens.darkText,
    background: OdosTokens.darkBgPage,
    tint: tintColorDark,
    icon: '#9BA1A6',
    tabIconDefault: '#9BA1A6',
    tabIconSelected: tintColorDark,
    primary: '#60a5fa',
    accent: OdosTokens.orangePrimary,
    accentHover: OdosTokens.orangeHover,
    accentSoft: OdosTokens.orangeSoft,
    turquoise: OdosTokens.tealAccent,
    surface: OdosTokens.darkBgSurface,
    elevated: '#2A2520',
    border: OdosTokens.darkBorder,
    muted: OdosTokens.darkTextMuted,
    danger: '#f87171',
    mapPrimaryCta: OdosTokens.orangePrimary,
    mapSecondary: '#60a5fa',
    mapAccent: OdosTokens.tealAccent,
  },
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

/** Noms Expo Google Fonts (chargés dans `_layout.tsx`). */
export const FontFamily = {
  display: 'CormorantGaramond_600SemiBold',
  displayItalic: 'CormorantGaramond_600SemiBold_Italic',
  ui: 'DMSans_400Regular',
  uiMedium: 'DMSans_500Medium',
  uiBold: 'DMSans_700Bold',
  accent: 'Courgette_400Regular',
} as const;

/** @deprecated Préférer `FontFamily` — conservé pour compatibilité. */
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
