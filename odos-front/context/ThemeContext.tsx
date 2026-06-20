import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useColorScheme as useSystemColorScheme } from 'react-native';
import * as SecureStore from 'expo-secure-store';

import { BUNDLED_THEMES, resolvePalette } from '@/constants/themes/registry';
import type {
  ColorScheme,
  OdosColorPalette,
  ThemePreference,
  ThemeVariantId,
} from '@/constants/themes/types';

const STORAGE_KEY = 'odos_theme_preference';
const VARIANT_STORAGE_KEY = 'odos_theme_variant';
const BG_PATTERN_STORAGE_KEY = 'odos_bg_pattern';
const CARD_STYLE_STORAGE_KEY = 'odos_card_style';

/** Intensité du fond texturé (spray) — réglable par l'utilisateur. */
export type BackgroundPattern = 'off' | 'subtle' | 'medium' | 'strong';

const BG_PATTERN_VALUES: BackgroundPattern[] = ['off', 'subtle', 'medium', 'strong'];

/** Slugs de variantes valides (default / ocean / forest…), dérivés du registry. */
const VARIANT_IDS: string[] = Object.keys(BUNDLED_THEMES);

/**
 * Style des cartes d'activité — réglable par l'utilisateur, se superpose au thème de base.
 * `classic` : cartes ODOS standard. `mosaicPop` : direction « Mosaïque pop »
 * (photo sertie de tesselles, contour encre + ombre dure, bandeau méandre grec).
 */
export type CardStyle = 'classic' | 'mosaicPop';

const CARD_STYLE_VALUES: CardStyle[] = ['classic', 'mosaicPop'];

/** Opacité du spray par niveau, atténuée en dark mode pour préserver la lisibilité. */
const BG_PATTERN_OPACITY: Record<BackgroundPattern, { light: number; dark: number }> = {
  off: { light: 0, dark: 0 },
  subtle: { light: 0.12, dark: 0.05 },
  medium: { light: 0.22, dark: 0.1 },
  strong: { light: 0.35, dark: 0.16 },
};

export type { OdosColorPalette, ThemePreference, ThemeVariantId };

type ThemeContextValue = {
  /** Variante visuelle (ville / pays) — `default` pour l’instant. */
  variantId: ThemeVariantId;
  setVariantId: (id: ThemeVariantId) => void;
  preference: ThemePreference;
  setPreference: (pref: ThemePreference) => void;
  /** Intensité du fond texturé choisie par l'utilisateur. */
  backgroundPattern: BackgroundPattern;
  setBackgroundPattern: (pattern: BackgroundPattern) => void;
  /** Style des cartes d'activité (classique / Mosaïque pop). */
  cardStyle: CardStyle;
  setCardStyle: (style: CardStyle) => void;
  /** Opacité effective du spray (selon le niveau + light/dark). */
  sprayOpacity: number;
  /** Schéma effectif après résolution system/light/dark. */
  colorScheme: ColorScheme;
  colors: OdosColorPalette;
  isDark: boolean;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

async function readPreference(): Promise<ThemePreference> {
  try {
    if (!(await SecureStore.isAvailableAsync())) return 'system';
    const raw = await SecureStore.getItemAsync(STORAGE_KEY);
    if (raw === 'light' || raw === 'dark' || raw === 'system') return raw;
  } catch {
    // fallback
  }
  return 'system';
}

async function readVariantId(): Promise<ThemeVariantId> {
  try {
    if (!(await SecureStore.isAvailableAsync())) return 'default';
    const raw = await SecureStore.getItemAsync(VARIANT_STORAGE_KEY);
    if (raw && VARIANT_IDS.includes(raw)) return raw;
  } catch {
    // fallback
  }
  return 'default';
}

async function readBackgroundPattern(): Promise<BackgroundPattern> {
  try {
    if (!(await SecureStore.isAvailableAsync())) return 'medium';
    const raw = await SecureStore.getItemAsync(BG_PATTERN_STORAGE_KEY);
    if (raw && (BG_PATTERN_VALUES as string[]).includes(raw)) {
      return raw as BackgroundPattern;
    }
  } catch {
    // fallback
  }
  return 'medium';
}

async function writePreference(pref: ThemePreference): Promise<void> {
  try {
    if (await SecureStore.isAvailableAsync()) {
      await SecureStore.setItemAsync(STORAGE_KEY, pref);
    }
  } catch {
    // ignore
  }
}

async function writeVariantId(id: ThemeVariantId): Promise<void> {
  try {
    if (await SecureStore.isAvailableAsync()) {
      await SecureStore.setItemAsync(VARIANT_STORAGE_KEY, id);
    }
  } catch {
    // ignore
  }
}

async function writeBackgroundPattern(pattern: BackgroundPattern): Promise<void> {
  try {
    if (await SecureStore.isAvailableAsync()) {
      await SecureStore.setItemAsync(BG_PATTERN_STORAGE_KEY, pattern);
    }
  } catch {
    // ignore
  }
}

async function readCardStyle(): Promise<CardStyle> {
  try {
    if (!(await SecureStore.isAvailableAsync())) return 'classic';
    const raw = await SecureStore.getItemAsync(CARD_STYLE_STORAGE_KEY);
    if (raw && (CARD_STYLE_VALUES as string[]).includes(raw)) {
      return raw as CardStyle;
    }
  } catch {
    // fallback
  }
  return 'classic';
}

async function writeCardStyle(style: CardStyle): Promise<void> {
  try {
    if (await SecureStore.isAvailableAsync()) {
      await SecureStore.setItemAsync(CARD_STYLE_STORAGE_KEY, style);
    }
  } catch {
    // ignore
  }
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useSystemColorScheme();
  const [preference, setPreferenceState] = useState<ThemePreference>('system');
  const [variantId, setVariantIdState] = useState<ThemeVariantId>('default');
  const [backgroundPattern, setBackgroundPatternState] = useState<BackgroundPattern>('medium');
  const [cardStyle, setCardStyleState] = useState<CardStyle>('classic');

  useEffect(() => {
    void Promise.all([
      readPreference(),
      readVariantId(),
      readBackgroundPattern(),
      readCardStyle(),
    ]).then(([pref, variant, pattern, card]) => {
      setPreferenceState(pref);
      setVariantIdState(variant);
      setBackgroundPatternState(pattern);
      setCardStyleState(card);
    });
  }, []);

  const setPreference = useCallback((pref: ThemePreference) => {
    setPreferenceState(pref);
    void writePreference(pref);
  }, []);

  const setVariantId = useCallback((id: ThemeVariantId) => {
    setVariantIdState(id);
    void writeVariantId(id);
  }, []);

  const setBackgroundPattern = useCallback((pattern: BackgroundPattern) => {
    setBackgroundPatternState(pattern);
    void writeBackgroundPattern(pattern);
  }, []);

  const setCardStyle = useCallback((style: CardStyle) => {
    setCardStyleState(style);
    void writeCardStyle(style);
  }, []);

  const colorScheme: ColorScheme = useMemo(() => {
    if (preference === 'system') {
      return systemScheme === 'dark' ? 'dark' : 'light';
    }
    return preference;
  }, [preference, systemScheme]);

  const isDark = colorScheme === 'dark';

  const colors = useMemo(
    () => resolvePalette(variantId, colorScheme),
    [variantId, colorScheme],
  );

  const sprayOpacity = useMemo(
    () => BG_PATTERN_OPACITY[backgroundPattern][isDark ? 'dark' : 'light'],
    [backgroundPattern, isDark],
  );

  const value = useMemo(
    () => ({
      variantId,
      setVariantId,
      preference,
      setPreference,
      backgroundPattern,
      setBackgroundPattern,
      cardStyle,
      setCardStyle,
      sprayOpacity,
      colorScheme,
      colors,
      isDark,
    }),
    [
      variantId,
      setVariantId,
      preference,
      setPreference,
      backgroundPattern,
      setBackgroundPattern,
      cardStyle,
      setCardStyle,
      sprayOpacity,
      colorScheme,
      colors,
      isDark,
    ],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return ctx;
}

export function useOdosColors(): OdosColorPalette {
  return useTheme().colors;
}
