import { memo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  AlertTriangle,
  CheckCircle2,
  Calendar,
  AlertCircle,
  Terminal,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Trash2,
  Package,
  Loader2,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import {
  Card,
  CardContent,
} from '@/components/ui/Card'
import type { DeadLetterQueueItem } from '@/types/cron'
import { status } from '@/themes/tokens'
import { cn } from '@/lib/utils'
import type { DLQTableProps, StatusBadgeProps } from './types'

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

function truncateText(text: string, maxLength: number = 100): string {
  if (!text || text.length <= maxLength) return text || ''
  return text.slice(0, maxLength) + '...'
}

const StatusBadge = memo(function StatusBadge({
  resolved,
  resolution,
}: StatusBadgeProps) {
  if (resolved) {
    const variants: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string }> = {
      retried: { variant: 'default', label: 'Retried' },
      deleted: { variant: 'destructive', label: 'Deleted' },
    }
    const config = variants[resolution || ''] || { variant: 'secondary', label: 'Resolved' }
    return (
      <Badge variant={config.variant} className="gap-1">
        <CheckCircle2 className="w-3 h-3" />
        {config.label}
      </Badge>
    )
  }

  return (
    <Badge variant="destructive" className="gap-1">
      <AlertTriangle className="w-3 h-3" />
      Failed
    </Badge>
  )
})

export function DLQTable({
  items,
  loading,
  selectedItems,
  expandedItems,
  filteredItems,
  onToggleSelection,
  onToggleAllSelection,
  onToggleExpansion,
  onRetry,
  onDelete,
  onViewDetails,
}: DLQTableProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  if (filteredItems.length === 0) {
    return (
      <Card className="border-dashed border-border">
        <CardContent className="py-16 text-center">
          <Package className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
          <h3 className="text-lg font-medium text-muted-foreground mb-2">
            {items.length === 0 ? 'Dead Letter Queue is Empty' : 'No Items Match Your Filters'}
          </h3>
          <p className="text-sm text-muted-foreground/50">
            {items.length === 0
              ? 'Failed tasks will appear here when they exceed their retry limit.'
              : 'Try adjusting your search or filter criteria.'}
          </p>
        </CardContent>
      </Card>
    )
  }

  const unresolvedItems = filteredItems.filter((i) => !i.resolvedAt)
  const allSelected = selectedItems.size === unresolvedItems.length && unresolvedItems.length > 0

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 px-4 py-2 bg-muted/30 rounded-lg">
        <input
          type="checkbox"
          checked={allSelected}
          onChange={onToggleAllSelection}
          className="w-4 h-4 rounded border-border"
        />
        <span className="text-sm text-muted-foreground">
          Select All ({unresolvedItems.length} unresolved)
        </span>
      </div>

      <AnimatePresence>
        {filteredItems.map((item) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <Card
              className={cn(
                'transition-colors',
                item.resolvedAt ? 'opacity-60' : 'hover:bg-card/800/30'
              )}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  {!item.resolvedAt && (
                    <input
                      type="checkbox"
                      checked={selectedItems.has(item.id)}
                      onChange={() => onToggleSelection(item.id)}
                      className="w-4 h-4 rounded border-border mt-1"
                    />
                  )}
                  {item.resolvedAt && <div className="w-4 mt-1" />}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <StatusBadge
                        resolved={!!item.resolvedAt}
                        resolution={item.resolution}
                      />
                      <Badge variant="outline" className="font-mono text-xs">
                        {item.taskType}
                      </Badge>
                      <span className="text-xs text-muted-foreground/70">
                        <Calendar className="w-3 h-3 inline mr-1" />
                        {formatDate(item.failedAt)}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-sm text-muted-foreground">Job:</span>
                      <code className="text-xs text-muted-foreground/70 font-mono">
                        {item.jobId || 'N/A'}
                      </code>
                    </div>

                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-muted-foreground">Retries:</span>
                      <span className="font-medium">
                        {item.retryCount} / {item.maxRetries}
                      </span>
                    </div>

                    {item.errorMessage && (
                      <div className="mt-3 p-3 bg-destructive/5 border border-destructive/20 rounded-lg">
                        <div className="flex items-center gap-2 mb-1">
                          <AlertCircle className="w-3 h-3 text-destructive/70" />
                          <span className="text-xs font-medium text-destructive/70">Error</span>
                        </div>
                        <p className="text-sm text-destructive/80 font-mono truncate">
                          {truncateText(item.errorMessage, 150)}
                        </p>
                      </div>
                    )}

                    <AnimatePresence>
                      {expandedItems.has(item.id) && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="mt-4 pt-4 border-t border-border">
                            <h4 className="text-sm font-medium text-muted-foreground mb-2">
                              <Terminal className="w-4 h-4 inline mr-1" />
                              Full Payload
                            </h4>
                            <pre className="bg-card/950 rounded-lg p-3 text-xs text-muted-foreground/70 font-mono overflow-x-auto max-h-60">
                              {JSON.stringify(item.payload, null, 2)}
                            </pre>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => onToggleExpansion(item.id)}
                        className="p-2 rounded-lg hover:bg-muted text-muted-foreground/70 hover:text-foreground transition-colors"
                        title={expandedItems.has(item.id) ? 'Collapse' : 'Expand'}
                      >
                        {expandedItems.has(item.id) ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </button>
                      <button
                        onClick={() => onViewDetails(item)}
                        className="p-2 rounded-lg hover:bg-muted text-muted-foreground/70 hover:text-foreground transition-colors"
                        title="View Details"
                      >
                        <Terminal className="w-4 h-4" />
                      </button>
                      {!item.resolvedAt && (
                        <>
                          <button
                            onClick={() => onRetry(item)}
                            className="p-2 rounded-lg hover:bg-muted text-muted-foreground/70 hover:text-primary transition-colors"
                            title="Retry"
                          >
                            <RotateCcw className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => onDelete(item)}
                            className="p-2 rounded-lg hover:bg-muted text-muted-foreground/70 hover:text-destructive transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
