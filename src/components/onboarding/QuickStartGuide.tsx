import * as React from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { Key, MessageSquare, Calendar, FolderOpen, CheckCircle2, Circle, ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/Button'
import { status, services } from '@/themes/tokens'

export interface QuickStartStep {
  id: string
  title: string
  description: string
  icon: typeof Key
  path: string
  color: string
  completed: boolean
}

export interface QuickStartGuideProps {
  onStepClick?: (stepId: string) => void
  completedSteps?: string[]
  className?: string
}

export function QuickStartGuide({
  onStepClick,
  completedSteps = [],
  className,
}: QuickStartGuideProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()

  const steps: QuickStartStep[] = [
    {
      id: 'api-key',
      title: t('onboarding.stepApiKey', '配置 API Key'),
      description: t('onboarding.stepApiKeyDesc', '设置 MiniMax API 密钥以访问所有 AI 功能'),
      icon: Key,
      path: '/settings',
      color: status.warning.icon,
      completed: completedSteps.includes('api-key'),
    },
    {
      id: 'text-gen',
      title: t('onboarding.stepTextGen', '体验文本生成'),
      description: t('onboarding.stepTextGenDesc', '尝试与 AI 对话，生成创意内容'),
      icon: MessageSquare,
      path: '/text',
      color: status.info.icon,
      completed: completedSteps.includes('text-gen'),
    },
    {
      id: 'cron-schedule',
      title: t('onboarding.stepCron', '探索定时任务'),
      description: t('onboarding.stepCronDesc', '创建工作流，让 AI 任务自动运行'),
      icon: Calendar,
      path: '/cron',
      color: services.cron.icon,
      completed: completedSteps.includes('cron-schedule'),
    },
    {
      id: 'media-manage',
      title: t('onboarding.stepMedia', '管理生成内容'),
      description: t('onboarding.stepMediaDesc', '查看、下载和管理所有生成的媒体文件'),
      icon: FolderOpen,
      path: '/media',
      color: status.success.icon,
      completed: completedSteps.includes('media-manage'),
    },
  ]

  const completedCount = steps.filter((step) => step.completed).length
  const progress = (completedCount / steps.length) * 100

  const handleStepClick = (step: QuickStartStep) => {
    if (onStepClick) {
      onStepClick(step.id)
    }
    navigate(step.path)
  }

  return (
    <div className={cn('space-y-6', className)}>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-foreground">
            {t('onboarding.quickStartGuide', '快速入门指南')}
          </h3>
          <span className="text-sm text-muted-foreground">
            {completedCount}/{steps.length}
          </span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-primary-500 to-purple-500"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {steps.map((step, index) => (
          <motion.button
            key={step.id}
            onClick={() => handleStepClick(step)}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className={cn(
              'group relative flex items-start gap-4 p-4 rounded-lg text-left',
              'border border-muted bg-muted/30',
              'hover:border-primary-500/30 hover:bg-muted/50',
              'transition-all duration-200'
            )}
          >
            <div
              className={cn(
                'flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center',
                'bg-muted group-hover:scale-110 transition-transform',
                step.completed ? 'bg-success/20' : ''
              )}
            >
              {step.completed ? (
                <CheckCircle2 className="w-5 h-5 text-success" />
              ) : (
                <step.icon className={cn('w-5 h-5', step.color)} />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h4 className="font-medium text-foreground group-hover:text-primary-400 transition-colors">
                  {step.title}
                </h4>
                {step.completed && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-success/20 text-success">
                    {t('onboarding.completed', '已完成')}
                  </span>
                )}
              </div>
              <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                {step.description}
              </p>
            </div>

            <ArrowRight className="w-4 h-4 text-muted-foreground/50 group-hover:text-muted-foreground group-hover:translate-x-0.5 transition-all" />
          </motion.button>
        ))}
      </div>
    </div>
  )
}

export interface QuickStartGuideCompactProps {
  onDismiss?: () => void
  className?: string
}

export function QuickStartGuideCompact({ onDismiss, className }: QuickStartGuideCompactProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()

  const steps = [
    { id: 'api-key', title: t('onboarding.stepApiKey', '配置 API Key'), path: '/settings' },
    { id: 'text-gen', title: t('onboarding.stepTextGen', '体验文本生成'), path: '/text' },
    { id: 'cron', title: t('onboarding.stepCron', '探索定时任务'), path: '/cron' },
    { id: 'media', title: t('onboarding.stepMedia', '管理生成内容'), path: '/media' },
  ]

  return (
    <div className={cn('p-4 rounded-lg border border-muted bg-muted/50', className)}>
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-medium text-foreground">
          {t('onboarding.quickStart', '快速开始')}
        </h4>
        {onDismiss && (
          <Button variant="ghost" size="sm" onClick={onDismiss} className="h-6 px-2 text-xs">
            {t('common.dismiss', '隐藏')}
          </Button>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        {steps.map((step) => (
          <button
            key={step.id}
            onClick={() => navigate(step.path)}
            className="px-3 py-1.5 text-sm rounded-md bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-colors"
          >
            {step.title}
          </button>
        ))}
      </div>
    </div>
  )
}
