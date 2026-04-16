import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

i18n
  .use(initReactI18next)
  .init({
    fallbackLng: 'de',
    lng: typeof navigator !== 'undefined' && navigator.language.toLowerCase().startsWith('ru') ? 'ru' : 'de',
    debug: false,
    resources: {
      de: { translation: {} },
      ru: { translation: {} },
    },
  });

export default i18n;
