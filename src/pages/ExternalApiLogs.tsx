import { useEffect, useState, useRef } from 'react'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { Globe, RefreshCw, ChevronLeft, ChevronRight, Clock, AlertCircle, CheckCircle2, Copy, Check, ArrowUpDown, ChevronUp, SlidersHorizontal, Zap } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import { Dialog, DialogHeader, DialogFooter } from '@/components/ui/Dialog'
import { Select, SelectTrigger, SelectContent, SelectItem } from '@/components/ui/Select'
import { PageHeader } from '@/components/shared/PageHeader'
import { getExternalApiLogs, getExternalApiLogStats, getUniqueExternalApiOperations, getUniqueExternalApiProviders, type ExternalApiLog, type ExternalApiLogStats, type ServiceProvider, type ExternalApiStatus } from '@/lib/api/external-api-logs'
import { toastError } from '@/lib/toast'
import { cn } from '@/lib/utils'
import { status } from '@/themes/tokens'
import { useAuthStore } from '@/stores/auth'

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
  const [filters, setFilters] = useState<{
    service_provider?: ServiceProvider
    status?: ExternalApiStatus
    operation?: string
  }>({})
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

  const copyLogToClipboard = async (log: ExternalApiLog) => {
    const content = `## 外部调用日志详情

**服务商**: ${log.service_provider}
**API**: ${log.api_endpoint}
**操作**: ${log.operation}
**状态**: ${log.status}
**耗时**: ${formatDuration(log.duration_ms)}
**时间**: ${new Date(log.created_at).toLocaleString('zh-CN')}
${log.error_message ? `\n**错误信息**:\n\`\`\`\n${log.error_message}\n\`\`\`` : ''}
${log.request_params ? `\n**请求参数**:\n\`\`\`json\n${JSON.stringify(log.request_params, null, 2)}\n\`\`\`` : ''}
${log.request_body ? `\n**请求体**:\n\`\`\`\n${log.request_body}\n\`\`\`` : ''}
${log.response_body ? `\n**响应体**:\n\`\`\`\n${log.response_body}\n\`\`\`` : ''}`

    try {
      await navigator.clipboard.writeText(content)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      const textArea = document.createElement('textarea')
      textArea.value = content
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
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
        <div className="bg-gradient-to-r from-card via-card to-muted/20 border-b border-border/50">
          <div className="flex flex-wrap items-center gap-3 p-4">
            <span className="text-lg font-semibold">{t('externalApiLogs.logList', '日志列表')}</span>

            <div className="h-8 w-px bg-border/60 hidden sm:block" />

            <div className="flex items-center gap-1.5">
              <SlidersHorizontal className="w-4 h-4 text-muted-foreground/70" />
            </div>

            <Select
              value={filters.service_provider || '__all__'}
              onValueChange={(v) => setFilters(f => ({ ...f, service_provider: v === '__all__' ? undefined : v as ServiceProvider }))}
            >
              <SelectTrigger className="w-[140px] h-10 border-border/50 bg-background/50 hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-1.5">
                  <span className="text-muted-foreground/70 text-sm">服务商</span>
                  <span className={cn(
                    'text-sm font-medium truncate max-w-[60px]',
                    filters.service_provider ? 'text-foreground' : 'text-muted-foreground/60'
                  )}>
                    {filters.service_provider || '全部'}
                  </span>
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-muted-foreground/40" />
                    全部服务商
                  </div>
                </SelectItem>
                {uniqueProviders.map(provider => (
                  <SelectItem key={provider} value={provider}>
                    <div className="flex items-center gap-2">
                      <div className={cn('w-2 h-2 rounded-full', getProviderColor(provider).split(' ')[0])} />
                      {provider}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={filters.status || '__all__'}
              onValueChange={(v) => setFilters(f => ({ ...f, status: v === '__all__' ? undefined : v as ExternalApiStatus }))}
            >
              <SelectTrigger className="w-[130px] h-10 border-border/50 bg-background/50 hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-1.5">
                  <span className="text-muted-foreground/70 text-sm">状态</span>
                  <span className={cn(
                    'text-sm font-medium',
                    filters.status === 'success' && 'text-success',
                    filters.status === 'failed' && 'text-destructive',
                    !filters.status && 'text-muted-foreground/60'
                  )}>
                    {filters.status === 'success' ? '成功' : filters.status === 'failed' ? '失败' : '全部'}
                  </span>
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-muted-foreground/40" />
                    全部状态
                  </div>
                </SelectItem>
                <SelectItem value="success">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-success" />
                    成功
                  </div>
                </SelectItem>
                <SelectItem value="failed">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-destructive" />
                    失败
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={filters.operation || '__all__'}
              onValueChange={(v) => setFilters(f => ({ ...f, operation: v === '__all__' ? undefined : v }))}
            >
              <SelectTrigger className="w-[180px] h-10 border-border/50 bg-background/50 hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-1.5">
                  <span className="text-muted-foreground/70 text-sm">操作</span>
                  <span className={cn(
                    'text-sm font-medium truncate max-w-[80px]',
                    filters.operation ? 'text-foreground' : 'text-muted-foreground/60'
                  )}>
                    {filters.operation || '全部'}
                  </span>
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-muted-foreground/40" />
                    全部操作
                  </div>
                </SelectItem>
                {uniqueOperations.map(op => (
                  <SelectItem key={op} value={op}>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-primary/60" />
                      <span className="truncate max-w-[200px]" title={op}>{op}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex-1" />

            <div className="h-8 w-px bg-border/60 hidden md:block" />

            <ArrowUpDown className="w-4 h-4 text-muted-foreground/60" />
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                if (sortBy === 'created_at') {
                  setSortOrder(o => o === 'asc' ? 'desc' : 'asc')
                } else {
                  setSortBy('created_at')
                  setSortOrder('desc')
                }
              }}
              className={cn(
                'flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200',
                sortBy === 'created_at'
                  ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/20'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              )}
            >
              时间
              {sortBy === 'created_at' && (
                <motion.div
                  initial={{ rotate: 0 }}
                  animate={{ rotate: sortOrder === 'asc' ? 0 : 180 }}
                  transition={{ duration: 0.2 }}
                >
                  <ChevronUp className="w-3.5 h-3.5" />
                </motion.div>
              )}
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                if (sortBy === 'duration_ms') {
                  setSortOrder(o => o === 'asc' ? 'desc' : 'asc')
                } else {
                  setSortBy('duration_ms')
                  setSortOrder('desc')
                }
              }}
              className={cn(
                'flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200',
                sortBy === 'duration_ms'
                  ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/20'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              )}
            >
              耗时
              {sortBy === 'duration_ms' && (
                <motion.div
                  initial={{ rotate: 0 }}
                  animate={{ rotate: sortOrder === 'asc' ? 0 : 180 }}
                  transition={{ duration: 0.2 }}
                >
                  <ChevronUp className="w-3.5 h-3.5" />
                </motion.div>
              )}
            </motion.button>

            <div className="h-8 w-px bg-border/60 hidden lg:block" />

            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground/70">结果</span>
              <span className="font-semibold text-foreground">{logs.length}</span>
              <span className="text-muted-foreground/50">/ {stats?.total || 0}</span>
            </div>
          </div>
        </div>
        <CardContent className="p-0">
          <table className="w-full">
            <thead>
              <tr className="bg-gradient-to-r from-muted/50 via-muted/30 to-muted/50 border-b border-border/50">
                <th className="py-3 px-4 text-left text-xs font-semibold text-muted-foreground/70 uppercase tracking-wider">服务商</th>
                <th className="py-3 px-4 text-left text-xs font-semibold text-muted-foreground/70 uppercase tracking-wider">API</th>
                <th className="py-3 px-4 text-left text-xs font-semibold text-muted-foreground/70 uppercase tracking-wider">操作</th>
                <th className="py-3 px-4 text-right text-xs font-semibold text-muted-foreground/70 uppercase tracking-wider">耗时</th>
                <th className="py-3 px-4 text-right text-xs font-semibold text-muted-foreground/70 uppercase tracking-wider">时间</th>
                <th className="py-3 px-4 text-right text-xs font-semibold text-muted-foreground/70 uppercase tracking-wider">状态</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center">
                    <div className="flex items-center justify-center">
                      <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    </div>
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center">
                    <EmptyState
                      icon={Globe}
                      title={t('externalApiLogs.noLogs', '暂无外部调用日志')}
                      description={t('externalApiLogs.noLogsHint', 'MiniMax API调用将自动记录在此')}
                    />
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <motion.tr
                    key={log.id}
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.3 }}
                    className="hover:bg-muted/30 cursor-pointer"
                    onClick={() => setSelectedLog(log)}
                  >
                    <td className="py-3 px-4">
                      <Badge className={cn('text-xs', getProviderColor(log.service_provider))}>
                        {log.service_provider}
                      </Badge>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-sm truncate block max-w-[200px]" title={log.api_endpoint}>{log.api_endpoint}</span>
                    </td>
                    <td className="py-3 px-4 text-sm text-muted-foreground/70">
                      {log.operation}
                    </td>
                    <td className="py-3 px-4 text-right text-muted-foreground/70 text-sm tabular-nums">
                      {formatDuration(log.duration_ms)}
                    </td>
                    <td className="py-3 px-4 text-right text-muted-foreground/50 text-xs tabular-nums">
                      {formatTime(log.created_at)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Badge className={cn('text-xs', STATUS_CONFIG[log.status].color)}>
                        {STATUS_CONFIG[log.status].label}
                      </Badge>
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-4">
              <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-muted-foreground/70 text-sm">{page} / {totalPages}</span>
              <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {selectedLog && (
        <Dialog open={!!selectedLog} onClose={() => setSelectedLog(null)} size="lg">
          <DialogHeader>
            <h2 className="text-lg font-semibold">{t('externalApiLogs.logDetail', '日志详情')}</h2>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-muted-foreground/50">{t('externalApiLogs.provider', '服务商')}</label>
                <Badge className={cn('ml-2', getProviderColor(selectedLog.service_provider))}>
                  {selectedLog.service_provider}
                </Badge>
              </div>
              <div>
                <label className="text-muted-foreground/50">{t('externalApiLogs.status', '状态')}</label>
                <Badge className={cn('ml-2', STATUS_CONFIG[selectedLog.status].color)}>
                  {STATUS_CONFIG[selectedLog.status].label}
                </Badge>
              </div>
            </div>
            <div>
              <label className="text-muted-foreground/50">{t('externalApiLogs.apiEndpoint', 'API路径')}</label>
              <p className="text-foreground/80 font-mono text-xs">{selectedLog.api_endpoint}</p>
            </div>
            <div>
              <label className="text-muted-foreground/50">{t('externalApiLogs.operation', '操作')}</label>
              <p className="text-foreground/80">{selectedLog.operation}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-muted-foreground/50">{t('externalApiLogs.duration', '耗时')}</label>
                <p className="text-foreground/80">{formatDuration(selectedLog.duration_ms)}</p>
              </div>
              <div>
                <label className="text-muted-foreground/50">{t('externalApiLogs.time', '时间')}</label>
                <p className="text-foreground/80">{new Date(selectedLog.created_at).toLocaleString('zh-CN')}</p>
              </div>
            </div>
            {selectedLog.error_message && (
              <div>
                <label className="text-destructive">{t('externalApiLogs.errorMessage', '错误信息')}</label>
                <pre className={cn('p-2 rounded mt-1 overflow-x-auto text-xs whitespace-pre-wrap break-all', status.error.text, status.error.bgSubtle, 'border', status.error.border)}>
                  {selectedLog.error_message}
                </pre>
              </div>
            )}
            {selectedLog.request_params && (
              <div>
                <label className="text-muted-foreground/50">{t('externalApiLogs.requestParams', '请求参数')}</label>
                <pre className="text-muted-foreground bg-card/secondary p-2 rounded mt-1 overflow-x-auto text-xs whitespace-pre-wrap break-all">
                  {JSON.stringify(selectedLog.request_params, null, 2)}
                </pre>
              </div>
            )}
            {selectedLog.request_body && (
              <div>
                <label className="text-muted-foreground/50">{t('externalApiLogs.requestBody', '请求体')}</label>
                <pre className="text-muted-foreground bg-card/secondary p-2 rounded mt-1 overflow-x-auto text-xs whitespace-pre-wrap break-all max-h-64">
                  {(() => {
                    try {
                      return JSON.stringify(JSON.parse(selectedLog.request_body), null, 2)
                    } catch {
                      return selectedLog.request_body
                    }
                  })()}
                </pre>
              </div>
            )}
            {selectedLog.response_body && (
              <div>
                <label className="text-muted-foreground/50">{t('externalApiLogs.responseBody', '响应体')}</label>
                <pre className="text-muted-foreground bg-card/secondary p-2 rounded mt-1 overflow-x-auto text-xs whitespace-pre-wrap break-all max-h-64">
                  {(() => {
                    try {
                      return JSON.stringify(JSON.parse(selectedLog.response_body), null, 2)
                    } catch {
                      return selectedLog.response_body
                    }
                  })()}
                </pre>
              </div>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => copyLogToClipboard(selectedLog)}>
              {copied ? (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  {t('common.copied', '已复制')}
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 mr-2" />
                  {t('common.copy', '复制')}
                </>
              )}
            </Button>
            <Button variant="outline" onClick={() => setSelectedLog(null)}>
              {t('common.close', '关闭')}
            </Button>
          </DialogFooter>
        </Dialog>
      )}
    </div>
  )
}

function StatCard({
  title,
  value,
  icon: Icon,
  color,
}: {
  title: string
  value: string | number
  icon: React.ComponentType<{ className?: string }>
  color: string
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <Card className="border-border">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className={cn('p-2 rounded-lg bg-card/secondary', color)}>
              <Icon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{value}</p>
              <p className="text-muted-foreground/70 text-sm">{title}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}