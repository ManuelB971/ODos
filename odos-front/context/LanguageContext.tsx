import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { I18nManager } from 'react-native';
import * as Localization from 'expo-localization';
import * as SecureStore from 'expo-secure-store';

import i18n, {
  DEFAULT_LANGUAGE,
  isRtlLanguage,
  isSupportedLanguage,
  type SupportedLanguage,
} from '@/i18n';

const STORAGE_KEY = 'odos_language';

/** `system` = suivre la langue de l'appareil ; sinon langue forcée. */
export type LanguagePreference = SupportedLanguage | 'system';

type LanguageContextValue = {
  /** Préférence brute choisie par l'utilisateur (peut être `system`). */
  preference: LanguagePreference;
  /** Langue effectivement appliquée (jamais `system`). */
  language: SupportedLanguage;
  setLanguage: (pref: LanguagePreference) => void;
  isRTL: boolean;
  /** `true` si le dernier changement de direction nécessite un redémarrage. */
  rtlRestartPending: boolean;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

/** Locale appareil → langue supportée, repli sur la langue par défaut. */
function deviceLanguage(): SupportedLanguage {
  const code = Localization.getLocales()[0]?.languageCode ?? DEFAULT_LANGUAGE;
  return isSupportedLanguage(code) ? code : DEFAULT_LANGUAGE;
}

function resolveLanguage(pref: LanguagePreference): SupportedLanguage {
  return 'system' === pref ? deviceLanguage() : pref;
}

async function readPreference(): Promise<LanguagePreference> {
  try {
    if (!(await SecureStore.isAvailableAsync())) return 'system';
    const raw = await SecureStore.getItemAsync(STORAGE_KEY);
    if ('system' === raw || (raw && isSupportedLanguage(raw))) return raw;
  } catch {
    // fallback
  }
  return 'system';
}

async function writePreference(pref: LanguagePreference): Promise<void> {
  try {
    if (await SecureStore.isAvailableAsync()) {
      await SecureStore.setItemAsync(STORAGE_KEY, pref);
    }
  } catch {
    // ignore
  }
}

/**
 * Applique la langue à i18next et la direction (LTR/RTL) à React Native.
 * `forceRTL` ne prend pleinement effet qu'après un redémarrage de l'app : on
 * renvoie `true` si la direction a changé pour pouvoir en informer l'utilisateur.
 */
function applyLanguage(lang: SupportedLanguage): boolean {
  if (i18n.language !== lang) {
    void i18n.changeLanguage(lang);
  }
  const shouldRTL = isRtlLanguage(lang);
  I18nManager.allowRTL(shouldRTL);
  if (I18nManager.isRTL !== shouldRTL) {
    I18nManager.forceRTL(shouldRTL);
    return true; // bascule de direction → redémarrage requis pour un rendu complet
  }
  return false;
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [preference, setPreferenceState] = useState<LanguagePreference>('system');
  const [language, setLanguageState] = useState<SupportedLanguage>(i18n.language as SupportedLanguage);
  const [rtlRestartPending, setRtlRestartPending] = useState(false);

  useEffect(() => {
    void readPreference().then((pref) => {
      const resolved = resolveLanguage(pref);
      const needsRestart = applyLanguage(resolved);
      setPreferenceState(pref);
      setLanguageState(resolved);
      setRtlRestartPending(needsRestart);
    });
  }, []);

  const setLanguage = useCallback((pref: LanguagePreference) => {
    const resolved = resolveLanguage(pref);
    const needsRestart = applyLanguage(resolved);
    setPreferenceState(pref);
    setLanguageState(resolved);
    setRtlRestartPending((prev) => prev || needsRestart);
    void writePreference(pref);
  }, []);

  const value = useMemo<LanguageContextValue>(
    () => ({
      preference,
      language,
      setLanguage,
      isRTL: isRtlLanguage(language),
      rtlRestartPending,
    }),
    [preference, language, setLanguage, rtlRestartPending],
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return ctx;
}
