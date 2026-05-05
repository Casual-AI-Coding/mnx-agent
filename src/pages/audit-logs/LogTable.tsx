import { cn } from '@/lib/utils'
import type { AuditLog, AuditAction } from '@/lib/api/audit'

export function LogTable({
  logs,
  isLoading,
  totalPages,
  page,
  statusColors,
  onPageChange,
  onSelectLog,
  getActionConfig,
  formatDuration,
  formatTime,
}: {
  logs: AuditLog[]
  isLoading: boolean
  totalPages: number
  page: number
  statusColors: Record<string, string>
  onPageChange: (p: number) => void
  onSelectLog: (log: AuditLog) => void
  getActionConfig: (action: AuditAction) => { color: string; label: string }
  formatDuration: (ms: number | null | undefined) => string
  formatTime: (dateStr: string) => string
}) {
  if (isLoading && logs.length === 0) {
    return <div className="p-8 text-center text-sm text-muted-foreground">加载中...</div>
  }

  if (logs.length === 0) {
    return <div className="p-8 text-center text-sm text-muted-foreground">暂无审计日志</div>
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead className="bg-muted/50">
          <tr>
            <th className="text-left p-3 font-medium text-muted-foreground w-[140px]">时间</th>
            <th className="text-left p-3 font-medium text-muted-foreground w-[80px]">操作</th>
            <th className="text-left p-3 font-medium text-muted-foreground">路径</th>
            <th className="text-left p-3 font-medium text-muted-foreground w-[80px]">用户</th>
            <th className="text-left p-3 font-medium text-muted-foreground w-[60px]">状态</th>
            <th className="text-left p-3 font-medium text-muted-foreground w-[80px]">耗时</th>
          </tr>
        </thead>
        <tbody>
          {logs.map((log) => {
            const actionCfg = getActionConfig(log.action)
            const statusColor = log.response_status && log.response_status < 400 ? statusColors.success :
              log.response_status && log.response_status >= 400 ? statusColors.failed : statusColors.info
            return (
              <tr
                key={log.id}
                className="border-b border-border/50 hover:bg-muted/30 cursor-pointer transition-colors"
                onClick={() => onSelectLog(log)}
              >
                <td className="p-3 font-mono text-muted-foreground">
                  {formatTime(log.created_at)}
                </td>
                <td className="p-3">
                  <span className={cn('px-1.5 py-0.5 rounded text-[10px]', actionCfg.color)}>
                    {actionCfg.label}
                  </span>
                </td>
                <td className="p-3 font-mono max-w-[200px] truncate">
                  {log.request_path}
                </td>
                <td className="p-3 font-mono text-muted-foreground">
                  {log.user_id?.slice(0, 8)}...
                </td>
                <td className="p-3">
                  <span className={cn('px-1.5 py-0.5 rounded text-[10px]', statusColor)}>
                    {log.response_status ?? 'info'}
                  </span>
                </td>
                <td className="p-3 font-mono">{formatDuration(log.duration_ms)}</td>
              </tr>
            )
          })}
        </tbody>
      </table>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-1 p-3 border-t border-border">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              onClick={() => onPageChange(p)}
              className={cn(
                'w-8 h-8 rounded text-xs font-medium transition-colors',
                p === page ? 'bg-primary text-primary-foreground' : 'hover:bg-muted text-muted-foreground'
              )}
            >
              {p}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
