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

import { resolvePalette } from '@/constants/themes/registry';
import type {
  ColorScheme,
  OdosColorPalette,
  ThemePreference,
  ThemeVariantId,
} from '@/constants/themes/types';

const STORAGE_KEY = 'odos_theme_preference';
const VARIANT_STORAGE_KEY = 'odos_theme_variant';

export type { OdosColorPalette, ThemePreference, ThemeVariantId };

type ThemeContextValue = {
  /** Variante visuelle (ville / pays) — `default` pour l’instant. */
  variantId: ThemeVariantId;
  setVariantId: (id: ThemeVariantId) => void;
  preference: ThemePreference;
  setPreference: (pref: ThemePreference) => void;
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
    if (raw === 'default') return raw;
  } catch {
    // fallback
  }
  return 'default';
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

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useSystemColorScheme();
  const [preference, setPreferenceState] = useState<ThemePreference>('system');
  const [variantId, setVariantIdState] = useState<ThemeVariantId>('default');

  useEffect(() => {
    void Promise.all([readPreference(), readVariantId()]).then(([pref, variant]) => {
      setPreferenceState(pref);
      setVariantIdState(variant);
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

  const value = useMemo(
    () => ({
      variantId,
      setVariantId,
      preference,
      setPreference,
      colorScheme,
      colors,
      isDark,
    }),
    [variantId, setVariantId, preference, setPreference, colorScheme, colors, isDark],
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
