import { useEffect, useState, useRef } from 'react'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { Shield, RefreshCw, ChevronLeft, ChevronRight, Clock, AlertCircle, CheckCircle2, Copy, Check, ArrowUpDown, ChevronUp, SlidersHorizontal } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import { Dialog, DialogHeader, DialogFooter } from '@/components/ui/Dialog'
import { Select, SelectTrigger, SelectContent, SelectItem } from '@/components/ui/Select'
import { PageHeader } from '@/components/shared/PageHeader'
import { getAuditLogs, getAuditStats, getUniqueRequestPaths, getUniqueAuditUsers, type AuditLog, type AuditAction, type AuditStats } from '@/lib/api/audit'
import { toastError } from '@/lib/toast'
import { cn } from '@/lib/utils'
import { status, services } from '@/themes/tokens'
import { useAuthStore } from '@/stores/auth'

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
  const { isHydrated } = useAuthStore()
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
    user_id?: string
    status_filter?: 'all' | 'success' | 'error'
  }>({})
  const [sortBy, setSortBy] = useState<'created_at' | 'duration_ms'>('created_at')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [uniquePaths, setUniquePaths] = useState<string[]>([])
  const [uniqueUsers, setUniqueUsers] = useState<{ id: string; username: string }[]>([])
  
  const hasInitializedRef = useRef(false)
  const isFetchingRef = useRef(false)

  useEffect(() => {
    if (!isHydrated || isFetchingRef.current) return
    
    if (!hasInitializedRef.current) {
      hasInitializedRef.current = true
      isFetchingRef.current = true
      loadData()
      loadAllPaths()
      loadAllUsers().finally(() => {
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

  const loadAllPaths = async () => {
    try {
      const res = await getUniqueRequestPaths()
      if (res.success && res.data) {
        setUniquePaths(res.data.sort())
      }
    } catch {}
  }

  const loadAllUsers = async () => {
    try {
      const res = await getUniqueAuditUsers()
      if (res.success && res.data) {
        setUniqueUsers(res.data)
      }
    } catch {}
  }

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

      <Card className="border-border overflow-hidden">
        <div className="bg-gradient-to-r from-card via-card to-muted/20 border-b border-border/50">
          <div className="flex flex-wrap items-center gap-3 p-4">
            <CardTitle className="text-lg">{t('audit.logList', '日志列表')}</CardTitle>

            <div className="h-8 w-px bg-border/60 hidden sm:block" />

            <div className="flex items-center gap-1.5">
              <SlidersHorizontal className="w-4 h-4 text-muted-foreground/70" />
            </div>

            <Select
              value={filters.request_path || '__all__'}
              onValueChange={(v) => setFilters(f => ({ ...f, request_path: v === '__all__' ? undefined : v }))}
            >
              <SelectTrigger className="w-[180px] h-10 border-border/50 bg-background/50 hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-1.5">
                  <span className="text-muted-foreground/70 text-sm">路径</span>
                  <span className={cn(
                    'text-sm font-medium truncate max-w-[80px]',
                    filters.request_path ? 'text-foreground' : 'text-muted-foreground/60'
                  )}>
                    {filters.request_path ? filters.request_path.split('/').pop() || filters.request_path : '全部'}
                  </span>
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-muted-foreground/40" />
                    全部路径
                  </div>
                </SelectItem>
                {uniquePaths.map(path => (
                  <SelectItem key={path} value={path}>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-primary/60" />
                      <span className="truncate max-w-[200px]" title={path}>{path}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={filters.user_id || '__all__'}
              onValueChange={(v) => setFilters(f => ({ ...f, user_id: v === '__all__' ? undefined : v }))}
            >
              <SelectTrigger className="w-[140px] h-10 border-border/50 bg-background/50 hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-1.5">
                  <span className="text-muted-foreground/70 text-sm">用户</span>
                  <span className={cn(
                    'text-sm font-medium truncate max-w-[60px]',
                    filters.user_id ? 'text-foreground' : 'text-muted-foreground/60'
                  )}>
                    {filters.user_id ? uniqueUsers.find(u => u.id === filters.user_id)?.username || '未知' : '全部'}
                  </span>
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-muted-foreground/40" />
                    全部用户
                  </div>
                </SelectItem>
                {uniqueUsers.map(user => (
                  <SelectItem key={user.id} value={user.id}>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-primary/60" />
                      {user.username}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={filters.status_filter || 'all'}
              onValueChange={(v) => setFilters(f => ({ ...f, status_filter: v as 'all' | 'success' | 'error' }))}
            >
              <SelectTrigger className="w-[130px] h-10 border-border/50 bg-background/50 hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-1.5">
                  <span className="text-muted-foreground/70 text-sm">状态</span>
                  <span className={cn(
                    'text-sm font-medium',
                    filters.status_filter === 'success' && 'text-success',
                    filters.status_filter === 'error' && 'text-destructive',
                    !filters.status_filter && 'text-muted-foreground/60'
                  )}>
                    {filters.status_filter === 'success' ? '成功' : filters.status_filter === 'error' ? '失败' : '全部'}
                  </span>
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
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
                <SelectItem value="error">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-destructive" />
                    失败
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={filters.action || 'all'}
              onValueChange={(v) => setFilters(f => ({ ...f, action: v === 'all' ? undefined : v as AuditAction }))}
            >
              <SelectTrigger className="w-[130px] h-10 border-border/50 bg-background/50 hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-1.5">
                  <span className="text-muted-foreground/70 text-sm">类型</span>
                  <span className={cn(
                    'text-sm font-medium',
                    filters.action ? 'text-foreground' : 'text-muted-foreground/60'
                  )}>
                    {filters.action ? ACTION_CONFIG[filters.action]?.label : '全部'}
                  </span>
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-muted-foreground/40" />
                    全部类型
                  </div>
                </SelectItem>
                {(Object.keys(ACTION_CONFIG) as AuditAction[]).map((action) => (
                  <SelectItem key={action} value={action}>
                    <div className="flex items-center gap-2">
                      <div className={cn('w-2 h-2 rounded-full', ACTION_CONFIG[action].color.replace(/text-\S+|border-\S+/g, '').trim() || 'bg-muted-foreground/40')} />
                      {ACTION_CONFIG[action].label}
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
                <th className="py-3 px-4 text-left text-xs font-semibold text-muted-foreground/70 uppercase tracking-wider">类型</th>
                <th className="py-3 px-4 text-left text-xs font-semibold text-muted-foreground/70 uppercase tracking-wider">路径</th>
                <th className="py-3 px-4 text-left text-xs font-semibold text-muted-foreground/70 uppercase tracking-wider">用户</th>
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
                      icon={Shield}
                      title={t('audit.noLogs', '暂无审计日志')}
                      description={t('audit.noLogsHint', '系统操作将自动记录在此')}
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
                      <Badge className={cn('capitalize text-xs', getActionConfig(log.action).color)}>
                        {getActionConfig(log.action).label}
                      </Badge>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-sm truncate block">{log.request_path || '-'} <span className="text-muted-foreground/50">({log.request_method || '-'} · {log.resource_type || '-'})</span></span>
                    </td>
                    <td className="py-3 px-4 text-sm text-muted-foreground/70">
                      {log.username || '-'}
                    </td>
                    <td className="py-3 px-4 text-right text-muted-foreground/70 text-sm tabular-nums">
                      {formatDuration(log.duration_ms)}
                    </td>
                    <td className="py-3 px-4 text-right text-muted-foreground/50 text-xs tabular-nums">
                      {formatTime(log.created_at)}
                    </td>
                    <td className={cn(
                      'py-3 px-4 text-right text-sm tabular-nums',
                      STATUS_COLORS[Math.floor((log.response_status || 0) / 100).toString()] || 'text-muted-foreground/70'
                    )}>
                      {log.response_status || '-'}
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