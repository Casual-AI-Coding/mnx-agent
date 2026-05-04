import i18n, { type Callback } from 'i18next'
import { initReactI18next } from 'react-i18next'
import zhJson from './locales/zh.json'

// 默认语言 zh 直接打包，en 按需动态加载
i18n
  .use(initReactI18next)
  .init({
    resources: {
      zh: { translation: zhJson },
    },
    lng: 'zh',
    fallbackLng: 'zh',
    interpolation: {
      escapeValue: false,
    },
  })

// 拦截 changeLanguage，确保切换语言时动态加载对应语言包
const origChangeLanguage = i18n.changeLanguage.bind(i18n)
i18n.changeLanguage = async (lng?: string, callback?: Callback) => {
  if (lng && lng !== 'zh' && !i18n.hasResourceBundle(lng, 'translation')) {
    try {
      const mod = await import(`./locales/${lng}.json`)
      i18n.addResourceBundle(lng, 'translation', (mod as { default: Record<string, unknown> }).default, true, true)
    } catch {
      // 语言包加载失败时回退到 zh
      return origChangeLanguage('zh', callback)
    }
  }
  return origChangeLanguage(lng, callback)
}

export default i18n
