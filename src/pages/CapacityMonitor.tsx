import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  Gauge,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  FileText,
  Music,
  Video,
  Image as ImageIcon,
  Mic,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { useCapacityStore } from '@/stores/capacity'
import type { ServiceType } from '@/types/cron'

function ServiceIcon({ type }: { type: ServiceType }) {
  const icons: Record<ServiceType, React.ReactNode> = {
    text: <FileText className="w-5 h-5" />,
    voice_sync: <Mic className="w-5 h-5" />,
    voice_async: <Mic className="w-5 h-5" />,
    image: <ImageIcon className="w-5 h-5" />,
    music: <Music className="w-5 h-5" />,
    video: <Video className="w-5 h-5" />,
  }

  const colors: Record<ServiceType, string> = {
    text: 'text-blue-400 bg-blue-500/10',
    voice_sync: 'text-green-400 bg-green-500/10',
    voice_async: 'text-teal-400 bg-teal-500/10',
    image: 'text-purple-400 bg-purple-500/10',
    music: 'text-pink-400 bg-pink-500/10',
    video: 'text-orange-400 bg-orange-500/10',
  }

  return (
    <div className={`p-2 rounded-lg ${colors[type]}`}>
      {icons[type]}
    </div>
  )
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const serviceLabels: Record<ServiceType, string> = {
  text: 'Text Generation',
  voice_sync: 'Voice Sync',
  voice_async: 'Voice Async',
  image: 'Image Generation',
  music: 'Music Generation',
  video: 'Video Generation',
}

export default function CapacityMonitor() {
  const { records, codingPlan, loading, fetchCapacity, refreshCapacity, lastRefresh } = useCapacityStore()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchCapacity().catch((err) => {
      console.error('[CapacityMonitor] Initial load error:', err)
      setError((err as Error).message)
    })
  }, [fetchCapacity])

  const handleRefresh = async () => {
    setError(null)
    try {
      await refreshCapacity(true)
    } catch (err) {
      console.error('[CapacityMonitor] Refresh error:', err)
      setError((err as Error).message)
    }
  }

  const modelRemains = codingPlan?.model_remains || []
  const hasError = codingPlan && 'error' in codingPlan

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Capacity Monitor</h1>
          <p className="text-dark-400 mt-2">
            MiniMax Coding Plan usage and quota monitoring
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-dark-500">
            Last updated: {lastRefresh ? new Date(lastRefresh).toLocaleTimeString() : 'Never'}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {error && (
        <Card className="border-destructive/50 bg-destructive/10">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-destructive" />
            <div>
              <p className="font-medium text-destructive">API Error</p>
              <p className="text-sm text-destructive/80">{error}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {hasError && (
        <Card className="border-yellow-500/50 bg-yellow-500/10">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-500" />
            <div>
              <p className="font-medium text-yellow-500">API Warning</p>
              <p className="text-sm text-yellow-500/80">{(codingPlan as { error: string }).error}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {loading && modelRemains.length === 0 ? (
        <Card className="border-dashed border-dark-700">
          <CardContent className="py-16 text-center">
            <RefreshCw className="w-12 h-12 mx-auto mb-4 text-dark-600 animate-spin" />
            <h3 className="text-lg font-medium text-dark-300 mb-2">Loading Capacity Data...</h3>
          </CardContent>
        </Card>
      ) : modelRemains.length === 0 && !hasError ? (
        <Card className="border-dashed border-dark-700">
          <CardContent className="py-16 text-center">
            <Gauge className="w-12 h-12 mx-auto mb-4 text-dark-600" />
            <h3 className="text-lg font-medium text-dark-300 mb-2">No Capacity Data</h3>
            <p className="text-sm text-dark-500 mb-4">
              {error || 'Click refresh to load capacity information.'}
            </p>
            <Button onClick={handleRefresh} disabled={loading}>
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Load Capacity Data
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {modelRemains
            .sort((a, b) => {
              const order = ['text', 'voice_sync', 'image', 'voice_async', 'music', 'video']
              const getPriority = (name: string) => {
                const lower = name.toLowerCase()
                if (lower.includes('text')) return 0
                if (lower.includes('voice') && lower.includes('sync')) return 1
                if (lower.includes('image')) return 2
                if (lower.includes('voice') && lower.includes('async')) return 3
                if (lower.includes('music')) return 4
                if (lower.includes('video')) return 5
                return 99
              }
              return getPriority(a.model_name) - getPriority(b.model_name)
            })
            .map((model) => {
              const total = model.current_interval_total_count
              const usage = model.current_interval_usage_count
              const remaining = total - usage
              const percentage = total > 0 ? Math.round((usage / total) * 100) : 0
              const statusColor = percentage < 50 ? 'bg-green-500' : percentage < 80 ? 'bg-yellow-500' : 'bg-red-500'

              return (
                <motion.div
                  key={model.model_name}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3 }}
                >
                  <Card className="h-full">
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-purple-500/10">
                            <FileText className="w-5 h-5 text-purple-400" />
                          </div>
                          <div>
                            <h4 className="font-semibold text-white">
                              {model.model_name}
                            </h4>
                            <p className="text-xs text-dark-500">{model.model_name}</p>
                          </div>
                        </div>
                        <Badge variant={percentage < 80 ? 'default' : 'destructive'}>
                          {percentage}%
                        </Badge>
                      </div>

                      <div className="space-y-3">
                        <div className="flex justify-between text-sm">
                          <span className="text-dark-400">Quota</span>
                          <span className="text-white font-medium">
                            {usage.toLocaleString()} / {total.toLocaleString()}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-dark-400">Used</span>
                          <span className="text-green-400 font-medium">
                            {usage.toLocaleString()}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-dark-400">Remaining</span>
                          <span className="text-blue-400 font-medium">
                            {remaining.toLocaleString()}
                          </span>
                        </div>

                        <div className="pt-2">
                          <div className="h-2 bg-dark-800 rounded-full overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${percentage}%` }}
                              transition={{ duration: 0.5, delay: 0.2 }}
                              className={`h-full ${statusColor} transition-colors`}
                            />
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-2 text-xs text-dark-500">
                          <span>Weekly: {model.current_weekly_usage_count.toLocaleString()}</span>
                          <span>Reset: {formatDate(new Date(model.end_time).toISOString())}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )
            })}
        </div>
      )}
    </div>
  )
}