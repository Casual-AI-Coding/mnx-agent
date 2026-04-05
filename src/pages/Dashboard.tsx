import { useEffect, useMemo, useCallback, memo, useState } from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  MessageSquare, Mic, MicOff, Image, Music, Video, VideoIcon,
  User, FolderOpen, BarChart3, TrendingUp, Zap, Clock,
  Wifi, WifiOff, Loader2
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { WelcomeModal } from '@/components/onboarding/WelcomeModal'
import { useUsageStore } from '@/stores/usage'
import { useHistoryStore } from '@/stores/history'
import { useWebSocket } from '@/hooks/useWebSocket'
import type { ConnectionStatus } from '@/lib/websocket-client'
import { cn } from '@/lib/utils'
import { services, status as statusTokens } from '@/themes/tokens'

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

export default function Dashboard() {
  const { t } = useTranslation()
  const { usage } = useUsageStore()
  const { items, addItem } = useHistoryStore()
  const hasCompletedOnboarding = localStorage.getItem('onboarding-complete') === 'true'
  const { status, events } = useWebSocket({
    channels: ['jobs', 'tasks'],
    showToasts: true,
  })
  const [showWelcomeModal, setShowWelcomeModal] = useState(false)
  const [dontShowAgain, setDontShowAgain] = useState(false)

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

  // Memoized: type labels and colors - stable references
  const typeLabels = useMemo(() => ({
    text: t('dashboard.text'),
    image: t('dashboard.image'),
    voice: t('dashboard.voice'),
    music: t('dashboard.music'),
    video: t('dashboard.video'),
  }), [t])

  const typeColors = useMemo(() => ({
    text: cn(services.text.bg, services.text.icon),
    image: cn(services.image.bg, services.image.icon),
    voice: cn(statusTokens.success.bgSubtle, statusTokens.success.icon),
    music: cn(services.music.bg, services.music.icon),
    video: cn(services.video.bg, services.video.icon),
  }), [])

  // Memoized: stable array reference
  const quickActions = useMemo(() => [
    { title: t('dashboard.aiChatAndWriting'), desc: t('dashboard.aiChatAndWriting'), icon: MessageSquare, path: '/text', color: 'hover:border-primary' },
    { title: t('dashboard.realtimeVoiceSynthesis'), desc: t('dashboard.realtimeVoiceSynthesis'), icon: Mic, path: '/voice', color: 'hover:border-success' },
    { title: t('dashboard.batchVoiceSynthesis'), desc: t('dashboard.batchVoiceSynthesis'), icon: MicOff, path: '/voice-async', color: 'hover:border-info' },
    { title: t('dashboard.aiImageCreation'), desc: t('dashboard.aiImageCreation'), icon: Image, path: '/image', color: 'hover:border-accent' },
    { title: t('dashboard.aiMusicCreation'), desc: t('dashboard.aiMusicCreation'), icon: Music, path: '/music', color: 'hover:border-primary-400' },
    { title: t('dashboard.aiVideoCreation'), desc: t('dashboard.aiVideoCreation'), icon: Video, path: '/video', color: 'hover:border-destructive' },
    { title: t('dashboard.videoIntelligentAgent'), desc: t('dashboard.videoIntelligentAgent'), icon: VideoIcon, path: '/video-agent', color: 'hover:border-error' },
    { title: t('dashboard.customVoiceManagement'), desc: t('dashboard.customVoiceManagement'), icon: User, path: '/voice-mgmt', color: 'hover:border-secondary' },
    { title: t('dashboard.uploadedFileManagement'), desc: t('dashboard.uploadedFileManagement'), icon: FolderOpen, path: '/files', color: 'hover:border-info' },
    { title: t('dashboard.apiUsageStatistics'), desc: t('dashboard.apiUsageStatistics'), icon: BarChart3, path: '/token', color: 'hover:border-warning' },
  ], [t])

  // Memoized: stable function reference
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

  // Memoized: only recalculates when usage or t changes
  const stats = useMemo(() => [
    { label: t('dashboard.totalGenerations'), value: usage.textTokens + usage.imageRequests + usage.musicRequests + usage.videoRequests, icon: Zap, color: statusTokens.warning.icon },
    { label: t('dashboard.textTokens'), value: usage.textTokens.toLocaleString(), icon: MessageSquare, color: services.text.icon },
    { label: t('dashboard.imageRequests'), value: usage.imageRequests, icon: Image, color: services.image.icon },
    { label: t('dashboard.videoRequests'), value: usage.videoRequests, icon: Video, color: services.video.icon },
  ], [usage, t])

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
    <div className="space-y-8">
      <WelcomeModal
        open={showWelcomeModal}
        onClose={handleCloseWelcomeModal}
        onDontShowAgain={handleDontShowAgain}
        dontShowAgain={dontShowAgain}
      />

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">{t('dashboard.title')}</h1>
          <p className="text-muted-foreground/70 mt-2">{t('dashboard.subtitle')}</p>
        </div>
        <ConnectionIndicator status={status} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <Card>
              <CardContent className="p-4 flex items-center gap-4">
                <div className={`p-3 rounded-lg bg-card/secondary ${stat.color}`}>
                  <stat.icon className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <p className="text-sm text-muted-foreground/70">{stat.label}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <div>
        <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
          <Zap className={cn('w-5 h-5', statusTokens.warning.icon)} />
          {t('dashboard.quickStart')}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
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

      <div>
        <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
          <Clock className="w-5 h-5 text-primary-400" />
          {t('dashboard.recentActivity')}
        </h2>
        <Card>
          <CardContent className="p-0">
            {recentItems.length > 0 ? (
              <div className="divide-y divide-border">
                {recentItems.map((item) => (
                  <div key={item.id} className="flex items-center gap-4 px-4 py-3 hover:bg-secondary/50 transition-colors">
                    <Badge className={typeColors[item.type] || 'bg-card/secondary text-muted-foreground'}>
                      {typeLabels[item.type] || item.type}
                    </Badge>
                    <span className="flex-1 text-sm text-muted-foreground truncate">
                      {item.input || t('dashboard.noActivity')}
                    </span>
                    <span className="text-xs text-muted-foreground/50 whitespace-nowrap">
                      {timeAgo(new Date(item.timestamp))}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-12 text-center text-muted-foreground/70">
                <TrendingUp className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>{t('dashboard.noActivity')}</p>
                <p className="text-sm mt-1">{t('dashboard.noActivityDesc')}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

    </div>
  )
}
