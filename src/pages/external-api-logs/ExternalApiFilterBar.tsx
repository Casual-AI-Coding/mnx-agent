import { motion } from 'framer-motion'
import { ArrowUpDown, ChevronUp, SlidersHorizontal } from 'lucide-react'
import { Select, SelectTrigger, SelectContent, SelectItem } from '@/components/ui/Select'
import { cn } from '@/lib/utils'
import type { ServiceProvider, ExternalApiStatus } from '@/lib/api/external-api-logs'

export function ExternalApiFilterBar({
  filters,
  uniqueProviders,
  uniqueOperations,
  sortBy,
  sortOrder,
  logsCount,
  totalCount,
  providerColors,
  onFiltersChange,
  onSortToggle,
}: {
  filters: { service_provider?: ServiceProvider; status?: ExternalApiStatus; operation?: string }
  uniqueProviders: string[]
  uniqueOperations: string[]
  sortBy: 'created_at' | 'duration_ms'
  sortOrder: 'asc' | 'desc'
  logsCount: number
  totalCount: number
  providerColors: Record<string, string>
  onFiltersChange: (f: { service_provider?: ServiceProvider; status?: ExternalApiStatus; operation?: string }) => void
  onSortToggle: (field: 'created_at' | 'duration_ms') => void
}) {
  const defaultProviderColor = 'bg-muted/20 text-muted-foreground border-border'
  const getProviderColor = (p: string) => providerColors[p] || defaultProviderColor

  return (
    <div className="bg-gradient-to-r from-card via-card to-muted/20 border-b border-border/50">
      <div className="flex flex-wrap items-center gap-3 p-4">
        <span className="text-lg font-semibold">日志列表</span>
        <div className="h-8 w-px bg-border/60 hidden sm:block" />
        <div className="flex items-center gap-1.5">
          <SlidersHorizontal className="w-4 h-4 text-muted-foreground/70" />
        </div>

        <Select value={filters.service_provider || '__all__'} onValueChange={(v) => onFiltersChange({ ...filters, service_provider: v === '__all__' ? undefined : v as ServiceProvider })}>
          <SelectTrigger className="w-[140px] h-10 border-border/50 bg-background/50 hover:bg-muted/50 transition-colors">
            <div className="flex items-center gap-1.5">
              <span className="text-muted-foreground/70 text-sm">服务商</span>
              <span className={cn('text-sm font-medium truncate max-w-[60px]', filters.service_provider ? 'text-foreground' : 'text-muted-foreground/60')}>
                {filters.service_provider || '全部'}
              </span>
            </div>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__"><div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-muted-foreground/40" />全部服务商</div></SelectItem>
            {uniqueProviders.map(p => (
              <SelectItem key={p} value={p}><div className="flex items-center gap-2"><div className={cn('w-2 h-2 rounded-full', getProviderColor(p).split(' ')[0])} />{p}</div></SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filters.status || '__all__'} onValueChange={(v) => onFiltersChange({ ...filters, status: v === '__all__' ? undefined : v as ExternalApiStatus })}>
          <SelectTrigger className="w-[130px] h-10 border-border/50 bg-background/50 hover:bg-muted/50 transition-colors">
            <div className="flex items-center gap-1.5">
              <span className="text-muted-foreground/70 text-sm">状态</span>
              <span className={cn('text-sm font-medium', filters.status === 'success' && 'text-success', filters.status === 'failed' && 'text-destructive', !filters.status && 'text-muted-foreground/60')}>
                {filters.status === 'success' ? '成功' : filters.status === 'failed' ? '失败' : '全部'}
              </span>
            </div>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__"><div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-muted-foreground/40" />全部状态</div></SelectItem>
            <SelectItem value="success"><div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-success" />成功</div></SelectItem>
            <SelectItem value="failed"><div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-destructive" />失败</div></SelectItem>
          </SelectContent>
        </Select>

        <Select value={filters.operation || '__all__'} onValueChange={(v) => onFiltersChange({ ...filters, operation: v === '__all__' ? undefined : v })}>
          <SelectTrigger className="w-[180px] h-10 border-border/50 bg-background/50 hover:bg-muted/50 transition-colors">
            <div className="flex items-center gap-1.5">
              <span className="text-muted-foreground/70 text-sm">操作</span>
              <span className={cn('text-sm font-medium truncate max-w-[80px]', filters.operation ? 'text-foreground' : 'text-muted-foreground/60')}>{filters.operation || '全部'}</span>
            </div>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__"><div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-muted-foreground/40" />全部操作</div></SelectItem>
            {uniqueOperations.map(op => (
              <SelectItem key={op} value={op}><div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-primary/60" /><span className="truncate max-w-[200px]" title={op}>{op}</span></div></SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex-1" />
        <div className="h-8 w-px bg-border/60 hidden md:block" />
        <ArrowUpDown className="w-4 h-4 text-muted-foreground/60" />

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => onSortToggle('created_at')}
          className={cn('flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200', sortBy === 'created_at' ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/20' : 'text-muted-foreground hover:text-foreground hover:bg-muted/50')}
        >
          时间
          {sortBy === 'created_at' && (
            <motion.div initial={{ rotate: 0 }} animate={{ rotate: sortOrder === 'asc' ? 0 : 180 }} transition={{ duration: 0.2 }}>
              <ChevronUp className="w-3.5 h-3.5" />
            </motion.div>
          )}
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => onSortToggle('duration_ms')}
          className={cn('flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200', sortBy === 'duration_ms' ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/20' : 'text-muted-foreground hover:text-foreground hover:bg-muted/50')}
        >
          耗时
          {sortBy === 'duration_ms' && (
            <motion.div initial={{ rotate: 0 }} animate={{ rotate: sortOrder === 'asc' ? 0 : 180 }} transition={{ duration: 0.2 }}>
              <ChevronUp className="w-3.5 h-3.5" />
            </motion.div>
          )}
        </motion.button>

        <div className="h-8 w-px bg-border/60 hidden lg:block" />
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground/70">结果</span>
          <span className="font-semibold text-foreground">{logsCount}</span>
          <span className="text-muted-foreground/50">/ {totalCount || 0}</span>
        </div>
      </div>
    </div>
  )
}
