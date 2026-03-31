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
  const { records, loading, fetchCapacity, refreshCapacity, lastRefresh } = useCapacityStore()
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

  const getUsagePercentage = (remaining: number, total: number): number => {
    if (total === 0) return 0
    return Math.round(((total - remaining) / total) * 100)
  }

  const getStatusColor = (percentage: number): string => {
    if (percentage < 50) return 'bg-green-500'
    if (percentage < 80) return 'bg-yellow-500'
    return 'bg-red-500'
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Capacity Monitor</h1>
          <p className="text-dark-400 mt-2">
            Real-time MiniMax API capacity and quota monitoring
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

      {loading && records.length === 0 ? (
        <Card className="border-dashed border-dark-700">
          <CardContent className="py-16 text-center">
            <RefreshCw className="w-12 h-12 mx-auto mb-4 text-dark-600 animate-spin" />
            <h3 className="text-lg font-medium text-dark-300 mb-2">Loading Capacity Data...</h3>
          </CardContent>
        </Card>
      ) : records.length === 0 ? (
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
          {records.map((record) => {
            const percentage = getUsagePercentage(record.remainingQuota, record.totalQuota)
            const statusColor = getStatusColor(percentage)

            return (
              <motion.div
                key={record.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
              >
                <Card className="h-full">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <ServiceIcon type={record.serviceType} />
                        <div>
                          <h4 className="font-semibold text-white">
                            {serviceLabels[record.serviceType]}
                          </h4>
                          <p className="text-xs text-dark-500">{record.serviceType}</p>
                        </div>
                      </div>
                      <Badge variant={percentage < 80 ? 'default' : 'destructive'}>
                        {percentage}%
                      </Badge>
                    </div>

                    <div className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-dark-400">Remaining</span>
                        <span className="text-white font-medium">
                          {record.remainingQuota.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-dark-400">Total Quota</span>
                        <span className="text-white font-medium">
                          {record.totalQuota.toLocaleString()}
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
                        <span>Used: {(record.totalQuota - record.remainingQuota).toLocaleString()}</span>
                        <span>Resets: {formatDate(record.resetAt)}</span>
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