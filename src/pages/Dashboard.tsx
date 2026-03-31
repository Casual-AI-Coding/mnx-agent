import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  MessageSquare, Mic, MicOff, Image, Music, Video, VideoIcon,
  User, FolderOpen, BarChart3, TrendingUp, Zap, Clock
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { useUsageStore } from '@/stores/usage'
import { useHistoryStore } from '@/stores/history'

export default function Dashboard() {
  const { t } = useTranslation()
  const { usage } = useUsageStore()
  const { items } = useHistoryStore()
  const recentItems = items.slice(-5).reverse()

  const quickActions = [
    { title: t('dashboard.aiChatAndWriting'), desc: t('dashboard.aiChatAndWriting'), icon: MessageSquare, path: '/text', color: 'hover:border-blue-500' },
    { title: t('dashboard.realtimeVoiceSynthesis'), desc: t('dashboard.realtimeVoiceSynthesis'), icon: Mic, path: '/voice', color: 'hover:border-green-500' },
    { title: t('dashboard.batchVoiceSynthesis'), desc: t('dashboard.batchVoiceSynthesis'), icon: MicOff, path: '/voice-async', color: 'hover:border-teal-500' },
    { title: t('dashboard.aiImageCreation'), desc: t('dashboard.aiImageCreation'), icon: Image, path: '/image', color: 'hover:border-purple-500' },
    { title: t('dashboard.aiMusicCreation'), desc: t('dashboard.aiMusicCreation'), icon: Music, path: '/music', color: 'hover:border-pink-500' },
    { title: t('dashboard.aiVideoCreation'), desc: t('dashboard.aiVideoCreation'), icon: Video, path: '/video', color: 'hover:border-orange-500' },
    { title: t('dashboard.videoIntelligentAgent'), desc: t('dashboard.videoIntelligentAgent'), icon: VideoIcon, path: '/video-agent', color: 'hover:border-red-500' },
    { title: t('dashboard.customVoiceManagement'), desc: t('dashboard.customVoiceManagement'), icon: User, path: '/voice-mgmt', color: 'hover:border-indigo-500' },
    { title: t('dashboard.uploadedFileManagement'), desc: t('dashboard.uploadedFileManagement'), icon: FolderOpen, path: '/files', color: 'hover:border-cyan-500' },
    { title: t('dashboard.apiUsageStatistics'), desc: t('dashboard.apiUsageStatistics'), icon: BarChart3, path: '/token', color: 'hover:border-yellow-500' },
  ]

  function timeAgo(date: Date): string {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000)
    if (seconds < 60) return t('dashboard.justNow')
    const minutes = Math.floor(seconds / 60)
    if (minutes < 60) return `${minutes}${t('dashboard.minutesAgo')}`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours}${t('dashboard.hoursAgo')}`
    const days = Math.floor(hours / 24)
    return `${days}${t('dashboard.daysAgo')}`
  }

  const typeLabels: Record<string, string> = {
    text: t('dashboard.text'),
    image: t('dashboard.image'),
    voice: t('dashboard.voice'),
    music: t('dashboard.music'),
    video: t('dashboard.video'),
  }

  const typeColors: Record<string, string> = {
    text: 'bg-blue-500/20 text-blue-400',
    image: 'bg-purple-500/20 text-purple-400',
    voice: 'bg-green-500/20 text-green-400',
    music: 'bg-pink-500/20 text-pink-400',
    video: 'bg-orange-500/20 text-orange-400',
  }

  const stats = [
    { label: t('dashboard.totalGenerations'), value: usage.textTokens + usage.imageRequests + usage.musicRequests + usage.videoRequests, icon: Zap, color: 'text-yellow-400' },
    { label: t('dashboard.textTokens'), value: usage.textTokens.toLocaleString(), icon: MessageSquare, color: 'text-blue-400' },
    { label: t('dashboard.imageRequests'), value: usage.imageRequests, icon: Image, color: 'text-purple-400' },
    { label: t('dashboard.videoRequests'), value: usage.videoRequests, icon: Video, color: 'text-orange-400' },
  ]

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white">{t('dashboard.title')}</h1>
        <p className="text-dark-400 mt-2">{t('dashboard.subtitle')}</p>
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
                <div className={`p-3 rounded-lg bg-dark-800 ${stat.color}`}>
                  <stat.icon className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <p className="text-sm text-dark-400">{stat.label}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <div>
        <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
          <Zap className="w-5 h-5 text-yellow-400" />
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
                    <action.icon className="w-8 h-8 text-dark-300" />
                    <div>
                      <p className="font-medium text-sm">{action.title}</p>
                      <p className="text-xs text-dark-400 mt-1">{action.desc}</p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>

      <div>
        <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
          <Clock className="w-5 h-5 text-blue-400" />
          {t('dashboard.recentActivity')}
        </h2>
        <Card>
          <CardContent className="p-0">
            {recentItems.length > 0 ? (
              <div className="divide-y divide-dark-800/50">
                {recentItems.map((item) => (
                  <div key={item.id} className="flex items-center gap-4 px-4 py-3 hover:bg-dark-800/30 transition-colors">
                    <Badge className={typeColors[item.type] || 'bg-dark-700 text-dark-300'}>
                      {typeLabels[item.type] || item.type}
                    </Badge>
                    <span className="flex-1 text-sm text-dark-300 truncate">
                      {item.input || t('dashboard.noActivity')}
                    </span>
                    <span className="text-xs text-dark-500 whitespace-nowrap">
                      {timeAgo(new Date(item.timestamp))}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-12 text-center text-dark-400">
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
