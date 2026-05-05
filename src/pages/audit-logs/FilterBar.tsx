import { Input } from '@/components/ui/Input'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/Select'
import { cn } from '@/lib/utils'
import type { AuditAction } from '@/lib/api/audit'

export type AuditLogFilters = {
  action?: AuditAction
  user_id?: string
  request_path?: string
}

export function FilterBar({
  filters,
  uniquePaths,
  uniqueUsers,
  sortBy,
  sortOrder,
  logsCount,
  totalCount,
  actionConfig,
  onFiltersChange,
  onSortByCreatedAt,
  onSortByDuration,
}: {
  filters: AuditLogFilters
  uniquePaths: string[]
  uniqueUsers: Array<{ id: string; username: string }>
  sortBy: 'created_at' | 'duration_ms'
  sortOrder: 'asc' | 'desc'
  logsCount: number
  totalCount: number
  actionConfig: Record<AuditAction, { color: string; label: string }>
  onFiltersChange: (f: AuditLogFilters) => void
  onSortByCreatedAt: () => void
  onSortByDuration: () => void
}) {
  const sortIcon = sortOrder === 'asc' ? '↑' : '↓'

  return (
    <div className="p-3 border-b border-border space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <Select
          value={filters.action || 'all'}
          onValueChange={(v) => onFiltersChange({ ...filters, action: v === 'all' ? undefined : (v as AuditAction) })}
        >
          <SelectTrigger className="w-28 h-8 text-xs">
            <SelectValue placeholder="操作" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部操作</SelectItem>
            {Object.entries(actionConfig).map(([key, config]) => (
              <SelectItem key={key} value={key}>
                <span className={cn('px-1.5 py-0.5 rounded text-[10px]', config.color)}>{config.label}</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.request_path || 'all'}
          onValueChange={(v) => onFiltersChange({ ...filters, request_path: v === 'all' ? undefined : v })}
        >
          <SelectTrigger className="w-36 h-8 text-xs">
            <SelectValue placeholder="路径" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部路径</SelectItem>
            {uniquePaths.map((path) => (
              <SelectItem key={path} value={path} className="font-mono text-[10px]">{path}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.user_id || 'all'}
          onValueChange={(v) => onFiltersChange({ ...filters, user_id: v === 'all' ? undefined : v })}
        >
          <SelectTrigger className="w-36 h-8 text-xs">
            <SelectValue placeholder="用户" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部用户</SelectItem>
            {uniqueUsers.map((user) => (
              <SelectItem key={user.id} value={user.id} className="font-mono text-[10px]">{user.id.slice(0, 8)}...</SelectItem>
            ))}
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
