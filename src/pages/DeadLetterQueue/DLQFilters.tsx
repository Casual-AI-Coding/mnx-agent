import { Search, Filter, RefreshCw, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import {
  Card,
  CardContent,
} from '@/components/ui/Card'
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/Select'
import { Switch } from '@/components/ui/Switch'
import type { DLQFiltersProps, DLQActionsProps } from './types'

export function DLQFilters({
  searchQuery,
  onSearchChange,
  taskTypeFilter,
  onTaskTypeFilterChange,
  showResolved,
  onShowResolvedChange,
  taskTypes,
}: DLQFiltersProps) {
  return (
    <Card className="bg-card/50">
      <CardContent className="p-4">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2 flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-muted-foreground/70" />
            <Input
              placeholder="Search by task type, error message, or job ID..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="flex-1"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-muted-foreground/70" />
            <Select value={taskTypeFilter} onValueChange={onTaskTypeFilterChange}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {taskTypes.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-3">
            <Switch
              checked={showResolved}
              onCheckedChange={onShowResolvedChange}
            />
            <span className="text-sm text-muted-foreground">Show Resolved</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function DLQActions({ selectedCount, onBulkRetry, onRefresh }: DLQActionsProps) {
  return (
    <div className="flex items-center gap-3">
      {selectedCount > 0 && (
        <Button onClick={onBulkRetry}>
          <RotateCcw className="w-4 h-4 mr-2" />
          Retry Selected ({selectedCount})
        </Button>
      )}
      <Button variant="outline" onClick={onRefresh}>
        <RefreshCw className="w-4 h-4" />
      </Button>
    </div>
  )
}
