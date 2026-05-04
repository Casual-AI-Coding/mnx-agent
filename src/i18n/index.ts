import i18n from 'i18next'
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

// 动态切换语言并自动加载对应语言包
export async function switchLanguage(lng: string): Promise<unknown> {
  if (lng !== 'zh' && !i18n.hasResourceBundle(lng, 'translation')) {
    try {
      const mod = await import(`./locales/${lng}.json`)
      i18n.addResourceBundle(lng, 'translation', (mod as { default: Record<string, unknown> }).default, true, true)
    } catch {
      // 语言包加载失败时回退到 zh
      return i18n.changeLanguage('zh')
    }
  }
  return i18n.changeLanguage(lng)
}

export default i18n
