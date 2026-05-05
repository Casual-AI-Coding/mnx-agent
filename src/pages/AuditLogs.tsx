import { useEffect, useState, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Shield, RefreshCw, Clock, AlertCircle, CheckCircle2 } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { PageHeader } from '@/components/shared/PageHeader'
import { getAuditLogs, getAuditStats, getUniqueRequestPaths, getUniqueAuditUsers, type AuditLog, type AuditAction, type AuditStats } from '@/lib/api/audit'
import { toastError } from '@/lib/toast'
import { cn } from '@/lib/utils'
import { status, services } from '@/themes/tokens'
import { useAuthStore } from '@/stores/auth'
import { FilterBar, type AuditLogFilters } from '@/pages/audit-logs/FilterBar'
import { LogTable } from '@/pages/audit-logs/LogTable'
import { StatCard } from '@/pages/audit-logs/StatCard'
import { LogDetailDialog } from '@/pages/audit-logs/LogDetailDialog'

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
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [filters, setFilters] = useState<AuditLogFilters>({})
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
        <FilterBar
          filters={filters}
          uniquePaths={uniquePaths}
          uniqueUsers={uniqueUsers}
          sortBy={sortBy}
          sortOrder={sortOrder}
          logsCount={logs.length}
          totalCount={stats?.total || 0}
          actionConfig={ACTION_CONFIG}
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
          statusColors={STATUS_COLORS}
          onPageChange={setPage}
          onSelectLog={setSelectedLog}
          getActionConfig={getActionConfig}
          formatDuration={formatDuration}
          formatTime={formatTime}
        />
      </Card>

      <LogDetailDialog
        selectedLog={selectedLog}
        actionConfig={ACTION_CONFIG}
        defaultActionConfig={DEFAULT_ACTION_CONFIG}
        formatDuration={formatDuration}
        onClose={() => setSelectedLog(null)}
      />
    </div>
  )
}
