import { useEffect, useState, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Globe, RefreshCw, Clock, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { PageHeader } from '@/components/shared/PageHeader'
import { getExternalApiLogs, getExternalApiLogStats, getUniqueExternalApiOperations, getUniqueExternalApiProviders, type ExternalApiLog, type ExternalApiLogStats, type ExternalApiStatus } from '@/lib/api/external-api-logs'
import { toastError } from '@/lib/toast'
import { cn } from '@/lib/utils'
import { status } from '@/themes/tokens'
import { useAuthStore } from '@/stores/auth'
import { FilterBar, type ExternalApiLogFilters } from '@/pages/external-api-logs/FilterBar'
import { LogTable } from '@/pages/external-api-logs/LogTable'
import { StatCard } from '@/pages/external-api-logs/StatCard'
import { LogDetailDialog } from '@/pages/external-api-logs/LogDetailDialog'

const PROVIDER_COLORS: Record<string, string> = {
  minimax: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  openai: 'bg-green-500/20 text-green-400 border-green-500/30',
  deepseek: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
}

const DEFAULT_PROVIDER_COLOR = 'bg-muted/20 text-muted-foreground border-border'

function getProviderColor(provider: string) {
  return PROVIDER_COLORS[provider] || DEFAULT_PROVIDER_COLOR
}

const STATUS_CONFIG: Record<ExternalApiStatus, { color: string; icon: typeof CheckCircle2; label: string }> = {
  success: { color: cn(status.success.bgSubtle, status.success.icon, status.success.border), icon: CheckCircle2, label: '成功' },
  failed: { color: cn(status.error.bgSubtle, status.error.icon, status.error.border), icon: AlertCircle, label: '失败' },
  pending: { color: 'bg-blue-500/20 text-blue-400 border-blue-500/30', icon: Loader2, label: '进行中' },
}

export default function ExternalApiLogs() {
  const { t } = useTranslation()
  const { isHydrated } = useAuthStore()
  const [logs, setLogs] = useState<ExternalApiLog[]>([])
  const [stats, setStats] = useState<ExternalApiLogStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [selectedLog, setSelectedLog] = useState<ExternalApiLog | null>(null)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [filters, setFilters] = useState<ExternalApiLogFilters>({})
  const [sortBy, setSortBy] = useState<'created_at' | 'duration_ms'>('created_at')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [uniqueOperations, setUniqueOperations] = useState<string[]>([])
  const [uniqueProviders, setUniqueProviders] = useState<string[]>([])
  
  const hasInitializedRef = useRef(false)
  const isFetchingRef = useRef(false)

  useEffect(() => {
    if (!isHydrated || isFetchingRef.current) return
    
    if (!hasInitializedRef.current) {
      hasInitializedRef.current = true
      isFetchingRef.current = true
      loadData()
      loadFilters().finally(() => {
        isFetchingRef.current = false
      })
    }
  }, [isHydrated])

  useEffect(() => {
    if (!hasInitializedRef.current || isFetchingRef.current) return
    
    isFetchingRef.current = true
    loadData().finally(() => {
      isFetchingRef.current = false
    })
  }, [page, filters, sortBy, sortOrder])

  const loadFilters = async () => {
    try {
      const [opsRes, providersRes] = await Promise.all([
        getUniqueExternalApiOperations(),
        getUniqueExternalApiProviders()
      ])
      if (opsRes.success && opsRes.data) setUniqueOperations(opsRes.data.sort())
      if (providersRes.success && providersRes.data) setUniqueProviders(providersRes.data.sort())
    } catch {}
  }

  const loadData = async () => {
    setIsLoading(true)
    try {
      const [logsRes, statsRes] = await Promise.all([
        getExternalApiLogs({ ...filters, page, limit: 20, sort_by: sortBy, sort_order: sortOrder }),
        getExternalApiLogStats()
      ])

      if (logsRes.success && logsRes.data) {
        setLogs(logsRes.data.logs)
        setTotalPages(logsRes.data.pagination.totalPages)
      }
      if (statsRes.success && statsRes.data) {
        setStats(statsRes.data)
      }
    } catch {
      toastError('加载失败', '无法获取外部调用日志')
    } finally {
      setIsLoading(false)
    }
  }

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  }

  const formatDuration = (ms: number | null) => {
    if (!ms) return '-'
    if (ms < 1000) return `${ms}ms`
    return `${(ms / 1000).toFixed(2)}s`
  }

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<Globe className="w-5 h-5" />}
        title={t('externalApiLogs.title', '外部调用日志')}
        description={t('externalApiLogs.subtitle', '追踪MiniMax等外部API调用')}
        gradient="purple-pink"
        actions={
          <Button variant="outline" onClick={loadData}>
            <RefreshCw className="w-4 h-4 mr-2" />
            {t('common.refresh', '刷新')}
          </Button>
        }
      />

      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title={t('externalApiLogs.totalCalls', '总调用数')}
            value={stats.total}
            icon={Globe}
            color={status.info.icon}
          />
          <StatCard
            title={t('externalApiLogs.avgDuration', '平均耗时')}
            value={formatDuration(stats.avgDuration)}
            icon={Clock}
            color={status.warning.icon}
          />
          <StatCard
            title={t('externalApiLogs.successRate', '成功率')}
            value={`${(((stats.byStatus.find(s => s.status === 'success')?.count || 0) / Math.max(stats.total, 1)) * 100).toFixed(1)}%`}
            icon={CheckCircle2}
            color={status.success.icon}
          />
          <StatCard
            title={t('externalApiLogs.errorCount', '失败数')}
            value={stats.byStatus.find(s => s.status === 'failed')?.count || 0}
            icon={AlertCircle}
            color="text-destructive"
          />
        </div>
      )}

      <Card className="border-border overflow-hidden">
        <FilterBar
          filters={filters}
          uniqueOperations={uniqueOperations}
          uniqueProviders={uniqueProviders}
          sortBy={sortBy}
          sortOrder={sortOrder}
          logsCount={logs.length}
          totalCount={stats?.total || 0}
          getProviderColor={getProviderColor}
          onFiltersChange={setFilters}
          onSortByCreatedAt={() => {
            if (sortBy === 'created_at') {
              setSortOrder(order => order === 'asc' ? 'desc' : 'asc')
            } else {
              setSortBy('created_at')
              setSortOrder('desc')
            }
          }}
          onSortByDuration={() => {
            if (sortBy === 'duration_ms') {
              setSortOrder(order => order === 'asc' ? 'desc' : 'asc')
            } else {
              setSortBy('duration_ms')
              setSortOrder('desc')
            }
          }}
        />
        <LogTable
          logs={logs}
          isLoading={isLoading}
          totalPages={totalPages}
          page={page}
          statusConfig={STATUS_CONFIG}
          getProviderColor={getProviderColor}
          onPageChange={setPage}
          onSelectLog={setSelectedLog}
          formatDuration={formatDuration}
          formatTime={formatTime}
        />
      </Card>

      {selectedLog && (
        <LogDetailDialog
          log={selectedLog}
          onClose={() => setSelectedLog(null)}
          formatDuration={formatDuration}
        />
      )}
    </div>
  )
}
