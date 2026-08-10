import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import en from '../locales/en.json';
import am from '../locales/am.json';
import ti from '../locales/ti.json';
import om from '../locales/om.json';

/** Languages offered in the UI (label is written in its own language). */
export const SUPPORTED_LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'am', label: 'አማርኛ' },
  { code: 'ti', label: 'ትግርኛ' },
  { code: 'om', label: 'Afaan Oromoo' },
] as const;

export type LanguageCode = (typeof SUPPORTED_LANGUAGES)[number]['code'];

/**
 * i18next initialization:
 * - Bundles the translation JSON files (no runtime fetch needed)
 * - Detects the browser language (localStorage choice first, then navigator)
 * - Falls back to English when a language is missing
 * - Persists the user's choice in localStorage under "app_language"
 */
void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      am: { translation: am },
      ti: { translation: ti },
      om: { translation: om },
    },
    fallbackLng: 'en',
    supportedLngs: ['en', 'am', 'ti', 'om'],
    load: 'languageOnly', // 'en-US' -> 'en'
    nonExplicitSupportedLngs: true,
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
      lookupLocalStorage: 'app_language',
    },
    interpolation: {
      // React already escapes output; no need to escape values here
      escapeValue: false,
    },
  });

export default i18n;
