import { motion } from 'framer-motion'
import { ArrowUpDown, ChevronUp, SlidersHorizontal } from 'lucide-react'
import { CardTitle } from '@/components/ui/Card'
import { Select, SelectTrigger, SelectContent, SelectItem } from '@/components/ui/Select'
import { cn } from '@/lib/utils'
import type { AuditAction } from '@/lib/api/audit'

export interface AuditLogFilters {
  action?: AuditAction
  resource_type?: string
  request_path?: string
  user_id?: string
  status_filter?: 'all' | 'success' | 'error'
}

export function AuditFilterBar({
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
  t,
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
  t: (key: string, fallback?: string) => string
}) {
  return (
    <div className="bg-gradient-to-r from-card via-card to-muted/20 border-b border-border/50">
      <div className="flex flex-wrap items-center gap-3 p-4">
        <CardTitle className="text-lg">{t('audit.logList', '日志列表')}</CardTitle>

        <div className="h-8 w-px bg-border/60 hidden sm:block" />

        <div className="flex items-center gap-1.5">
          <SlidersHorizontal className="w-4 h-4 text-muted-foreground/70" />
        </div>

        <Select
          value={filters.request_path || '__all__'}
          onValueChange={(v) => onFiltersChange({ ...filters, request_path: v === '__all__' ? undefined : v })}
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
          onValueChange={(v) => onFiltersChange({ ...filters, user_id: v === '__all__' ? undefined : v })}
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
          onValueChange={(v) => onFiltersChange({ ...filters, status_filter: v as 'all' | 'success' | 'error' })}
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
          onValueChange={(v) => onFiltersChange({ ...filters, action: v === 'all' ? undefined : v as AuditAction })}
        >
          <SelectTrigger className="w-[130px] h-10 border-border/50 bg-background/50 hover:bg-muted/50 transition-colors">
            <div className="flex items-center gap-1.5">
              <span className="text-muted-foreground/70 text-sm">类型</span>
              <span className={cn(
                'text-sm font-medium',
                filters.action ? 'text-foreground' : 'text-muted-foreground/60'
              )}>
                {filters.action ? actionConfig[filters.action]?.label : '全部'}
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
            {(Object.keys(actionConfig) as AuditAction[]).map((action) => (
              <SelectItem key={action} value={action}>
                <div className="flex items-center gap-2">
                  <div className={cn('w-2 h-2 rounded-full', actionConfig[action].color.replace(/text-\S+|border-\S+/g, '').trim() || 'bg-muted-foreground/40')} />
                  {actionConfig[action].label}
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
          onClick={onSortByCreatedAt}
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
          onClick={onSortByDuration}
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
          <span className="font-semibold text-foreground">{logsCount}</span>
          <span className="text-muted-foreground/50">/ {totalCount}</span>
        </div>
      </div>
    </div>
  )
}
