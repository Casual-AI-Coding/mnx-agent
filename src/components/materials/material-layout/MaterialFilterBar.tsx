import { motion } from 'framer-motion'
import { Search, X, SlidersHorizontal, ArrowUpDown } from 'lucide-react'
import { Input } from '@/components/ui/Input'
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/Select'
import { cn } from '@/lib/utils'
import { MATERIAL_TYPE_LABELS } from '@/types/material'
import type { MaterialType } from '@/types/material'
import type { SortField } from '@/stores/materials'
import { SortButton } from './SortButton'

interface MaterialFilterBarProps {
  searchQuery: string
  onSearchChange: (value: string) => void
  typeFilter: string
  onTypeFilterChange: (value: string) => void
  sortField: SortField
  sortOrder: 'asc' | 'desc'
  onToggleSort: (field: SortField) => void
  filteredCount: number
  totalCount: number
}

export function MaterialFilterBar({
  searchQuery,
  onSearchChange,
  typeFilter,
  onTypeFilterChange,
  sortField,
  sortOrder,
  onToggleSort,
  filteredCount,
  totalCount,
}: MaterialFilterBarProps) {
  return (
    <div className="p-5 space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-[280px] group">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-muted-foreground/60 group-focus-within:text-primary transition-colors" />
          </div>
          <Input
            placeholder="搜索素材..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
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

        <Select value={typeFilter} onValueChange={(v) => onTypeFilterChange(v as MaterialType | 'all')}>
          <SelectTrigger className="w-[110px] h-10 border-border/50 bg-background/50 hover:bg-muted/50 transition-colors">
            <div className="flex items-center gap-1.5">
              <span className="text-muted-foreground/70 text-sm">类型</span>
              <span className={cn(
                'text-sm font-medium',
                typeFilter !== 'all' ? 'text-foreground' : 'text-muted-foreground/60'
              )}>
                {typeFilter === 'all' ? '全部' : MATERIAL_TYPE_LABELS[typeFilter as MaterialType]}
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
            <SelectItem value="artist">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                艺术家
              </div>
            </SelectItem>
          </SelectContent>
        </Select>

        <div className="flex-1" />

        <div className="h-8 w-px bg-border/60 hidden md:block" />

        <ArrowUpDown className="w-4 h-4 text-muted-foreground/60" />
        <div className="flex items-center gap-1">
          <SortButton field="updated_at" currentField={sortField} order={sortOrder} onClick={() => onToggleSort('updated_at')}>
            更新
          </SortButton>
          <SortButton field="created_at" currentField={sortField} order={sortOrder} onClick={() => onToggleSort('created_at')}>
            创建
          </SortButton>
          <SortButton field="name" currentField={sortField} order={sortOrder} onClick={() => onToggleSort('name')}>
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
