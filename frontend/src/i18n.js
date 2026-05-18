import LanguageDetector from 'i18next-browser-languagedetector';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Importing translation files
import translationEN from './locales/en/translation.json';
import translationDE from './locales/de/translation.json';

//Creating object with the variables of imported translation files
const resources = {
  en: {
    translation: translationEN,
  },
  de: {
    translation: translationDE,
  },
};

//i18N Initialization

i18n
  .use(initReactI18next)
  .use(LanguageDetector)
  .init({
    resources,
    fallbackLng: 'en', //default language
    keySeparator: false,
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;
