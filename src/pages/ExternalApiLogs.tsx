import { useEffect, useState, useRef, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { Globe, RefreshCw, Clock, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { PageHeader } from '@/components/shared/PageHeader'
import { getExternalApiLogs, getExternalApiLogStats, getUniqueExternalApiOperations, getUniqueExternalApiProviders, type ExternalApiLog, type ExternalApiLogStats, type ServiceProvider, type ExternalApiStatus } from '@/lib/api/external-api-logs'
import { toastError } from '@/lib/toast'
import { cn } from '@/lib/utils'
import { status } from '@/themes/tokens'
import { useAuthStore } from '@/stores/auth'
import { ExternalApiStatCard } from './external-api-logs/ExternalApiStatCard.js'
import { ExternalApiFilterBar } from './external-api-logs/ExternalApiFilterBar.js'
import { ExternalApiLogTable } from './external-api-logs/ExternalApiLogTable.js'
import { ExternalApiLogDetail } from './external-api-logs/ExternalApiLogDetail.js'

const PROVIDER_COLORS: Record<string, string> = {
  minimax: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  openai: 'bg-green-500/20 text-green-400 border-green-500/30',
  deepseek: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
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
  const [copied, setCopied] = useState(false)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [filters, setFilters] = useState<{ service_provider?: ServiceProvider; status?: ExternalApiStatus; operation?: string }>({})
  const [sortBy, setSortBy] = useState<'created_at' | 'duration_ms'>('created_at')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [uniqueOperations, setUniqueOperations] = useState<string[]>([])
  const [uniqueProviders, setUniqueProviders] = useState<string[]>([])

  const hasInitializedRef = useRef(false)
  const isFetchingRef = useRef(false)

  const loadFilters = async () => {
    try {
      const [opsRes, providersRes] = await Promise.all([getUniqueExternalApiOperations(), getUniqueExternalApiProviders()])
      if (opsRes.success && opsRes.data) setUniqueOperations(opsRes.data.sort())
      if (providersRes.success && providersRes.data) setUniqueProviders(providersRes.data.sort())
    } catch {}
  }

  const loadData = async () => {
    setIsLoading(true)
    try {
      const [logsRes, statsRes] = await Promise.all([
        getExternalApiLogs({ ...filters, page, limit: 20, sort_by: sortBy, sort_order: sortOrder }),
        getExternalApiLogStats(),
      ])
      if (logsRes.success && logsRes.data) { setLogs(logsRes.data.logs); setTotalPages(logsRes.data.pagination.totalPages) }
      if (statsRes.success && statsRes.data) setStats(statsRes.data)
    } catch { toastError('加载失败', '无法获取外部调用日志') }
    finally { setIsLoading(false) }
  }

  useEffect(() => {
    if (!isHydrated || isFetchingRef.current) return
    if (!hasInitializedRef.current) {
      hasInitializedRef.current = true; isFetchingRef.current = true
      loadData(); loadFilters().finally(() => { isFetchingRef.current = false })
    }
  }, [isHydrated])

  useEffect(() => {
    if (!hasInitializedRef.current || isFetchingRef.current) return
    isFetchingRef.current = true; loadData().finally(() => { isFetchingRef.current = false })
  }, [page, filters, sortBy, sortOrder])

  const formatTime = (dateStr: string) => new Date(dateStr).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' })
  const formatDuration = (ms: number | null) => { if (!ms) return '-'; if (ms < 1000) return `${ms}ms`; return `${(ms / 1000).toFixed(2)}s` }

  const handleSortToggle = useCallback((field: 'created_at' | 'duration_ms') => {
    if (sortBy === field) setSortOrder(o => o === 'asc' ? 'desc' : 'asc')
    else { setSortBy(field); setSortOrder('desc') }
  }, [sortBy])

  const copyLogToClipboard = async (log: ExternalApiLog) => {
    const content = `## 外部调用日志详情\n\n**服务商**: ${log.service_provider}\n**API**: ${log.api_endpoint}\n**操作**: ${log.operation}\n**状态**: ${log.status}\n**耗时**: ${formatDuration(log.duration_ms)}\n**时间**: ${new Date(log.created_at).toLocaleString('zh-CN')}${log.error_message ? `\n\n**错误信息**:\n\`\`\`\n${log.error_message}\n\`\`\`` : ''}${log.request_params ? `\n\n**请求参数**:\n\`\`\`json\n${JSON.stringify(log.request_params, null, 2)}\n\`\`\`` : ''}${log.request_body ? `\n\n**请求体**:\n\`\`\`\n${log.request_body}\n\`\`\`` : ''}${log.response_body ? `\n\n**响应体**:\n\`\`\`\n${log.response_body}\n\`\`\`` : ''}`
    try { await navigator.clipboard.writeText(content); setCopied(true); setTimeout(() => setCopied(false), 2000) }
    catch { const ta = document.createElement('textarea'); ta.value = content; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta); setCopied(true); setTimeout(() => setCopied(false), 2000) }
  }

  return (
    <div className="space-y-6">
      <PageHeader icon={<Globe className="w-5 h-5" />} title={t('externalApiLogs.title', '外部调用日志')} description={t('externalApiLogs.subtitle', '追踪MiniMax等外部API调用')} gradient="purple-pink"
        actions={<Button variant="outline" onClick={loadData}><RefreshCw className="w-4 h-4 mr-2" />{t('common.refresh', '刷新')}</Button>} />

      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <ExternalApiStatCard title={t('externalApiLogs.totalCalls', '总调用数')} value={stats.total} icon={Globe} color={status.info.icon} />
          <ExternalApiStatCard title={t('externalApiLogs.avgDuration', '平均耗时')} value={formatDuration(stats.avgDuration)} icon={Clock} color={status.warning.icon} />
          <ExternalApiStatCard title={t('externalApiLogs.successRate', '成功率')} value={`${(((stats.byStatus.find(s => s.status === 'success')?.count || 0) / Math.max(stats.total, 1)) * 100).toFixed(1)}%`} icon={CheckCircle2} color={status.success.icon} />
          <ExternalApiStatCard title={t('externalApiLogs.errorCount', '失败数')} value={stats.byStatus.find(s => s.status === 'failed')?.count || 0} icon={AlertCircle} color="text-destructive" />
        </div>
      )}

      <div className="border-border overflow-hidden rounded-xl border bg-card">
        <ExternalApiFilterBar
          filters={filters} uniqueProviders={uniqueProviders} uniqueOperations={uniqueOperations}
          sortBy={sortBy} sortOrder={sortOrder} logsCount={logs.length} totalCount={stats?.total || 0}
          providerColors={PROVIDER_COLORS}
          onFiltersChange={setFilters} onSortToggle={handleSortToggle}
        />
        <div className="p-4">
          <ExternalApiLogTable
            logs={logs} isLoading={isLoading} totalPages={totalPages} page={page}
            providerColors={PROVIDER_COLORS} statusConfig={STATUS_CONFIG}
            formatDuration={formatDuration} formatTime={formatTime}
            onPageChange={setPage} onSelectLog={setSelectedLog}
          />
        </div>
      </div>

      {selectedLog && (
        <ExternalApiLogDetail
          selectedLog={selectedLog} copied={copied} providerColors={PROVIDER_COLORS} statusConfig={STATUS_CONFIG}
          formatDuration={formatDuration} onCopy={copyLogToClipboard} onClose={() => setSelectedLog(null)}
          t={t as (key: string, fallback?: string) => string}
        />
      )}
    </div>
  )
}
