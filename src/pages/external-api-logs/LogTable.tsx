import { cn } from '@/lib/utils'
import type { ExternalApiLog, ExternalApiStatus } from '@/lib/api/external-api-logs'

export function LogTable({
  logs,
  isLoading,
  totalPages,
  page,
  statusConfig,
  getProviderColor,
  onPageChange,
  onSelectLog,
  formatDuration,
  formatTime,
}: {
  logs: ExternalApiLog[]
  isLoading: boolean
  totalPages: number
  page: number
  statusConfig: Record<ExternalApiStatus, { color: string; icon: React.ComponentType<{ className?: string }>; label: string }>
  getProviderColor: (p: string) => string
  onPageChange: (p: number) => void
  onSelectLog: (log: ExternalApiLog) => void
  formatDuration: (ms: number | null) => string
  formatTime: (dateStr: string) => string
}) {
  if (isLoading && logs.length === 0) {
    return <div className="p-8 text-center text-sm text-muted-foreground">加载中...</div>
  }

  if (logs.length === 0) {
    return <div className="p-8 text-center text-sm text-muted-foreground">暂无日志记录</div>
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead className="bg-muted/50">
          <tr>
            <th className="text-left p-3 font-medium text-muted-foreground w-[140px]">时间</th>
            <th className="text-left p-3 font-medium text-muted-foreground w-[80px]">服务商</th>
            <th className="text-left p-3 font-medium text-muted-foreground">接口</th>
            <th className="text-left p-3 font-medium text-muted-foreground w-[60px]">状态</th>
            <th className="text-left p-3 font-medium text-muted-foreground w-[80px]">耗时</th>
            <th className="text-left p-3 font-medium text-muted-foreground w-[120px]">请求参数</th>
          </tr>
        </thead>
        <tbody>
          {logs.map((log) => {
            const status = statusConfig[log.status]
            const StatusIcon = status?.icon
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
                  <span className={cn('px-1.5 py-0.5 rounded text-[10px] border', getProviderColor(log.service_provider))}>
                    {log.service_provider}
                  </span>
                </td>
                <td className="p-3 font-mono max-w-[200px] truncate">
                  {log.operation || log.api_endpoint}
                </td>
                <td className="p-3">
                  {StatusIcon && (
                    <span className={cn('flex items-center gap-1', status.color)}>
                      <StatusIcon className="w-3 h-3" />
                      {status.label}
                    </span>
                  )}
                </td>
                <td className="p-3 font-mono">{formatDuration(log.duration_ms)}</td>
                <td className="p-3 max-w-[120px] truncate text-muted-foreground">
                  {typeof log.request_params === 'string' ? log.request_params : JSON.stringify(log.request_params || '')}
                </td>
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
