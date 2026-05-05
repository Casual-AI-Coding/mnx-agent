import { motion } from 'framer-motion'
import { Shield, ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import { CardContent } from '@/components/ui/Card'
import { cn } from '@/lib/utils'
import type { AuditLog, AuditAction } from '@/lib/api/audit'

export function AuditLogTable({
  logs,
  isLoading,
  page,
  totalPages,
  statusColors,
  onPageChange,
  onSelectLog,
  actionConfig,
  defaultActionConfig,
  formatDuration,
  formatTime,
  t,
}: {
  logs: AuditLog[]
  isLoading: boolean
  page: number
  totalPages: number
  statusColors: Record<string, string>
  onPageChange: (p: number) => void
  onSelectLog: (log: AuditLog) => void
  actionConfig: Record<AuditAction, { color: string; label: string }>
  defaultActionConfig: { color: string; label: string }
  formatDuration: (ms: number | null) => string
  formatTime: (dateStr: string) => string
  t: (key: string, fallback?: string) => string
}) {
  const getActionConfig = (action: string) =>
    (actionConfig as Record<string, { color: string; label: string }>)[action] || defaultActionConfig

  return (
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
                onClick={() => onSelectLog(log)}
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
                  statusColors[Math.floor((log.response_status || 0) / 100).toString()] || 'text-muted-foreground/70'
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
          <Button variant="outline" size="sm" disabled={page === 1} onClick={() => onPageChange(page - 1)}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-muted-foreground/70 text-sm">{page} / {totalPages}</span>
          <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => onPageChange(page + 1)}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      )}
    </CardContent>
  )
}
