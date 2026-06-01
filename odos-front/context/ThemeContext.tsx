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

import { Colors } from '@/constants/theme';

export type ThemePreference = 'system' | 'light' | 'dark';
export type OdosColorPalette = (typeof Colors)['light'];

const STORAGE_KEY = 'odos_theme_preference';

type ThemeContextValue = {
  preference: ThemePreference;
  setPreference: (pref: ThemePreference) => void;
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
    // fallback system
  }
  return 'system';
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

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useSystemColorScheme();
  const [preference, setPreferenceState] = useState<ThemePreference>('system');

  useEffect(() => {
    readPreference().then(setPreferenceState);
  }, []);

  const setPreference = useCallback((pref: ThemePreference) => {
    setPreferenceState(pref);
    void writePreference(pref);
  }, []);

  const isDark = useMemo(() => {
    const scheme = preference === 'system' ? systemScheme : preference;
    return scheme === 'dark';
  }, [preference, systemScheme]);

  const colors = useMemo(
    () => (isDark ? Colors.dark : Colors.light),
    [isDark],
  );

  const value = useMemo(
    () => ({ preference, setPreference, colors, isDark }),
    [preference, setPreference, colors, isDark],
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
