import { motion, AnimatePresence } from 'framer-motion'
import {
  Search,
  SlidersHorizontal,
  ArrowUpDown,
  X,
  RotateCcw,
  ChevronUp,
  ChevronDown,
} from 'lucide-react'
import { Input } from '@/components/ui/Input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select'
import { cn } from '@/lib/utils'
import type { UserRole, SortField, SortOrder, FilterChip } from './types'
import { ROLE_CONFIG } from './types'

interface UserFiltersProps {
  searchQuery: string
  roleFilter: UserRole | 'all'
  statusFilter: 'all' | 'active' | 'inactive'
  sortField: SortField
  sortOrder: SortOrder
  filterChips: FilterChip[]
  hasActiveFilters: boolean
  filteredCount: number
  totalCount: number
  onSearchChange: (query: string) => void
  onRoleChange: (role: UserRole | 'all') => void
  onStatusChange: (status: 'all' | 'active' | 'inactive') => void
  onRemoveChip: (chip: FilterChip) => void
  onClearAll: () => void
  onToggleSort: (field: SortField) => void
}

function SortButton({ field, currentField, order, onClick, children }: {
  field: SortField
  currentField: SortField
  order: SortOrder
  onClick: () => void
  children: React.ReactNode
}) {
  const isActive = currentField === field
  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={cn(
        'flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200',
        isActive
          ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/20'
          : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
      )}
    >
      {children}
      {isActive && (
        <motion.div
          initial={{ rotate: 0 }}
          animate={{ rotate: order === 'asc' ? 0 : 180 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronUp className="w-3.5 h-3.5" />
        </motion.div>
      )}
    </motion.button>
  )
}

export function UserFilters({
  searchQuery,
  roleFilter,
  statusFilter,
  sortField,
  sortOrder,
  filterChips,
  hasActiveFilters,
  filteredCount,
  totalCount,
  onSearchChange,
  onRoleChange,
  onStatusChange,
  onRemoveChip,
  onClearAll,
  onToggleSort,
}: UserFiltersProps) {
  return (
    <div className="p-5 space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-[280px] group">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-muted-foreground/60 group-focus-within:text-primary transition-colors" />
          </div>
          <Input
            placeholder="搜索用户名或邮箱..."
            value={searchQuery}
            onChange={e => onSearchChange(e.target.value)}
            className="pl-10 pr-10 h-10 bg-background/50 border-border/50 focus:border-primary/50 focus:ring-2 focus:ring-primary/10 transition-all"
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

        <Select value={roleFilter} onValueChange={(v) => onRoleChange(v as UserRole | 'all')}>
          <SelectTrigger className="w-[110px] h-10 border-border/50 bg-background/50 hover:bg-muted/50 transition-colors">
            <div className="flex items-center gap-1.5">
              <span className="text-muted-foreground/70 text-sm">角色</span>
              <span className={cn(
                'text-sm font-medium',
                roleFilter !== 'all' ? 'text-foreground' : 'text-muted-foreground/60'
              )}>
                {roleFilter === 'all' ? '全部' : ROLE_CONFIG[roleFilter].label}
              </span>
            </div>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-muted-foreground/40" />
                全部角色
              </div>
            </SelectItem>
            {(['super', 'admin', 'pro', 'user'] as UserRole[]).map(role => (
              <SelectItem key={role} value={role}>
                <div className="flex items-center gap-2">
                  <div className={cn('w-2 h-2 rounded-full', ROLE_CONFIG[role].color.replace('text-', 'bg-'))} />
                  {ROLE_CONFIG[role].label}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={(v) => onStatusChange(v as 'all' | 'active' | 'inactive')}>
          <SelectTrigger className="w-[110px] h-10 border-border/50 bg-background/50 hover:bg-muted/50 transition-colors">
            <div className="flex items-center gap-1.5">
              <span className="text-muted-foreground/70 text-sm">状态</span>
              <span className={cn(
                'text-sm font-medium',
                statusFilter !== 'all' ? 'text-foreground' : 'text-muted-foreground/60'
              )}>
                {statusFilter === 'all' ? '全部' : statusFilter === 'active' ? '已启用' : '已禁用'}
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
            <SelectItem value="active">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                已启用
              </div>
            </SelectItem>
            <SelectItem value="inactive">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-slate-400" />
                已禁用
              </div>
            </SelectItem>
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
                    layout
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ duration: 0.15, delay: index * 0.03 }}
                    className={cn(
                      'inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium border cursor-pointer hover:opacity-80 transition-opacity',
                      chip.type === 'search' && 'bg-primary/10 text-primary border-primary/20',
                      chip.type === 'role' && roleFilter !== 'all' && ROLE_CONFIG[roleFilter].bgClass,
                      chip.type === 'status' && (statusFilter === 'active'
                        ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                        : 'bg-slate-500/10 text-slate-600 border-slate-500/20'
                      )
                    )}
                    onClick={() => onRemoveChip(chip)}
                  >
                    {chip.label}
                    <X className="w-3 h-3" />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={onClearAll}
              className="flex items-center gap-1 text-xs text-muted-foreground/70 hover:text-destructive transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
              清除
            </motion.button>
          </>
        )}

        <div className="h-8 w-px bg-border/60 hidden md:block" />

        <ArrowUpDown className="w-4 h-4 text-muted-foreground/60" />
        <div className="flex items-center gap-1">
          <SortButton field="created_at" currentField={sortField} order={sortOrder} onClick={() => onToggleSort('created_at')}>
            创建
          </SortButton>
          <SortButton field="last_login_at" currentField={sortField} order={sortOrder} onClick={() => onToggleSort('last_login_at')}>
            登录
          </SortButton>
          <SortButton field="username" currentField={sortField} order={sortOrder} onClick={() => onToggleSort('username')}>
            名称
          </SortButton>
        </div>

        <div className="h-8 w-px bg-border/60 hidden lg:block" />

        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground/70">结果</span>
          <span className="font-semibold text-foreground">{filteredCount}</span>
          <span className="text-muted-foreground/50">/ {totalCount}</span>
        </div>
      </div>
    </div>
  )
}