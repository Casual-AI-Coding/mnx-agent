import { motion } from 'framer-motion'
import { Globe, ChevronLeft, ChevronRight } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { cn } from '@/lib/utils'
import type { ExternalApiLog, ExternalApiStatus } from '@/lib/api/external-api-logs'

export function ExternalApiLogTable({
  logs,
  isLoading,
  totalPages,
  page,
  providerColors,
  statusConfig,
  formatDuration,
  formatTime,
  onPageChange,
  onSelectLog,
}: {
  logs: ExternalApiLog[]
  isLoading: boolean
  totalPages: number
  page: number
  providerColors: Record<string, string>
  statusConfig: Record<ExternalApiStatus, { color: string; label: string }>
  formatDuration: (ms: number | null) => string
  formatTime: (dateStr: string) => string
  onPageChange: (p: number) => void
  onSelectLog: (log: ExternalApiLog) => void
}) {
  const getProviderColor = (p: string) => providerColors[p] || 'bg-muted/20 text-muted-foreground border-border'

  return (
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
              <EmptyState icon={Globe} title="暂无外部调用日志" description="MiniMax API调用将自动记录在此" />
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
                <Badge className={cn('text-xs', getProviderColor(log.service_provider))}>{log.service_provider}</Badge>
              </td>
              <td className="py-3 px-4">
                <span className="text-sm truncate block max-w-[200px]" title={log.api_endpoint}>{log.api_endpoint}</span>
              </td>
              <td className="py-3 px-4 text-sm text-muted-foreground/70">{log.operation}</td>
              <td className="py-3 px-4 text-right text-muted-foreground/70 text-sm tabular-nums">{formatDuration(log.duration_ms)}</td>
              <td className="py-3 px-4 text-right text-muted-foreground/50 text-xs tabular-nums">{formatTime(log.created_at)}</td>
              <td className="py-3 px-4 text-right">
                <Badge className={cn('text-xs', statusConfig[log.status].color)}>{statusConfig[log.status].label}</Badge>
              </td>
            </motion.tr>
          ))
        )}
      </tbody>
      {totalPages > 1 && (
        <tfoot>
          <tr>
            <td colSpan={6}>
              <div className="flex items-center justify-center gap-2 py-3">
                <Button variant="outline" size="sm" disabled={page === 1} onClick={() => onPageChange(page - 1)}>
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="text-muted-foreground/70 text-sm">{page} / {totalPages}</span>
                <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => onPageChange(page + 1)}>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </td>
          </tr>
        </tfoot>
      )}
    </table>
  )
}
