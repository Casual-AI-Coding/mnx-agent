import { Key, Globe, ChevronDown, X, History, Server, Cloud, LogOut, User, Check } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence } from 'framer-motion'
import { useSettingsStore } from '@/settings/store'
import { useAuthStore } from '@/stores/auth'
import { logout as logoutApi } from '@/lib/api/auth'
import { status, roles } from '@/themes/tokens'
import { cn } from '@/lib/utils'

interface HeaderProps {
  onHistoryClick?: () => void
  onShowKeyModal?: () => void
}

export default function Header({ onHistoryClick, onShowKeyModal }: HeaderProps) {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const { settings, setCategory } = useSettingsStore()
  const { minimaxKey: apiKey, region, mode: apiMode } = settings.api
  const setApiKey = (key: string) => setCategory('api', { minimaxKey: key })
  const setRegion = (region: 'cn' | 'intl') => setCategory('api', { region })
  const setApiMode = (mode: 'direct' | 'proxy') => setCategory('api', { mode })
  const { user, accessToken, logout } = useAuthStore()
  const [showRegionDropdown, setShowRegionDropdown] = useState(false)
  const [showModeDropdown, setShowModeDropdown] = useState(false)
  const [showUserDropdown, setShowUserDropdown] = useState(false)

  const handleLogout = async () => {
    try {
      if (accessToken) {
        await logoutApi(accessToken)
      }
    } catch {
      // Backend logout failed, still proceed with local logout
    }
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
                <span className="text-xl font-bold bg-gradient-to-r from-primary-400 via-secondary-400 to-rose-400 bg-clip-text text-transparent">
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
                onClick={onShowKeyModal}
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all border",
                  apiKey 
                    ? "text-success bg-success/10 border-success/20 hover:bg-success/20" 
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/50 border-transparent hover:border-border/50"
                )}
                title={apiKey ? t('header.apiKeyConfigured') : t('header.configKey')}
              >
                <Key className="w-[18px] h-[18px]" />
                <span className="text-sm font-medium">{apiKey ? '已设置' : '设置Key'}</span>
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
                  user?.role === 'super' ? cn(roles.super.bgLight, roles.super.text) :
                  user?.role === 'admin' ? cn(roles.admin.bgLight, roles.admin.text) :
                  user?.role === 'pro' ? cn(roles.pro.bgLight, roles.pro.text) :
                  cn(roles.user.bgLight, roles.user.text)
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
                      className="w-full px-3 py-2 text-sm text-destructive hover:text-destructive/80 hover:bg-destructive/10 transition-colors flex items-center gap-2"
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
      </header>

      {}
      {onHistoryClick && (
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          onClick={onHistoryClick}
          className="fixed bottom-6 right-6 z-40 flex items-center justify-center w-11 h-11 bg-card/90 backdrop-blur-xl border border-border/50 rounded-full shadow-lg shadow-background/20 hover:shadow-xl hover:shadow-primary/20 hover:border-primary/30 transition-all group"
        >
          <History className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
          <motion.div
            className="absolute inset-0 rounded-full bg-primary/10"
            initial={{ scale: 0.8, opacity: 0 }}
            whileHover={{ scale: 1.2, opacity: 1 }}
            transition={{ duration: 0.3 }}
          />
        </motion.button>
      )}
    </>
  )
}
