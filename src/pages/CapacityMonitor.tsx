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
import { PageHeader } from '@/components/shared/PageHeader'
import { useCapacityStore } from '@/stores/capacity'
import type { ServiceType } from '@/types/cron'
import { cn } from '@/lib/utils'
import { status, services } from '@/themes/tokens'

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
    text: cn(services.text.icon, services.text.bg),
    voice_sync: cn(status.success.icon, status.success.bgSubtle),
    voice_async: cn(status.info.icon, status.info.bgSubtle),
    image: cn(services.image.icon, services.image.bg),
    music: cn(services.music.icon, services.music.bg),
    video: cn(services.video.icon, services.video.bg),
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
      <PageHeader
        icon={<Gauge className="w-5 h-5" />}
        title="Capacity Monitor"
        description="MiniMax Coding Plan usage and quota monitoring"
        gradient="blue-cyan"
        actions={
          <>
            <span className="text-xs text-muted-foreground/50">
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
          </>
        }
      />

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
        <Card className={cn(status.warning.border, status.warning.bgSubtle)}>
          <CardContent className="p-4 flex items-center gap-3">
            <AlertCircle className={cn('w-5 h-5', status.warning.icon)} />
            <div>
              <p className={cn('font-medium', status.warning.text)}>API Warning</p>
              <p className={cn('text-sm', status.warning.text, 'opacity-80')}>{(codingPlan as { error: string }).error}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {loading && modelRemains.length === 0 ? (
        <Card className="border-dashed border-border">
          <CardContent className="py-16 text-center">
            <RefreshCw className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50 animate-spin" />
            <h3 className="text-lg font-medium text-muted-foreground mb-2">Loading Capacity Data...</h3>
          </CardContent>
        </Card>
      ) : modelRemains.length === 0 && !hasError ? (
        <Card className="border-dashed border-border">
          <CardContent className="py-16 text-center">
            <Gauge className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
            <h3 className="text-lg font-medium text-muted-foreground mb-2">No Capacity Data</h3>
            <p className="text-sm text-muted-foreground/50 mb-4">
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
              // Priority by quota status: has remaining (0) > exhausted (1) > 0/0 (2)
              const getQuotaPriority = (model: { current_interval_total_count: number; current_interval_usage_count: number }) => {
                const total = model.current_interval_total_count
                const remaining = model.current_interval_usage_count
                // 0/0 → lowest priority
                if (total === 0 && remaining === 0) return 2
                // x/x (exhausted) → middle priority
                if (total > 0 && remaining === 0) return 1
                // has remaining → highest priority
                return 0
              }
              
              const quotaDiff = getQuotaPriority(a) - getQuotaPriority(b)
              if (quotaDiff !== 0) return quotaDiff
              
              // Secondary: sort by model name priority
              const getModelPriority = (name: string) => {
                const lower = name.toLowerCase()
                if (lower.includes('minimax')) return 0
                if (lower.includes('speech')) return 1
                if (lower.includes('image')) return 2
                if (lower.includes('voice') && lower.includes('sync')) return 3
                if (lower.includes('voice') && lower.includes('async')) return 4
                if (lower.includes('music')) return 5
                if (lower.includes('video')) return 6
                if (lower.includes('text')) return 0
                return 99
              }
              return getModelPriority(a.model_name) - getModelPriority(b.model_name)
            })
            .map((model) => {
              const total = model.current_interval_total_count
              const remaining = model.current_interval_usage_count
              const used = total - remaining
              const percentage = total > 0 ? Math.round((used / total) * 100) : 0
              const statusColor = percentage < 50 ? status.success.bg : percentage < 80 ? status.warning.bg : status.error.bg
              const isZeroQuota = total === 0 && remaining === 0
              const isExhausted = total > 0 && remaining === 0

              return (
                <motion.div
                  key={model.model_name}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3 }}
                >
                  <Card className={cn(
                    'h-full',
                    isZeroQuota && 'opacity-40 backdrop-blur-[2px] bg-card/20 border-dashed saturate-50'
                  )}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2.5">
                          <div className={cn('p-1.5 rounded-lg', services.text.bg)}>
                            <FileText className={cn('w-4 h-4', services.text.icon)} />
                          </div>
                          <div>
                            <h4 className="font-semibold text-foreground text-sm">
                              {model.model_name}
                            </h4>
                            <p className="text-xs text-muted-foreground/50">{model.model_name}</p>
                          </div>
                        </div>
                        <Badge variant={
                          isZeroQuota ? 'outline' : 
                          isExhausted ? 'destructive' : 
                          percentage < 80 ? 'default' : 'destructive'
                        }>
                          {isZeroQuota ? 'N/A' : `${percentage}%`}
                        </Badge>
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground/70">Quota</span>
                          <span className="text-foreground font-medium">
                            {used.toLocaleString()} / {total.toLocaleString()}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground/70">Used</span>
                          <span className={cn('font-medium', status.success.text)}>
                            {used.toLocaleString()}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground/70">Remaining</span>
                          <span className="text-primary-400 font-medium">
                            {remaining.toLocaleString()}
                          </span>
                        </div>

                        <div className="pt-1.5">
                          {isZeroQuota ? (
                            <div className="h-1.5 bg-muted/30 rounded-full" />
                          ) : (
                            <div className="h-1.5 bg-card/secondary rounded-full overflow-hidden">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${percentage}%` }}
                                transition={{ duration: 0.5, delay: 0.2 }}
                                className={`h-full ${statusColor} transition-colors`}
                              />
                            </div>
                          )}
                        </div>

                        <div className="flex items-center justify-between pt-1.5 text-xs text-muted-foreground/50">
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