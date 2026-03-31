import { Key, Globe, Languages, ChevronDown, X, History, Server, Cloud } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAppStore, type ApiMode } from '@/stores/app'
import LanguageSwitcher from '@/components/shared/LanguageSwitcher'

interface HeaderProps {
  onHistoryClick?: () => void
}

export default function Header({ onHistoryClick }: HeaderProps) {
  const { t } = useTranslation()
  const { apiKey, region, apiMode, setApiKey, setRegion, setApiMode } = useAppStore()
  const [showKeyModal, setShowKeyModal] = useState(false)
  const [showRegionDropdown, setShowRegionDropdown] = useState(false)
  const [showLanguageDropdown, setShowLanguageDropdown] = useState(false)
  const [showModeDropdown, setShowModeDropdown] = useState(false)
  const [tempKey, setTempKey] = useState(apiKey)

  return (
    <header className="fixed top-0 left-0 right-0 h-[60px] bg-dark-950/80 backdrop-blur-xl border-b border-dark-800/50 z-50">
      <div className="h-full flex items-center justify-between px-6">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
            <svg
              width="32"
              height="32"
              viewBox="0 0 32 32"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="shrink-0"
            >
              <defs>
                <linearGradient id="minimaxGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#6366f1" />
                  <stop offset="50%" stopColor="#a855f7" />
                  <stop offset="100%" stopColor="#ec4899" />
                </linearGradient>
              </defs>
              <circle cx="16" cy="16" r="14" stroke="url(#minimaxGradient)" strokeWidth="2" fill="none" />
              <circle cx="16" cy="16" r="6" fill="url(#minimaxGradient)" />
            </svg>
            <span className="text-xl font-bold bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              Mnx-Agent 工作台
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <LanguageSwitcher />          <div className="relative">
            <button
              onClick={() => {
                setShowRegionDropdown(!showRegionDropdown)
                setShowLanguageDropdown(false)
                setShowModeDropdown(false)
              }}
              className="flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:text-white hover:bg-white/5 rounded-lg transition-all border border-gray-700 hover:border-gray-500"
            >
              <Globe className="w-4 h-4" />
              <span>{region === 'cn' ? t('header.regionCn') : t('header.regionIntl')}</span>
              <ChevronDown className="w-3 h-3 opacity-60" />
            </button>
            {showRegionDropdown && (
              <div className="absolute top-full right-0 mt-2 w-32 bg-gray-900/95 backdrop-blur-xl border border-gray-700 rounded-lg shadow-xl py-1">
                <button
                  className={`w-full px-3 py-2 text-sm transition-colors flex items-center gap-2 ${
                    region === 'cn' ? 'text-white bg-white/10' : 'text-gray-300 hover:text-white hover:bg-white/10'
                  }`}
                  onClick={() => {
                    setRegion('cn')
                    setShowRegionDropdown(false)
                  }}
                >
                  {region === 'cn' && <span className="w-4 h-4 flex items-center justify-center">✓</span>}
                  {region !== 'cn' && <span className="w-4 h-4"></span>}
                  {t('header.regionCn')}
                </button>
                <button
                  className={`w-full px-3 py-2 text-sm transition-colors flex items-center gap-2 ${
                    region === 'intl' ? 'text-white bg-white/10' : 'text-gray-300 hover:text-white hover:bg-white/10'
                  }`}
                  onClick={() => {
                    setRegion('intl')
                    setShowRegionDropdown(false)
                  }}
                >
                  {region === 'intl' && <span className="w-4 h-4 flex items-center justify-center">✓</span>}
                  {region !== 'intl' && <span className="w-4 h-4"></span>}
                  {t('header.regionIntl')}
                </button>
              </div>
            )}
          </div>

          <div className="relative">
            <button
              onClick={() => {
                setShowModeDropdown(!showModeDropdown)
                setShowRegionDropdown(false)
                setShowLanguageDropdown(false)
              }}
              className="flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:text-white hover:bg-white/5 rounded-lg transition-all border border-gray-700 hover:border-gray-500"
            >
              {apiMode === 'direct' ? <Cloud className="w-4 h-4" /> : <Server className="w-4 h-4" />}
              <span>{apiMode === 'direct' ? t('header.modeDirect') : t('header.modeProxy')}</span>
              <ChevronDown className="w-3 h-3 opacity-60" />
            </button>
            {showModeDropdown && (
              <div className="absolute top-full right-0 mt-2 w-40 bg-gray-900/95 backdrop-blur-xl border border-gray-700 rounded-lg shadow-xl py-1">
                <button
                  className={`w-full px-3 py-2 text-sm transition-colors flex items-center gap-2 ${
                    apiMode === 'direct' ? 'text-white bg-white/10' : 'text-gray-300 hover:text-white hover:bg-white/10'
                  }`}
                  onClick={() => {
                    setApiMode('direct')
                    setShowModeDropdown(false)
                  }}
                >
                  {apiMode === 'direct' && <span className="w-4 h-4 flex items-center justify-center">✓</span>}
                  {apiMode !== 'direct' && <span className="w-4 h-4"></span>}
                  <Cloud className="w-3 h-3" />
                  {t('header.directApi')}
                </button>
                <button
                  className={`w-full px-3 py-2 text-sm transition-colors flex items-center gap-2 ${
                    apiMode === 'proxy' ? 'text-white bg-white/10' : 'text-gray-300 hover:text-white hover:bg-white/10'
                  }`}
                  onClick={() => {
                    setApiMode('proxy')
                    setShowModeDropdown(false)
                  }}
                >
                  {apiMode === 'proxy' && <span className="w-4 h-4 flex items-center justify-center">✓</span>}
                  {apiMode !== 'proxy' && <span className="w-4 h-4"></span>}
                  <Server className="w-3 h-3" />
                  {t('header.localProxy')}
                </button>
              </div>
            )}
          </div>

          <button
            onClick={() => setShowKeyModal(true)}
            className="flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:text-white hover:bg-white/5 rounded-lg transition-all border border-gray-700 hover:border-gray-500"
          >
            <Key className="w-4 h-4" />
            <span>{apiKey ? t('header.configured') : t('header.configKey')}</span>
          </button>

          {onHistoryClick && (
            <button
              onClick={onHistoryClick}
              className="flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:text-white hover:bg-white/5 rounded-lg transition-all border border-gray-700 hover:border-gray-500"
            >
              <History className="w-4 h-4" />
              <span>{t('common.history')}</span>
            </button>
          )}
        </div>
      </div>

      {(showLanguageDropdown || showRegionDropdown || showModeDropdown) && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => {
            setShowLanguageDropdown(false)
            setShowRegionDropdown(false)
            setShowModeDropdown(false)
          }}
        />
      )}

      {showKeyModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60]">
          <div className="bg-gray-900/95 backdrop-blur-xl rounded-xl p-6 w-[420px] border border-gray-700 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-white">{t('header.apiKeyTitle')}</h2>
              <button
                onClick={() => setShowKeyModal(false)}
                className="p-1 hover:bg-white/10 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-400 hover:text-white" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-2">{t('header.apiKeyLabel')}</label>
                <input
                  type="password"
                  value={tempKey}
                  onChange={(e) => setTempKey(e.target.value)}
                  placeholder={t('header.apiKeyPlaceholder')}
                  className="w-full px-4 py-2.5 bg-gray-800/50 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                />
              </div>
              <div className="flex gap-3 justify-end pt-2">
                <button
                  onClick={() => setShowKeyModal(false)}
                  className="px-4 py-2 text-sm text-gray-300 hover:text-white border border-gray-600 rounded-lg hover:bg-white/5 transition-all"
                >
                  {t('common.cancel')}
                </button>
                <button
                  onClick={() => {
                    setApiKey(tempKey)
                    setShowKeyModal(false)
                  }}
                  className="px-4 py-2 text-sm bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white rounded-lg transition-all shadow-lg shadow-indigo-500/25"
                >
                  {t('common.save')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  )
}
