import { Input } from '@/components/ui/Input'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/Select'
import { cn } from '@/lib/utils'
import type { ExternalApiStatus } from '@/lib/api/external-api-logs'

export type ExternalApiLogFilters = {
  provider?: string
  operation?: string
  status?: ExternalApiStatus
}

export function FilterBar({
  filters,
  uniqueOperations,
  uniqueProviders,
  sortBy,
  sortOrder,
  logsCount,
  totalCount,
  getProviderColor,
  onFiltersChange,
  onSortByCreatedAt,
  onSortByDuration,
}: {
  filters: ExternalApiLogFilters
  uniqueOperations: string[]
  uniqueProviders: string[]
  sortBy: 'created_at' | 'duration_ms'
  sortOrder: 'asc' | 'desc'
  logsCount: number
  totalCount: number
  getProviderColor: (p: string) => string
  onFiltersChange: (f: ExternalApiLogFilters) => void
  onSortByCreatedAt: () => void
  onSortByDuration: () => void
}) {
  const sortIcon = sortOrder === 'asc' ? '↑' : '↓'

  return (
    <div className="p-3 border-b border-border space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <Select
          value={filters.provider || 'all'}
          onValueChange={(v) => onFiltersChange({ ...filters, provider: v === 'all' ? undefined : v })}
        >
          <SelectTrigger className="w-36 h-8 text-xs">
            <SelectValue placeholder="服务商" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部服务商</SelectItem>
            {uniqueProviders.map((p) => (
              <SelectItem key={p} value={p}>
                <span className={cn('px-1.5 py-0.5 rounded text-[10px]', getProviderColor(p))}>{p}</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.operation || 'all'}
          onValueChange={(v) => onFiltersChange({ ...filters, operation: v === 'all' ? undefined : v })}
        >
          <SelectTrigger className="w-36 h-8 text-xs">
            <SelectValue placeholder="操作" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部操作</SelectItem>
            {uniqueOperations.map((op) => (
              <SelectItem key={op} value={op}>{op}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.status || 'all'}
          onValueChange={(v) => onFiltersChange({ ...filters, status: v === 'all' ? undefined : (v as ExternalApiStatus) })}
        >
          <SelectTrigger className="w-28 h-8 text-xs">
            <SelectValue placeholder="状态" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部状态</SelectItem>
            <SelectItem value="success">成功</SelectItem>
            <SelectItem value="failed">失败</SelectItem>
            <SelectItem value="pending">进行中</SelectItem>
          </SelectContent>
        </Select>

        <button onClick={onSortByCreatedAt} className={cn('px-2 py-1 text-xs rounded border hover:bg-muted', sortBy === 'created_at' && 'bg-muted')}>
          时间 {sortBy === 'created_at' ? sortIcon : ''}
        </button>
        <button onClick={onSortByDuration} className={cn('px-2 py-1 text-xs rounded border hover:bg-muted', sortBy === 'duration_ms' && 'bg-muted')}>
          耗时 {sortBy === 'duration_ms' ? sortIcon : ''}
        </button>
      </div>
      <div className="text-[10px] text-muted-foreground">
        显示 {logsCount} / {totalCount} 条日志
      </div>
    </div>
  )
}
