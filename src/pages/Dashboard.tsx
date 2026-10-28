import { useEffect, useMemo, useCallback, memo, useState } from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  MessageSquare, Mic, MicOff, Image, Music, Video, Film,
  User, FolderOpen, BarChart3, Zap,
  Wifi, WifiOff, Loader2, RefreshCw
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { WelcomeModal } from '@/components/onboarding/WelcomeModal'
import { ErrorBoundary, ErrorFallback } from '@/components/shared'
import { OperationsCards } from '@/components/dashboard/OperationsCards'
import { ServiceDistribution } from '@/components/dashboard/ServiceDistribution'
import { RecentFailures } from '@/components/dashboard/RecentFailures'
import { SystemHealthStrip } from '@/components/dashboard/SystemHealthStrip'
import { RecentActivityCard } from '@/components/dashboard/RecentActivityCard'
import { useHistoryStore } from '@/stores/history'
import { useWebSocket } from '@/hooks/useWebSocket'
import { getOperationsOverview, type OperationsOverview } from '@/lib/api/stats'
import type { ConnectionStatus } from '@/lib/websocket-client'
import { cn } from '@/lib/utils'
import { status as statusTokens } from '@/themes/tokens'

const ConnectionIndicator = memo(function ConnectionIndicator({ status }: { status: ConnectionStatus }) {
  const statusConfig: Record<ConnectionStatus, { icon: typeof Wifi; color: string; text: string }> = {
    connected: { icon: Wifi, color: statusTokens.success.icon, text: '已连接' },
    connecting: { icon: Loader2, color: `${statusTokens.warning.icon} animate-spin`, text: '连接中...' },
    reconnecting: { icon: Loader2, color: `${statusTokens.warning.icon} animate-spin`, text: '重连中...' },
    disconnected: { icon: WifiOff, color: 'text-destructive', text: '未连接' },
  }

  const config = statusConfig[status]

  return (
    <div className="flex items-center gap-2 text-sm">
      <config.icon className={`w-4 h-4 ${config.color}`} />
      <span className="text-muted-foreground/70">{config.text}</span>
    </div>
  )
})

/**
 * Dashboard 运营总览（R-005）：
 * 运营指标卡 + 服务分布 + 最近失败任务 + 系统健康（DLQ/容量风险），
 * 保留快捷入口、最近活动与欢迎引导。
 */
export default function Dashboard() {
  const { t } = useTranslation()
  const { items, addItem } = useHistoryStore()
  const hasCompletedOnboarding = localStorage.getItem('onboarding-complete') === 'true'
  const { status, events } = useWebSocket({
    channels: ['jobs', 'tasks'],
    showToasts: true,
  })
  const [showWelcomeModal, setShowWelcomeModal] = useState(false)
  const [dontShowAgain, setDontShowAgain] = useState(false)
  const [operations, setOperations] = useState<OperationsOverview | null>(null)
  const [operationsLoading, setOperationsLoading] = useState(true)

  const loadOperations = useCallback(async () => {
    setOperationsLoading(true)
    const result = await getOperationsOverview()
    setOperations(result.success ? result.data ?? null : null)
    setOperationsLoading(false)
  }, [])

  useEffect(() => {
    void loadOperations()
  }, [loadOperations])

  // 任务/作业事件到达时刷新运营指标（失败任务、DLQ 变化会反映在总览中）
  const [eventCount, setEventCount] = useState(0)
  useEffect(() => {
    if (events.length > 0 && events.length !== eventCount) {
      setEventCount(events.length)
      void loadOperations()
    }
  }, [events, eventCount, loadOperations])

  useEffect(() => {
    if (!hasCompletedOnboarding) {
      setShowWelcomeModal(true)
    }
  }, [hasCompletedOnboarding])

  const handleCloseWelcomeModal = () => {
    setShowWelcomeModal(false)
    if (dontShowAgain) {
      localStorage.setItem('onboarding-complete', 'true')
    }
  }

  const handleDontShowAgain = (checked: boolean) => {
    setDontShowAgain(checked)
  }

  // Memoized: only recalculates when items change
  const recentItems = useMemo(() => items.slice(-5).reverse(), [items])

  const quickActions = useMemo(() => [
    { title: t('dashboard.aiChatAndWriting'), desc: t('dashboard.aiChatAndWriting'), icon: MessageSquare, path: '/text', color: 'hover:border-primary' },
    { title: t('dashboard.realtimeVoiceSynthesis'), desc: t('dashboard.realtimeVoiceSynthesis'), icon: Mic, path: '/voice', color: 'hover:border-success' },
    { title: t('dashboard.batchVoiceSynthesis'), desc: t('dashboard.batchVoiceSynthesis'), icon: MicOff, path: '/voice-async', color: 'hover:border-info' },
    { title: t('dashboard.aiImageCreation'), desc: t('dashboard.aiImageCreation'), icon: Image, path: '/image', color: 'hover:border-accent' },
    { title: t('dashboard.aiMusicCreation'), desc: t('dashboard.aiMusicCreation'), icon: Music, path: '/music', color: 'hover:border-primary-400' },
    { title: t('dashboard.aiVideoCreation'), desc: t('dashboard.aiVideoCreation'), icon: Video, path: '/video', color: 'hover:border-destructive' },
    { title: t('dashboard.videoIntelligentAgent'), desc: t('dashboard.videoIntelligentAgent'), icon: Film, path: '/video-agent', color: 'hover:border-error' },
    { title: t('dashboard.customVoiceManagement'), desc: t('dashboard.customVoiceManagement'), icon: User, path: '/voice-mgmt', color: 'hover:border-secondary' },
    { title: t('dashboard.uploadedFileManagement'), desc: t('dashboard.uploadedFileManagement'), icon: FolderOpen, path: '/files', color: 'hover:border-info' },
    { title: t('dashboard.apiUsageStatistics'), desc: t('dashboard.apiUsageStatistics'), icon: BarChart3, path: '/token', color: 'hover:border-warning' },
  ], [t])

  const timeAgo = useCallback((date: Date): string => {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000)
    if (seconds < 60) return t('dashboard.justNow')
    const minutes = Math.floor(seconds / 60)
    if (minutes < 60) return `${minutes}${t('dashboard.minutesAgo')}`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours}${t('dashboard.hoursAgo')}`
    const days = Math.floor(hours / 24)
    return `${days}${t('dashboard.daysAgo')}`
  }, [t])

  useEffect(() => {
    if (events.length === 0) return

    const latestEvent = events[0]

    if (latestEvent.type === 'task_completed' || latestEvent.type === 'job_executed') {
      const payload = latestEvent.payload as { output?: string; result?: { output?: string } }
      const output = payload?.output || payload?.result?.output

      if (output) {
        addItem({
          type: 'text',
          input: output.slice(0, 100),
        })
      }
    }
  }, [events, addItem])

  return (
    <ErrorBoundary
      fallback={
        <ErrorFallback
          title="仪表盘加载失败"
          message="仪表盘渲染时遇到错误，请稍后重试或刷新页面。"
          onRetry={() => window.location.reload()}
          className="min-h-[50vh]"
        />
      }
    >
      <div className="space-y-6">
        <WelcomeModal
          open={showWelcomeModal}
          onClose={handleCloseWelcomeModal}
          onDontShowAgain={handleDontShowAgain}
          dontShowAgain={dontShowAgain}
        />

        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">{t('dashboard.title')}</h1>
            <p className="text-muted-foreground/70 mt-2">{t('dashboard.subtitle')}</p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => void loadOperations()}
              disabled={operationsLoading}
              aria-label="刷新运营指标"
            >
              <RefreshCw className={cn('w-4 h-4', operationsLoading && 'animate-spin')} />
            </Button>
            <ConnectionIndicator status={status} />
          </div>
        </div>

        <OperationsCards executions={operations?.executions ?? null} loading={operationsLoading} />

        <SystemHealthStrip
          health={operations?.health ?? null}
          dlq={operations?.dlq ?? null}
          capacity={operations?.capacity ?? null}
          loading={operationsLoading}
        />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ServiceDistribution distribution={operations?.distribution ?? null} loading={operationsLoading} />
          <RecentFailures failures={operations?.recentFailures ?? null} loading={operationsLoading} />
        </div>

        <div>
          <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
            <Zap className={cn('w-5 h-5', statusTokens.warning.icon)} />
            {t('dashboard.quickStart')}
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {quickActions.map((action, i) => (
              <motion.div
                key={action.path}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3 + i * 0.05 }}
              >
                <Link to={action.path}>
                  <Card className={`border transition-all duration-200 cursor-pointer ${action.color} hover:shadow-lg hover:shadow-primary-500/10`}>
                    <CardContent className="p-4 flex flex-col items-center text-center gap-3">
                      <action.icon className="w-8 h-8 text-muted-foreground" />
                      <div>
                        <p className="font-medium text-sm">{action.title}</p>
                        <p className="text-xs text-muted-foreground/70 mt-1">{action.desc}</p>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>

        <RecentActivityCard items={recentItems} timeAgo={timeAgo} />

      </div>
    </ErrorBoundary>
  )
}
