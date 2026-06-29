import i18n from 'i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import { initReactI18next } from 'react-i18next'

import en from './en.json'
import mk from './mk.json'

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      mk: { translation: mk },
      en: { translation: en },
    },
    fallbackLng: 'mk',
    interpolation: { escapeValue: false },
  })

export default i18n
