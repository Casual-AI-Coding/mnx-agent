import { motion, AnimatePresence } from 'framer-motion'
import { Search, RefreshCw, SlidersHorizontal, ArrowUpDown, X } from 'lucide-react'
import { Input } from '@/components/ui/Input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select'
import { cn } from '@/lib/utils'
import { status } from '@/themes/tokens'
import { SortButton } from './SortButton'
import type { SortField, SortOrder, StatusFilter, FilterChip } from '../InvitationCodes/types'

interface FilterBarProps {
  searchQuery: string
  statusFilter: StatusFilter
  sortField: SortField
  sortOrder: SortOrder
  filterChips: FilterChip[]
  codesCount: number
  totalCount: number
  onSearchChange: (query: string) => void
  onStatusChange: (status: StatusFilter) => void
  onToggleSort: (field: SortField) => void
  onRemoveFilterChip: (chip: FilterChip) => void
  onClearFilters: () => void
}

export function FilterBar({
  searchQuery,
  statusFilter,
  sortField,
  sortOrder,
  filterChips,
  codesCount,
  totalCount,
  onSearchChange,
  onStatusChange,
  onToggleSort,
  onRemoveFilterChip,
  onClearFilters,
}: FilterBarProps) {
  const hasActiveFilters = filterChips.length > 0

  return (
    <div className="bg-gradient-to-r from-card via-card to-muted/20">
      <div className="p-5 space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative w-[280px] group">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className={cn('h-4 w-4 text-muted-foreground/60 transition-colors', status.warning.text)} />
            </div>
            <Input
              placeholder="搜索邀请码或创建者..."
              value={searchQuery}
              onChange={e => onSearchChange(e.target.value)}
              className="pl-10 pr-10 h-10 bg-background/50 border-border/50 focus:border-warning/50 focus:ring-2 focus:ring-warning/10 transition-all"
            />
            {searchQuery && (
              <motion.button
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                onClick={() => onSearchChange('')}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-muted-foreground/60 hover:text-foreground transition-colors"
              >
                <X className="h-4 w-4" />
              </motion.button>
            )}
          </div>

          <div className="h-8 w-px bg-border/60 hidden sm:block" />
          <div className="flex items-center gap-1.5">
            <SlidersHorizontal className="w-4 h-4 text-muted-foreground/70" />
            <span className="text-sm text-muted-foreground/70 hidden sm:inline">筛选</span>
          </div>
          <Select value={statusFilter} onValueChange={(v) => onStatusChange(v as StatusFilter)}>
            <SelectTrigger className="w-[120px] h-10 border-border/50 bg-background/50 hover:bg-muted/50 transition-colors">
              <div className="flex items-center gap-1.5">
                <span className="text-muted-foreground/70 text-sm">状态</span>
                <span className={cn('text-sm font-medium', statusFilter !== 'all' ? 'text-foreground' : 'text-muted-foreground/60')}>
                  {statusFilter === 'all' ? '全部' :
                   statusFilter === 'active' ? '可用' :
                   statusFilter === 'used' ? '已用完' :
                   statusFilter === 'expired' ? '已过期' : '已禁用'}
                </span>
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all"><div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-muted-foreground/40" />全部状态</div></SelectItem>
              <SelectItem value="active"><div className="flex items-center gap-2"><div className={cn('w-2 h-2 rounded-full', status.success.bg)} />可用</div></SelectItem>
              <SelectItem value="used"><div className="flex items-center gap-2"><div className={cn('w-2 h-2 rounded-full', status.info.bg)} />已用完</div></SelectItem>
              <SelectItem value="expired"><div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-muted-foreground/50" />已过期</div></SelectItem>
              <SelectItem value="inactive"><div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-destructive" />已禁用</div></SelectItem>
            </SelectContent>
          </Select>

          <div className="flex-1" />

          {hasActiveFilters && (
            <>
              <div className="h-8 w-px bg-border/60" />
              <div className="flex items-center gap-2 flex-wrap">
                <AnimatePresence mode="popLayout">
                  {filterChips.map((chip, index) => (
                    <motion.div
                      key={chip.id}
                      layout initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }} transition={{ duration: 0.15, delay: index * 0.03 }}
                      className={cn(
                        'inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium border cursor-pointer hover:opacity-80 transition-opacity',
                        chip.type === 'search' && cn(status.warning.bg, status.warning.foreground, status.warning.border),
                        chip.type === 'status' && statusFilter === 'active' && cn(status.success.bg, status.success.foreground, status.success.border),
                        chip.type === 'status' && statusFilter === 'used' && cn(status.info.bg, status.info.foreground, status.info.border),
                        chip.type === 'status' && statusFilter === 'expired' && 'bg-muted/50 text-muted-foreground border-muted-foreground/20',
                        chip.type === 'status' && statusFilter === 'inactive' && 'bg-destructive/10 text-destructive border-destructive/20'
                      )}
                      onClick={() => onRemoveFilterChip(chip)}
                    >
                      {chip.label}
                      <X className="w-3 h-3" />
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={onClearFilters} className="flex items-center gap-1 text-xs text-muted-foreground/70 hover:text-destructive transition-colors">
                <RefreshCw className="w-3 h-3" />清除
              </motion.button>
            </>
          )}

          <div className="h-8 w-px bg-border/60 hidden md:block" />
          <ArrowUpDown className="w-4 h-4 text-muted-foreground/60" />
          <div className="flex items-center gap-1">
            <SortButton field="created_at" currentField={sortField} order={sortOrder} onClick={() => onToggleSort('created_at')}>创建</SortButton>
            <SortButton field="expires_at" currentField={sortField} order={sortOrder} onClick={() => onToggleSort('expires_at')}>过期</SortButton>
            <SortButton field="used_count" currentField={sortField} order={sortOrder} onClick={() => onToggleSort('used_count')}>次数</SortButton>
          </div>

          <div className="h-8 w-px bg-border/60 hidden lg:block" />
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground/70">结果</span>
            <span className="font-semibold text-foreground">{codesCount}</span>
            <span className="text-muted-foreground/50">/ {totalCount}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
