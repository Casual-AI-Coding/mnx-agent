import { useState, useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Key, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import Sidebar from './Sidebar'
import Header from './Header'
import HistoryPanel from './HistoryPanel'
import { PageHeader } from '@/components/shared/PageHeader'
import { getPageConfig } from '@/config/pages'
import { useSettingsStore } from '@/settings/store'
import { DEFAULT_SETTINGS } from '@/settings/store/defaults'
import { cn } from '@/lib/utils'

export default function AppLayout() {
  const { t, i18n } = useTranslation()
  const location = useLocation()
  const { settings, setCategory, initialize, saveSettings } = useSettingsStore()
  const apiKey = settings?.api?.minimaxKey ?? DEFAULT_SETTINGS.api.minimaxKey
  const setApiKey = (key: string) => setCategory('api', { minimaxKey: key })
  const [isHistoryOpen, setIsHistoryOpen] = useState(false)
  const [showKeyModal, setShowKeyModal] = useState(false)
  const [tempKey, setTempKey] = useState(apiKey)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)

  useEffect(() => {
    initialize()
  }, [initialize])

  const pageConfig = getPageConfig(location.pathname)
  const PageIcon = pageConfig?.icon

  const handleOpenKeyModal = () => {
    setTempKey(apiKey)
    setShowKeyModal(true)
  }

  const handleSaveApiKey = async () => {
    setApiKey(tempKey)
    await saveSettings('api')
    setShowKeyModal(false)
  }

  return (
    <div className="h-screen bg-background overflow-hidden">
      <Header onHistoryClick={() => setIsHistoryOpen(true)} onShowKeyModal={handleOpenKeyModal} />
      <Sidebar onCollapseChange={setIsSidebarCollapsed} />
      <main className={cn(
        'mt-[60px] h-[calc(100vh-60px)] bg-grid overflow-y-scroll custom-scrollbar transition-all duration-200',
        isSidebarCollapsed ? 'ml-[60px]' : 'ml-[220px]'
      )}>
        <div className="p-6 space-y-6">
          {pageConfig && PageIcon && (
            <PageHeader
              icon={<PageIcon className="w-5 h-5" />}
              title={pageConfig.title}
              description={pageConfig.description}
              gradient={pageConfig.gradient}
            />
          )}
          <Outlet />
        </div>
      </main>
      <HistoryPanel isOpen={isHistoryOpen} onClose={() => setIsHistoryOpen(false)} />

      {showKeyModal && (
        <div
          className="fixed inset-0 bg-foreground/10 backdrop-blur-sm z-[60] overflow-y-auto py-10"
          onClick={() => setShowKeyModal(false)}
        >
          <div className="min-h-full flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-card/95 backdrop-blur-xl rounded-xl p-6 w-[420px] border border-border shadow-2xl"
              onClick={(e) => e.stopPropagation()}
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
                    onClick={handleSaveApiKey}
                    className="px-4 py-2 text-sm bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg transition-all"
                  >
                    {t('common.save')}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      )}
    </div>
  )
}
