import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from './locales/en.json';
import fr from './locales/fr.json';
import ar from './locales/ar.json';

/** Langues supportées (slugs ISO 639-1). `fr` = source de vérité des clés. */
export const SUPPORTED_LANGUAGES = ['fr', 'en', 'ar'] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

/** Langues à écriture droite-à-gauche (mise en page miroir). */
export const RTL_LANGUAGES: SupportedLanguage[] = ['ar'];

export const DEFAULT_LANGUAGE: SupportedLanguage = 'fr';

export function isSupportedLanguage(value: string): value is SupportedLanguage {
  return (SUPPORTED_LANGUAGES as readonly string[]).includes(value);
}

export function isRtlLanguage(lang: SupportedLanguage): boolean {
  return RTL_LANGUAGES.includes(lang);
}

// Initialisation synchrone : i18n doit être prêt avant le premier rendu.
// La langue effective est ensuite ajustée par le LanguageProvider (préférence
// stockée ou locale de l'appareil).
if (!i18n.isInitialized) {
  // eslint-disable-next-line import/no-named-as-default-member -- `i18n.use()` est l'API de chaînage i18next, pas l'export nommé `use`.
  void i18n.use(initReactI18next).init({
    resources: {
      fr: { translation: fr },
      en: { translation: en },
      ar: { translation: ar },
    },
    lng: DEFAULT_LANGUAGE,
    fallbackLng: DEFAULT_LANGUAGE,
    supportedLngs: SUPPORTED_LANGUAGES,
    interpolation: { escapeValue: false },
    returnNull: false,
  });
}

export default i18n;
