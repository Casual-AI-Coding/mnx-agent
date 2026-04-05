import * as React from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Dialog, DialogHeader, DialogFooter } from '@/components/ui/Dialog'
import { Button } from '@/components/ui/Button'
import { Sparkles, Settings, Rocket } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface WelcomeModalProps {
  open: boolean
  onClose: () => void
  onDontShowAgain: (checked: boolean) => void
  dontShowAgain: boolean
}

export function WelcomeModal({
  open,
  onClose,
  onDontShowAgain,
  dontShowAgain,
}: WelcomeModalProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()

  const handleSetApiKey = () => {
    onClose()
    navigate('/settings')
  }

  const handleStartExploring = () => {
    onClose()
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      size="lg"
      className="sm:max-w-xl"
    >
      <div className="space-y-6">
        <div className="relative">
          <div className="absolute -top-2 -left-2 w-20 h-20 bg-gradient-to-br from-primary-500/20 to-purple-500/20 rounded-full blur-2xl" />
          <DialogHeader className="relative">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-gradient-to-br from-primary-500 to-purple-600">
                <Sparkles className="w-6 h-6 text-primary-foreground" />
              </div>
              <h2 className="text-2xl font-bold bg-gradient-to-r from-white to-dark-200 bg-clip-text text-transparent">
                {t('onboarding.welcomeTitle', '欢迎使用 MiniMax AI 工具集')}
              </h2>
            </div>
            <p className="text-dark-400 text-sm leading-relaxed">
              {t('onboarding.welcomeDescription', '这是一个强大的 AI 工具集，支持文本对话、语音合成、图像生成、音乐创作和视频生成。内置定时任务调度系统，让 AI 能力自动化运行。')}
            </p>
          </DialogHeader>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            onClick={handleSetApiKey}
            className={cn(
              'group relative flex flex-col items-start gap-2 p-4 rounded-lg',
              'border border-dark-700 bg-dark-800/50',
              'hover:border-primary-500/50 hover:bg-dark-800',
              'transition-all duration-200 text-left'
            )}
          >
            <div className="flex items-center gap-2">
              <Settings className="w-5 h-5 text-primary-400 group-hover:rotate-12 transition-transform" />
              <span className="font-medium text-primary-foreground">
                {t('onboarding.setApiKey', '设置 API Key')}
              </span>
            </div>
            <span className="text-xs text-dark-500">
              {t('onboarding.setApiKeyDesc', '配置 MiniMax API 以开始使用')}
            </span>
          </button>

          <button
            onClick={handleStartExploring}
            className={cn(
              'group relative flex flex-col items-start gap-2 p-4 rounded-lg',
              'border border-dark-700 bg-dark-800/50',
              'hover:border-success/50 hover:bg-dark-800',
              'transition-all duration-200 text-left'
            )}
          >
            <div className="flex items-center gap-2">
              <Rocket className="w-5 h-5 text-success group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
              <span className="font-medium text-primary-foreground">
                {t('onboarding.startExploring', '开始使用')}
              </span>
            </div>
            <span className="text-xs text-dark-500">
              {t('onboarding.startExploringDesc', '直接探索各项功能')}
            </span>
          </button>
        </div>

        <DialogFooter className="flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-dark-800">
          <label className="flex items-center gap-2 cursor-pointer group">
            <input
              type="checkbox"
              checked={dontShowAgain}
              onChange={(e) => onDontShowAgain(e.target.checked)}
              className={cn(
                'w-4 h-4 rounded border border-dark-600',
                'bg-dark-800 text-primary-500',
                'focus:ring-2 focus:ring-primary-500/20 focus:ring-offset-0',
                'transition-colors cursor-pointer'
              )}
            />
            <span className="text-sm text-dark-400 group-hover:text-dark-300 transition-colors">
              {t('onboarding.dontShowAgain', '不再显示')}
            </span>
          </label>

          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-dark-400 hover:text-white"
          >
            {t('common.close', '关闭')}
          </Button>
        </DialogFooter>
      </div>
    </Dialog>
  )
}
