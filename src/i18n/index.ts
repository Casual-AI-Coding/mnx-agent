import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import enJson from './locales/en.json'
import zhJson from './locales/zh.json'

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: enJson },
      zh: { translation: zhJson },
    },
    lng: 'zh',
    fallbackLng: 'zh',
    interpolation: {
      escapeValue: false,
    },
  })

export default i18n
