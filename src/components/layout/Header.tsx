import { Key, Globe, ChevronDown, X, History, Server, Cloud, LogOut, User, Check, Sparkles } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence } from 'framer-motion'
import { useAppStore, type ApiMode } from '@/stores/app'
import { useAuthStore } from '@/stores/auth'

interface HeaderProps {
  onHistoryClick?: () => void
}

export default function Header({ onHistoryClick }: HeaderProps) {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const { apiKey, region, apiMode, setApiKey, setRegion, setApiMode } = useAppStore()
  const { user, logout } = useAuthStore()
  const [showKeyModal, setShowKeyModal] = useState(false)
  const [showRegionDropdown, setShowRegionDropdown] = useState(false)
  const [showModeDropdown, setShowModeDropdown] = useState(false)
  const [showUserDropdown, setShowUserDropdown] = useState(false)
  const [showHistoryDropdown, setShowHistoryDropdown] = useState(false)
  const [tempKey, setTempKey] = useState(apiKey)

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  const currentLang = i18n.language === 'zh' ? 'zh' : 'en'

  const languages = [
    { code: 'zh', label: '中文', flag: '🇨🇳' },
    { code: 'en', label: 'English', flag: '🇺🇸' },
  ]

  return (
    <>
      <header className="fixed top-0 left-0 right-0 h-[60px] bg-card/80 backdrop-blur-xl border-b border-border/50 z-50">
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

          <div className="flex items-center gap-2">
            {}
            <div className="relative">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  const newLang = currentLang === 'zh' ? 'en' : 'zh'
                  i18n.changeLanguage(newLang)
                }}
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/50 rounded-lg transition-all border border-transparent hover:border-border/50"
                title={t('header.language')}
              >
                <span className="text-base">{languages.find(l => l.code === currentLang)?.flag}</span>
                <span className="text-xs font-medium uppercase">{currentLang}</span>
              </motion.button>
            </div>

            {}
            <div className="relative">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  setShowRegionDropdown(!showRegionDropdown)
                  setShowModeDropdown(false)
                  setShowUserDropdown(false)
                }}
                className="flex items-center justify-center w-9 h-9 text-muted-foreground hover:text-foreground hover:bg-secondary/50 rounded-lg transition-all border border-transparent hover:border-border/50"
                title={region === 'cn' ? t('header.regionCn') : t('header.regionIntl')}
              >
                <Globe className="w-[18px] h-[18px]" />
                <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-primary" />
              </motion.button>
              
              <AnimatePresence>
                {showRegionDropdown && (
                  <motion.div
                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="absolute top-full right-0 mt-2 w-36 bg-card/95 backdrop-blur-xl border border-border rounded-lg shadow-xl py-1"
                  >
                    <button
                      className={`w-full px-3 py-2 text-sm transition-colors flex items-center gap-2 ${
                        region === 'cn' ? 'text-foreground bg-primary/10' : 'text-muted-foreground hover:text-foreground hover:bg-primary/10'
                      }`}
                      onClick={() => {
                        setRegion('cn')
                        setShowRegionDropdown(false)
                      }}
                    >
                      {region === 'cn' && <Check className="w-3.5 h-3.5" />}
                      {region !== 'cn' && <span className="w-3.5 h-3.5" />}
                      {t('header.regionCn')}
                    </button>
                    <button
                      className={`w-full px-3 py-2 text-sm transition-colors flex items-center gap-2 ${
                        region === 'intl' ? 'text-foreground bg-primary/10' : 'text-muted-foreground hover:text-foreground hover:bg-primary/10'
                      }`}
                      onClick={() => {
                        setRegion('intl')
                        setShowRegionDropdown(false)
                      }}
                    >
                      {region === 'intl' && <Check className="w-3.5 h-3.5" />}
                      {region !== 'intl' && <span className="w-3.5 h-3.5" />}
                      {t('header.regionIntl')}
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {}
            <div className="relative">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  setShowModeDropdown(!showModeDropdown)
                  setShowRegionDropdown(false)
                  setShowUserDropdown(false)
                }}
                className="flex items-center justify-center w-9 h-9 text-muted-foreground hover:text-foreground hover:bg-secondary/50 rounded-lg transition-all border border-transparent hover:border-border/50"
                title={apiMode === 'direct' ? t('header.directApi') : t('header.localProxy')}
              >
                {apiMode === 'direct' ? <Cloud className="w-[18px] h-[18px]" /> : <Server className="w-[18px] h-[18px]" />}
              </motion.button>
              
              <AnimatePresence>
                {showModeDropdown && (
                  <motion.div
                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="absolute top-full right-0 mt-2 w-40 bg-card/95 backdrop-blur-xl border border-border rounded-lg shadow-xl py-1"
                  >
                    <button
                      className={`w-full px-3 py-2 text-sm transition-colors flex items-center gap-2 ${
                        apiMode === 'direct' ? 'text-foreground bg-primary/10' : 'text-muted-foreground hover:text-foreground hover:bg-primary/10'
                      }`}
                      onClick={() => {
                        setApiMode('direct')
                        setShowModeDropdown(false)
                      }}
                    >
                      {apiMode === 'direct' && <Check className="w-3.5 h-3.5" />}
                      {apiMode !== 'direct' && <span className="w-3.5 h-3.5" />}
                      <Cloud className="w-3.5 h-3.5" />
                      {t('header.directApi')}
                    </button>
                    <button
                      className={`w-full px-3 py-2 text-sm transition-colors flex items-center gap-2 ${
                        apiMode === 'proxy' ? 'text-foreground bg-primary/10' : 'text-muted-foreground hover:text-foreground hover:bg-primary/10'
                      }`}
                      onClick={() => {
                        setApiMode('proxy')
                        setShowModeDropdown(false)
                      }}
                    >
                      {apiMode === 'proxy' && <Check className="w-3.5 h-3.5" />}
                      {apiMode !== 'proxy' && <span className="w-3.5 h-3.5" />}
                      <Server className="w-3.5 h-3.5" />
                      {t('header.localProxy')}
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {}
            <div className="relative">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowKeyModal(true)}
                className="flex items-center justify-center w-9 h-9 text-muted-foreground hover:text-foreground hover:bg-secondary/50 rounded-lg transition-all border border-transparent hover:border-border/50"
                title={apiKey ? t('header.apiKeyConfigured') : t('header.configKey')}
              >
                <Key className="w-[18px] h-[18px]" />
                {apiKey && <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-green-500" />}
              </motion.button>
            </div>

            {}
            <div className="relative">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  setShowUserDropdown(!showUserDropdown)
                  setShowRegionDropdown(false)
                  setShowModeDropdown(false)
                }}
                className="flex items-center gap-2 px-2.5 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/50 rounded-lg transition-all border border-transparent hover:border-border/50"
              >
                <User className="w-[18px] h-[18px]" />
                <span className="max-w-[80px] truncate hidden sm:inline">{user?.username || '用户'}</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                  user?.role === 'super' ? 'bg-red-500/20 text-red-400' :
                  user?.role === 'admin' ? 'bg-orange-500/20 text-orange-400' :
                  user?.role === 'pro' ? 'bg-purple-500/20 text-purple-400' :
                  'bg-blue-500/20 text-blue-400'
                }`}>
                  {user?.role || 'user'}
                </span>
              </motion.button>
              
              <AnimatePresence>
                {showUserDropdown && (
                  <motion.div
                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="absolute top-full right-0 mt-2 w-48 bg-card/95 backdrop-blur-xl border border-border rounded-lg shadow-xl py-1"
                  >
                    <div className="px-3 py-2 border-b border-border">
                      <p className="text-sm font-medium text-foreground">{user?.username}</p>
                      <p className="text-xs text-muted-foreground/70">{user?.email || '无邮箱'}</p>
                    </div>
                    <button
                      onClick={handleLogout}
                      className="w-full px-3 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors flex items-center gap-2"
                    >
                      <LogOut className="w-4 h-4" />
                      退出登录
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {}
        {(showRegionDropdown || showModeDropdown || showUserDropdown) && (
          <div
            className="fixed inset-0 z-40"
            onClick={() => {
              setShowRegionDropdown(false)
              setShowModeDropdown(false)
              setShowUserDropdown(false)
            }}
          />
        )}

        {}
        {showKeyModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60]"
            onClick={() => setShowKeyModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-card/95 backdrop-blur-xl rounded-xl p-6 w-[420px] border border-border shadow-2xl"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                  <Key className="w-5 h-5 text-primary" />
                  {t('header.apiKeyTitle')}
                </h2>
                <button
                  onClick={() => setShowKeyModal(false)}
                  className="p-1 hover:bg-primary/10 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-muted-foreground/70 hover:text-foreground" />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-muted-foreground/70 mb-2">{t('header.apiKeyLabel')}</label>
                  <input
                    type="password"
                    value={tempKey}
                    onChange={(e) => setTempKey(e.target.value)}
                    placeholder={t('header.apiKeyPlaceholder')}
                    className="w-full px-4 py-2.5 bg-secondary/50 border border-border rounded-lg text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                  />
                </div>
                <div className="flex gap-3 justify-end pt-2">
                  <button
                    onClick={() => setShowKeyModal(false)}
                    className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground border border-border rounded-lg hover:bg-secondary/50 transition-all"
                  >
                    {t('common.cancel')}
                  </button>
                  <button
                    onClick={() => {
                      setApiKey(tempKey)
                      setShowKeyModal(false)
                    }}
                    className="px-4 py-2 text-sm bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg transition-all"
                  >
                    {t('common.save')}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </header>

      {}
      {onHistoryClick && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed bottom-6 right-6 z-40"
        >
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowHistoryDropdown(!showHistoryDropdown)}
            className="relative flex items-center justify-center w-11 h-11 bg-card/90 backdrop-blur-xl border border-border/50 rounded-full shadow-lg shadow-black/10 hover:shadow-xl hover:shadow-primary/20 hover:border-primary/30 transition-all group"
          >
            <History className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
            <motion.div
              className="absolute inset-0 rounded-full bg-primary/10"
              initial={{ scale: 0.8, opacity: 0 }}
              whileHover={{ scale: 1.2, opacity: 1 }}
              transition={{ duration: 0.3 }}
            />
          </motion.button>

          <AnimatePresence>
            {showHistoryDropdown && (
              <motion.div
                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                className="absolute top-full right-0 mt-3 w-64 bg-card/95 backdrop-blur-xl border border-border rounded-xl shadow-2xl py-3"
              >
                <div className="px-4 pb-2 border-b border-border/50 mb-2">
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <History className="w-4 h-4 text-primary" />
                    {t('common.history')}
                  </h3>
                </div>
                <div className="px-2">
                  <button
                    onClick={() => {
                      onHistoryClick()
                      setShowHistoryDropdown(false)
                    }}
                    className="w-full px-3 py-2.5 text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/50 rounded-lg transition-colors flex items-center gap-3"
                  >
                    <Sparkles className="w-4 h-4" />
                    查看历史记录
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {}
          {showHistoryDropdown && (
            <div
              className="fixed inset-0 z-30"
              onClick={() => setShowHistoryDropdown(false)}
            />
          )}
        </motion.div>
      )}
    </>
  )
}
