import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { Shield, Search, RefreshCw, ChevronLeft, ChevronRight, Eye, Clock, Activity, AlertCircle, CheckCircle2, XCircle, Copy, Check, ArrowUpDown, ArrowUp, ArrowDown, Filter } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import { Dialog, DialogHeader, DialogFooter } from '@/components/ui/Dialog'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/Tabs'
import { PageHeader } from '@/components/shared/PageHeader'
import { getAuditLogs, getAuditStats, type AuditLog, type AuditAction, type AuditStats } from '@/lib/api/audit'
import { toastError } from '@/lib/toast'
import { cn } from '@/lib/utils'
import { status, services } from '@/themes/tokens'

const ACTION_CONFIG: Record<AuditAction, { color: string; label: string }> = {
  create: { color: cn(status.success.bgSubtle, status.success.icon, status.success.border), label: '创建' },
  update: { color: cn(status.info.bgSubtle, status.info.icon, status.info.border), label: '更新' },
  delete: { color: cn(status.error.bgSubtle, status.error.icon, status.error.border), label: '删除' },
  execute: { color: cn(services.image.bg, services.image.icon, 'border-accent/30'), label: '执行' },
}

const DEFAULT_ACTION_CONFIG = { color: cn(status.pending.bgSubtle, 'text-muted-foreground/70', status.pending.border), label: '未知' }

function getActionConfig(action: string) {
  return (ACTION_CONFIG as Record<string, { color: string; label: string }>)[action] || DEFAULT_ACTION_CONFIG
}

const STATUS_COLORS: Record<string, string> = {
  '0': 'text-muted-foreground/70',
  '2': status.success.icon,
  '3': status.warning.icon,
  '4': status.warning.icon,
  '5': 'text-destructive',
}

export default function AuditLogs() {
  const { t } = useTranslation()
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [stats, setStats] = useState<AuditStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null)
  const [copied, setCopied] = useState(false)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [filters, setFilters] = useState<{
    action?: AuditAction
    resource_type?: string
    request_path?: string
    status_filter?: 'all' | 'success' | 'error'
  }>({})
  const [sortBy, setSortBy] = useState<'created_at' | 'duration_ms'>('created_at')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [uniquePaths, setUniquePaths] = useState<string[]>([])

  useEffect(() => {
    loadData()
  }, [page, filters, sortBy, sortOrder])

  const loadData = async () => {
    setIsLoading(true)
    try {
      const [logsRes, statsRes] = await Promise.all([
        getAuditLogs({ ...filters, page, limit: 20, sort_by: sortBy, sort_order: sortOrder }),
        getAuditStats()
      ])

      if (logsRes.success && logsRes.data) {
        setLogs(logsRes.data.logs)
        setTotalPages(logsRes.data.pagination.totalPages)
        const paths = [...new Set(logsRes.data.logs.map(l => l.request_path).filter(Boolean))] as string[]
        setUniquePaths(paths)
      }
      if (statsRes.success && statsRes.data) {
        setStats(statsRes.data)
      }
    } catch {
      toastError('加载失败', '无法获取审计日志')
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

  const copyLogToClipboard = async (log: AuditLog) => {
    const content = `## 审计日志详情

**操作**: ${getActionConfig(log.action).label}
**状态**: ${log.response_status || '-'}
**路径**: ${log.request_method || '-'} ${log.request_path || '-'}
**资源类型**: ${log.resource_type || '-'}
**资源ID**: ${log.resource_id || '-'}
**IP地址**: ${log.ip_address || '-'}
**耗时**: ${formatDuration(log.duration_ms)}
**时间**: ${new Date(log.created_at).toLocaleString('zh-CN')}
${log.error_message ? `\n**错误信息**:\n\`\`\`\n${log.error_message}\n\`\`\`` : ''}
${log.request_body ? `\n**请求体**:\n\`\`\`json\n${typeof log.request_body === 'object' ? JSON.stringify(log.request_body, null, 2) : log.request_body}\n\`\`\`` : ''}`

    try {
      await navigator.clipboard.writeText(content)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback for older browsers
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
        icon={<Shield className="w-5 h-5" />}
        title={t('audit.title', '审计日志')}
        description={t('audit.subtitle', '追踪系统操作记录')}
        gradient="blue-cyan"
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
            title={t('audit.totalLogs', '总记录数')}
            value={stats.total}
            icon={Shield}
            color={status.info.icon}
          />
          <StatCard
            title={t('audit.avgDuration', '平均耗时')}
            value={formatDuration(stats.avgDuration)}
            icon={Clock}
            color={status.warning.icon}
          />
          <StatCard
            title={t('audit.successRate', '成功率')}
            value={`${((stats.byResponseStatus.filter(s => s.response_status >= 200 && s.response_status < 300).reduce((sum, s) => sum + s.count, 0) / Math.max(stats.total, 1)) * 100).toFixed(1)}%`}
            icon={CheckCircle2}
            color={status.success.icon}
          />
          <StatCard
            title={t('audit.errorCount', '错误数')}
            value={stats.byResponseStatus.filter(s => s.response_status >= 400).reduce((sum, s) => sum + s.count, 0)}
            icon={AlertCircle}
            color="text-destructive"
          />
        </div>
      )}

      <Card className="border-border">
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <CardTitle className="text-lg">{t('audit.logList', '日志列表')}</CardTitle>
            
            {/* Filter Controls */}
            <div className="flex flex-wrap items-center gap-2">
              <Tabs value={filters.status_filter || 'all'} onValueChange={(v) => setFilters(f => ({ ...f, status_filter: v as 'all' | 'success' | 'error' }))}>
                <TabsList className="h-8 bg-muted/50">
                  <TabsTrigger value="all" className="text-xs px-3 h-6">全部</TabsTrigger>
                  <TabsTrigger value="success" className="text-xs px-3 h-6 text-success">成功</TabsTrigger>
                  <TabsTrigger value="error" className="text-xs px-3 h-6 text-destructive">错误</TabsTrigger>
                </TabsList>
              </Tabs>

              {uniquePaths.length > 0 && (
                <Tabs value={filters.request_path || ''} onValueChange={(v) => setFilters(f => ({ ...f, request_path: v || undefined }))}>
                  <TabsList className="h-8 bg-muted/50">
                    <TabsTrigger value="" className="text-xs px-3 h-6">全部路径</TabsTrigger>
                    {uniquePaths.slice(0, 5).map(path => (
                      <TabsTrigger key={path} value={path} className="text-xs px-3 h-6 max-w-[100px] truncate" title={path}>
                        {path.split('/').pop() || path}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                </Tabs>
              )}

              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (sortBy === 'duration_ms') {
                    setSortOrder(o => o === 'asc' ? 'desc' : 'asc')
                  } else {
                    setSortBy('duration_ms')
                    setSortOrder('desc')
                  }
                }}
                className={cn(
                  'h-8 px-3 text-xs',
                  sortBy === 'duration_ms' && 'bg-accent text-accent-foreground'
                )}
              >
                <Clock className="w-3.5 h-3.5 mr-1.5" />
                耗时
                {sortBy === 'duration_ms' && (
                  sortOrder === 'asc' ? <ArrowUp className="w-3 h-3 ml-1" /> : <ArrowDown className="w-3 h-3 ml-1" />
                )}
              </Button>
            </div>
          </div>

          {/* Action Filter */}
          <div className="flex items-center gap-2 pt-3 border-t border-border mt-3">
            <span className="text-xs text-muted-foreground mr-2">操作:</span>
            <Tabs value={filters.action || 'all'} onValueChange={(v) => setFilters(f => ({ ...f, action: v === 'all' ? undefined : v as AuditAction }))}>
              <TabsList className="h-8 bg-muted/50">
                <TabsTrigger value="all" className="text-xs px-3 h-6">全部</TabsTrigger>
                {(Object.keys(ACTION_CONFIG) as AuditAction[]).map((action) => (
                  <TabsTrigger
                    key={action}
                    value={action}
                    className={cn(
                      'text-xs px-3 h-6 capitalize',
                      ACTION_CONFIG[action].color
                    )}
                  >
                    {ACTION_CONFIG[action].label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>

          <div className="flex items-center gap-8 pt-3 text-xs text-muted-foreground/50 border-t border-border mt-3">
            <span className="w-16">耗时</span>
            <span className="w-20">时间</span>
            <span className="w-8">状态</span>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : logs.length === 0 ? (
            <EmptyState
              icon={Shield}
              title={t('audit.noLogs', '暂无审计日志')}
              description={t('audit.noLogsHint', '系统操作将自动记录在此')}
            />
          ) : (
            <div className="divide-y divide-border">
              {logs.map((log) => (
                <motion.div
                  key={log.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex items-center justify-between py-3 hover:bg-card/secondary/50 px-2 -mx-2 rounded cursor-pointer"
                  onClick={() => setSelectedLog(log)}
                >
<div className="flex items-center gap-4">
              <Badge className={cn('capitalize', getActionConfig(log.action).color)}>
                {getActionConfig(log.action).label}
              </Badge>
              <div className="flex-1 min-w-0">
                <p className="text-foreground/80 text-sm font-medium truncate">{log.request_path || '-'}</p>
                <p className="text-muted-foreground/50 text-xs">{log.resource_type || '-'} {log.resource_id && `• ${log.resource_id.slice(0, 8)}`}</p>
              </div>
            </div>
            <div className="flex items-center gap-6 text-sm">
              <span className="text-muted-foreground/70 w-16">{formatDuration(log.duration_ms)}</span>
              <span className="text-muted-foreground/50 w-20">{formatTime(log.created_at)}</span>
              <span className={cn('w-8', STATUS_COLORS[Math.floor((log.response_status || 0) / 100).toString()] || 'text-muted-foreground/70')}>
                {log.response_status || '-'}
              </span>
              <Button variant="ghost" size="icon" className="shrink-0">
                <Eye className="w-4 h-4" />
              </Button>
            </div>
                </motion.div>
              ))}
            </div>
          )}

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
            <h2 className="text-lg font-semibold">{t('audit.logDetail', '日志详情')}</h2>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-muted-foreground/50">{t('audit.action', '操作')}</label>
                <Badge className={cn('ml-2', getActionConfig(selectedLog.action).color)}>
                  {getActionConfig(selectedLog.action).label}
                </Badge>
              </div>
              <div>
                <label className="text-muted-foreground/50">{t('audit.status', '状态')}</label>
                <span className={cn('ml-2', STATUS_COLORS[Math.floor((selectedLog.response_status || 0) / 100).toString()] || 'text-muted-foreground/70')}>
                  {selectedLog.response_status || '-'}
                </span>
              </div>
            </div>
            <div>
              <label className="text-muted-foreground/50">{t('audit.path', '路径')}</label>
              <p className="text-foreground/80">{selectedLog.request_method || '-'} {selectedLog.request_path || '-'}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-muted-foreground/50">{t('audit.resourceType', '资源类型')}</label>
                <p className="text-foreground/80">{selectedLog.resource_type || '-'}</p>
              </div>
              <div>
                <label className="text-muted-foreground/50">{t('audit.resourceId', '资源ID')}</label>
                <p className="text-foreground/80 font-mono text-xs">{selectedLog.resource_id || '-'}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-muted-foreground/50">{t('audit.ip', 'IP地址')}</label>
                <p className="text-foreground/80">{selectedLog.ip_address || '-'}</p>
              </div>
              <div>
                <label className="text-muted-foreground/50">{t('audit.duration', '耗时')}</label>
                <p className="text-foreground/80">{formatDuration(selectedLog.duration_ms)}</p>
              </div>
            </div>
            <div>
              <label className="text-muted-foreground/50">{t('audit.time', '时间')}</label>
              <p className="text-foreground/80">{new Date(selectedLog.created_at).toLocaleString('zh-CN')}</p>
            </div>
            {selectedLog.error_message && (
              <div>
                <label className="text-destructive">{t('audit.errorMessage', '错误信息')}</label>
                <pre className={cn('p-2 rounded mt-1 overflow-x-auto text-xs whitespace-pre-wrap break-all', status.error.text, status.error.bgSubtle, 'border', status.error.border)}>
                  {selectedLog.error_message}
                </pre>
              </div>
            )}
            {selectedLog.request_body && (
              <div>
                <label className="text-muted-foreground/50">{t('audit.requestBody', '请求体')}</label>
                <pre className="text-muted-foreground bg-card/secondary p-2 rounded mt-1 overflow-x-auto text-xs whitespace-pre-wrap break-all">
                  {(() => {
                    const body = selectedLog.request_body
                    if (typeof body === 'object') {
                      return JSON.stringify(body, null, 2)
                    }
                    if (typeof body === 'string') {
                      try {
                        return JSON.stringify(JSON.parse(body), null, 2)
                      } catch {
                        return body
                      }
                    }
                    return String(body)
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
  icon: typeof Shield
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