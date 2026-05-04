import { useTranslation } from 'react-i18next'
import { switchLanguage } from '@/i18n'
import { Globe, ChevronDown } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'

export default function LanguageSwitcher() {
  const { t, i18n } = useTranslation()
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const currentLanguage = i18n.language

  const languages = [
    { code: 'zh', label: t('languageSwitcher.chinese') },
    { code: 'en', label: t('languageSwitcher.english') },
  ]

  const handleLanguageChange = (lang: string) => {
    switchLanguage(lang)
    setIsOpen(false)
  }

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/50 rounded-lg transition-all border border-border hover:border-border/70"
        title={t('languageSwitcher.switchLanguage')}
      >
        <Globe className="w-4 h-4" />
        <span>{currentLanguage === 'zh' ? t('languageSwitcher.chinese') : t('languageSwitcher.english')}</span>
        <ChevronDown className={`w-3 h-3 opacity-60 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-2 w-32 bg-card/95 backdrop-blur-xl border border-border rounded-lg shadow-xl py-1 z-50">
          {languages.map((lang) => (
            <button
              key={lang.code}
              onClick={() => handleLanguageChange(lang.code)}
              className={`w-full px-3 py-2 text-sm transition-colors flex items-center gap-2 ${
                currentLanguage === lang.code
                  ? 'text-foreground bg-primary/10'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
              }`}
            >
              <span className="w-4 h-4 flex items-center justify-center">
                {currentLanguage === lang.code && '✓'}
              </span>
              {lang.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
