import type { ThemeDefinition } from '@/constants/themes/types';
import { OdosTokens } from '@/constants/themes/tokens';

const tintColorLight = OdosTokens.blueAction;

export const defaultTheme: ThemeDefinition = {
  id: 'default',
  label: 'ODOS',
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
    overlay: `${OdosTokens.bgElevated}F0`,
    onAccent: '#FFFFFF',
    successSurface: '#ecfdf5',
    successText: '#047857',
    errorSurface: '#fef2f2',
  },
  dark: {
    text: OdosTokens.darkText,
    background: OdosTokens.darkBgPage,
    tint: '#FFFFFF',
    icon: '#9BA1A6',
    tabIconDefault: '#9BA1A6',
    tabIconSelected: '#FFFFFF',
    primary: '#60a5fa',
    accent: OdosTokens.orangePrimary,
    accentHover: OdosTokens.orangeHover,
    accentSoft: OdosTokens.orangeSoft,
    turquoise: OdosTokens.tealAccent,
    surface: OdosTokens.darkBgSurface,
    elevated: OdosTokens.darkBgElevated,
    border: OdosTokens.darkBorder,
    muted: OdosTokens.darkTextMuted,
    danger: '#f87171',
    mapPrimaryCta: OdosTokens.orangePrimary,
    mapSecondary: '#60a5fa',
    mapAccent: OdosTokens.tealAccent,
    overlay: OdosTokens.darkOverlay,
    onAccent: '#FFFFFF',
    successSurface: '#064e3b55',
    successText: '#6ee7b7',
    errorSurface: '#7f1d1d44',
  },
};

/** Compat historique `Colors.light` / `Colors.dark`. */
export const legacyColors = {
  light: defaultTheme.light,
  dark: defaultTheme.dark,
};
