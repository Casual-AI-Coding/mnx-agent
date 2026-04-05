import { useState, useEffect, memo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  AlertTriangle,
  RefreshCw,
  Trash2,
  RotateCcw,
  Filter,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Loader2,
  ChevronDown,
  ChevronUp,
  Search,
  X,
  Terminal,
  Package,
  Settings,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/Select'
import { Switch } from '@/components/ui/Switch'
import {
  Dialog,
  DialogFooter,
} from '@/components/ui/Dialog'
import {
  Label,
} from '@/components/ui/Label'
import {
  getDeadLetterQueue,
  retryDeadLetterQueueItem,
  deleteDeadLetterQueueItem,
  getAutoRetryStats,
  updateAutoRetryConfig,
  startAutoRetry,
  stopAutoRetry,
  type AutoRetryStats,
} from '@/lib/api/cron'
import type { DeadLetterQueueItem } from '@/types/cron'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { status } from '@/themes/tokens'
import { cn } from '@/lib/utils'

// ============================================
// Helper Functions
// ============================================

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

// ============================================
// Status Badge Component
// ============================================

const StatusBadge = memo(function StatusBadge({
  resolved,
  resolution,
}: {
  resolved: boolean
  resolution: string | null
}) {
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

// ============================================
// Error Detail Modal
// ============================================

interface ErrorDetailModalProps {
  isOpen: boolean
  onClose: () => void
  item: DeadLetterQueueItem | null
}

function ErrorDetailModal({ isOpen, onClose, item }: ErrorDetailModalProps) {
  if (!isOpen || !item) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-2xl bg-card border border-border rounded-xl shadow-2xl"
      >
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div>
            <h2 className="text-xl font-semibold text-foreground">Error Details</h2>
            <p className="text-sm text-muted-foreground/70">Task ID: {item.id}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-muted text-muted-foreground/70 hover:text-foreground transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Task Type</label>
              <p className="text-foreground font-medium">{item.taskType}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Job ID</label>
              <p className="text-foreground font-mono text-sm">{item.jobId || '-'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Failed At</label>
              <p className="text-foreground">{formatDate(item.failedAt)}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Retry Count</label>
              <p className="text-foreground">{item.retryCount} / {item.maxRetries}</p>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-muted-foreground mb-2 block">Error Message</label>
            <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="w-4 h-4 text-destructive" />
                <span className="text-sm font-medium text-destructive">Error</span>
              </div>
              <p className="text-sm text-destructive/80 whitespace-pre-wrap font-mono">
                {item.errorMessage || 'No error message available'}
              </p>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-muted-foreground mb-2 block">Payload</label>
            <pre className="bg-card/950 rounded-lg p-4 text-xs text-muted-foreground/70 font-mono overflow-x-auto max-h-60">
              {JSON.stringify(item.payload, null, 2)}
            </pre>
          </div>
        </div>

        <div className="flex justify-end gap-3 p-6 border-t border-border">
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
        </div>
      </motion.div>
    </div>
  )
}

// ============================================
// Auto-Retry Configuration Modal
// ============================================

interface AutoRetryConfigModalProps {
  isOpen: boolean
  onClose: () => void
  stats: AutoRetryStats | null
  onSave: () => void
}

function AutoRetryConfigModal({ isOpen, onClose, stats, onSave }: AutoRetryConfigModalProps) {
  const [config, setConfig] = useState({
    initialDelayMs: 60,
    maxDelayMs: 1440,
    maxAttempts: 3,
    backoffMultiplier: 2,
  })
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (stats?.config) {
      setConfig({
        initialDelayMs: Math.round(stats.config.initialDelayMs / 60000),
        maxDelayMs: Math.round(stats.config.maxDelayMs / 60000),
        maxAttempts: stats.config.maxAttempts,
        backoffMultiplier: stats.config.backoffMultiplier,
      })
    }
  }, [stats])

  const handleSave = async () => {
    setIsSaving(true)
    const response = await updateAutoRetryConfig({
      initialDelayMs: config.initialDelayMs * 60000,
      maxDelayMs: config.maxDelayMs * 60000,
      maxAttempts: config.maxAttempts,
      backoffMultiplier: config.backoffMultiplier,
    })
    setIsSaving(false)

    if (response.success) {
      toast.success('Configuration saved successfully')
      onSave()
      onClose()
    } else {
      toast.error(response.error || 'Failed to save configuration')
    }
  }

  return (
    <Dialog open={isOpen} onClose={onClose} title="Auto-Retry Configuration">
      <div className="grid gap-6 py-4">
        <div className="grid gap-2">
          <Label htmlFor="initialDelay">Initial Delay (minutes)</Label>
          <Input
            id="initialDelay"
            type="number"
            min={1}
            max={1440}
            value={config.initialDelayMs}
            onChange={(e) => setConfig({ ...config, initialDelayMs: parseInt(e.target.value) || 1 })}
          />
          <p className="text-xs text-muted-foreground">
            Time before the first retry attempt
          </p>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="maxDelay">Max Delay (minutes)</Label>
          <Input
            id="maxDelay"
            type="number"
            min={1}
            max={10080}
            value={config.maxDelayMs}
            onChange={(e) => setConfig({ ...config, maxDelayMs: parseInt(e.target.value) || 1 })}
          />
          <p className="text-xs text-muted-foreground">
            Maximum time between retry attempts
          </p>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="maxAttempts">Max Attempts</Label>
          <Input
            id="maxAttempts"
            type="number"
            min={1}
            max={10}
            value={config.maxAttempts}
            onChange={(e) => setConfig({ ...config, maxAttempts: parseInt(e.target.value) || 1 })}
          />
          <p className="text-xs text-muted-foreground">
            Maximum number of retry attempts per task
          </p>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="backoffMultiplier">Backoff Multiplier</Label>
          <Input
            id="backoffMultiplier"
            type="number"
            min={1}
            max={10}
            step={0.5}
            value={config.backoffMultiplier}
            onChange={(e) => setConfig({ ...config, backoffMultiplier: parseFloat(e.target.value) || 1 })}
          />
          <p className="text-xs text-muted-foreground">
            Multiplier for exponential backoff (e.g., 2 = double the delay each time)
          </p>
        </div>
      </div>

      <DialogFooter>
        <Button variant="ghost" onClick={onClose} disabled={isSaving}>
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            'Save Configuration'
          )}
        </Button>
      </DialogFooter>
    </Dialog>
  )
}

interface BulkRetryModalProps {
  isOpen: boolean
  onClose: () => void
  selectedItems: DeadLetterQueueItem[]
  onConfirm: () => void
  isProcessing: boolean
}

function BulkRetryModal({ isOpen, onClose, selectedItems, onConfirm, isProcessing }: BulkRetryModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-md bg-card border border-border rounded-xl shadow-2xl"
      >
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div>
            <h2 className="text-xl font-semibold text-foreground">Bulk Retry</h2>
            <p className="text-sm text-muted-foreground/70">Retry multiple failed tasks</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-muted text-muted-foreground/70 hover:text-foreground transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <p className="text-foreground">
            You are about to retry <strong>{selectedItems.length}</strong> failed task(s).
          </p>
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-yellow-400" />
              <span className="text-sm font-medium text-yellow-400">Warning</span>
            </div>
            <p className="text-sm text-yellow-400/80 mt-1">
              This action will re-queue all selected tasks. Make sure you have reviewed the errors.
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-3 p-6 border-t border-border">
          <Button variant="ghost" onClick={onClose} disabled={isProcessing}>
            Cancel
          </Button>
          <Button onClick={onConfirm} disabled={isProcessing}>
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <RotateCcw className="w-4 h-4 mr-2" />
                Retry {selectedItems.length} Items
              </>
            )}
          </Button>
        </div>
      </motion.div>
    </div>
  )
}

// ============================================
// Main Dead Letter Queue Page
// ============================================

export default function DeadLetterQueue() {
  const [items, setItems] = useState<DeadLetterQueueItem[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())
  const [searchQuery, setSearchQuery] = useState('')
  const [taskTypeFilter, setTaskTypeFilter] = useState<string>('all')
  const [showResolved, setShowResolved] = useState(false)
  const [detailItem, setDetailItem] = useState<DeadLetterQueueItem | null>(null)
  const [isBulkRetryModalOpen, setIsBulkRetryModalOpen] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [autoRetryStats, setAutoRetryStats] = useState<AutoRetryStats | null>(null)
  const [showAutoRetryConfig, setShowAutoRetryConfig] = useState(false)
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set())
  const [itemToDelete, setItemToDelete] = useState<DeadLetterQueueItem | null>(null)

  // Open delete confirmation dialog
  const openDeleteDialog = (item: DeadLetterQueueItem) => {
    setItemToDelete(item)
  }

  // Fetch DLQ items and auto-retry stats
  const fetchItems = useCallback(async () => {
    setLoading(true)
    const [dlqResponse, statsResponse] = await Promise.all([
      getDeadLetterQueue(100),
      getAutoRetryStats(),
    ])
    if (dlqResponse.success && dlqResponse.data) {
      setItems(dlqResponse.data.items)
    } else {
      toast.error(dlqResponse.error || 'Failed to load dead letter queue')
    }
    if (statsResponse.success && statsResponse.data) {
      setAutoRetryStats(statsResponse.data)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchItems()
  }, [fetchItems])

  // Filter items
  const filteredItems = items.filter((item) => {
    // Filter by resolved status
    if (!showResolved && item.resolvedAt) return false

    // Filter by task type
    if (taskTypeFilter !== 'all' && item.taskType !== taskTypeFilter) return false

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      return (
        item.taskType.toLowerCase().includes(query) ||
        (item.errorMessage?.toLowerCase().includes(query) ?? false) ||
        (item.jobId?.toLowerCase().includes(query) ?? false)
      )
    }
    return true
  })

  // Get unique task types for filter
  const taskTypes = Array.from(new Set(items.map((item) => item.taskType)))

  // Toggle item selection
  const toggleSelection = (id: string) => {
    const newSelected = new Set(selectedItems)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedItems(newSelected)
  }

  // Toggle all selection
  const toggleAllSelection = () => {
    const unresolvedItems = filteredItems.filter((item) => !item.resolvedAt)
    if (selectedItems.size === unresolvedItems.length && unresolvedItems.length > 0) {
      setSelectedItems(new Set())
    } else {
      setSelectedItems(new Set(unresolvedItems.map((item) => item.id)))
    }
  }

  // Toggle item expansion
  const toggleExpansion = (id: string) => {
    const newExpanded = new Set(expandedItems)
    if (newExpanded.has(id)) {
      newExpanded.delete(id)
    } else {
      newExpanded.add(id)
    }
    setExpandedItems(newExpanded)
  }

  const handleToggleAutoRetry = async (enabled: boolean) => {
    const response = enabled ? await startAutoRetry() : await stopAutoRetry()
    if (response.success) {
      toast.success(enabled ? 'Auto-retry enabled' : 'Auto-retry disabled')
      setAutoRetryStats((prev) => prev ? { ...prev, enabled } : null)
    } else {
      toast.error(response.error || `Failed to ${enabled ? 'enable' : 'disable'} auto-retry`)
    }
  }

  // Retry single item
  const handleRetry = async (item: DeadLetterQueueItem) => {
    if (item.resolvedAt) {
      toast.info('This item has already been resolved')
      return
    }

    const response = await retryDeadLetterQueueItem(item.id)
    if (response.success) {
      toast.success('Task retried successfully')
      fetchItems()
    } else {
      toast.error(response.error || 'Failed to retry task')
    }
  }

  // Delete single item
  const handleDelete = async () => {
    if (!itemToDelete) return

    const response = await deleteDeadLetterQueueItem(itemToDelete.id)
    if (response.success) {
      toast.success('Item deleted successfully')
      fetchItems()
      setSelectedItems((prev) => {
        const newSet = new Set(prev)
        newSet.delete(itemToDelete.id)
        return newSet
      })
    } else {
      toast.error(response.error || 'Failed to delete item')
    }
    setItemToDelete(null)
  }

  // Bulk retry
  const handleBulkRetry = async () => {
    setIsProcessing(true)
    const selectedItemsList = items.filter((item) => selectedItems.has(item.id))
    let successCount = 0
    let errorCount = 0

    for (const item of selectedItemsList) {
      const response = await retryDeadLetterQueueItem(item.id)
      if (response.success) {
        successCount++
      } else {
        errorCount++
      }
    }

    setIsProcessing(false)
    setIsBulkRetryModalOpen(false)
    setSelectedItems(new Set())

    if (successCount > 0) {
      toast.success(`Successfully retried ${successCount} item(s)`)
    }
    if (errorCount > 0) {
      toast.error(`Failed to retry ${errorCount} item(s)`)
    }

    fetchItems()
  }

  // Stats
  const unresolvedCount = items.filter((item) => !item.resolvedAt).length
  const resolvedCount = items.filter((item) => item.resolvedAt).length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dead Letter Queue</h1>
          <p className="text-muted-foreground/70 mt-2">
            View and manage failed tasks that exceeded their retry limit
          </p>
        </div>
        <div className="flex items-center gap-3">
          {selectedItems.size > 0 && (
            <Button onClick={() => setIsBulkRetryModalOpen(true)}>
              <RotateCcw className="w-4 h-4 mr-2" />
              Retry Selected ({selectedItems.size})
            </Button>
          )}
          <Button variant="outline" onClick={fetchItems}>
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Auto-Retry Config Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <RotateCcw className="w-5 h-5" />
              Auto-Retry
            </CardTitle>
            <Switch
              checked={autoRetryStats?.enabled ?? false}
              onCheckedChange={handleToggleAutoRetry}
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex gap-6 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <span className="font-medium text-foreground">{autoRetryStats?.pendingRetryCount ?? 0}</span>
              <span>pending retries</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-medium text-foreground">{autoRetryStats?.dlqItemCount ?? 0}</span>
              <span>DLQ items</span>
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <Button variant="outline" size="sm" onClick={() => setShowAutoRetryConfig(true)}>
            <Settings className="w-4 h-4 mr-1" />
            Configure
          </Button>
        </CardFooter>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="bg-card/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-destructive/10">
                <AlertTriangle className="w-5 h-5 text-destructive" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{unresolvedCount}</p>
                <p className="text-xs text-muted-foreground/70">Unresolved</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <CheckCircle2 className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{resolvedCount}</p>
                <p className="text-xs text-muted-foreground/70">Resolved</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary-500/10">
                <Package className="w-5 h-5 text-primary-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{items.length}</p>
                <p className="text-xs text-muted-foreground/70">Total Items</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="bg-card/50">
        <CardContent className="p-4">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2 flex-1 min-w-[200px]">
              <Search className="w-4 h-4 text-muted-foreground/70" />
              <Input
                placeholder="Search by task type, error message, or job ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-muted-foreground/70" />
              <Select value={taskTypeFilter} onValueChange={setTaskTypeFilter}>
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
                onCheckedChange={setShowResolved}
              />
              <span className="text-sm text-muted-foreground">Show Resolved</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Items List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : filteredItems.length === 0 ? (
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
      ) : (
        <div className="space-y-3">
          {/* Select All Header */}
          <div className="flex items-center gap-3 px-4 py-2 bg-muted/30 rounded-lg">
            <input
              type="checkbox"
              checked={
                selectedItems.size === filteredItems.filter((i) => !i.resolvedAt).length &&
                filteredItems.filter((i) => !i.resolvedAt).length > 0
              }
              onChange={toggleAllSelection}
              className="w-4 h-4 rounded border-border"
            />
            <span className="text-sm text-muted-foreground">
              Select All ({filteredItems.filter((i) => !i.resolvedAt).length} unresolved)
            </span>
          </div>

          {/* Items */}
          <AnimatePresence>
            {filteredItems.map((item) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <Card
                  className={`transition-colors ${
                    item.resolvedAt ? 'opacity-60' : 'hover:bg-card/800/30'
                  }`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      {/* Checkbox */}
                      {!item.resolvedAt && (
                        <input
                          type="checkbox"
                          checked={selectedItems.has(item.id)}
                          onChange={() => toggleSelection(item.id)}
                          className="w-4 h-4 rounded border-border mt-1"
                        />
                      )}
                      {item.resolvedAt && <div className="w-4 mt-1" />}

                      {/* Content */}
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

                        {/* Error Message Preview */}
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

                        {/* Expanded Content */}
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

                      {/* Actions */}
                      <div className="flex flex-col items-end gap-2">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => toggleExpansion(item.id)}
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
                            onClick={() => setDetailItem(item)}
                            className="p-2 rounded-lg hover:bg-muted text-muted-foreground/70 hover:text-foreground transition-colors"
                            title="View Details"
                          >
                            <Terminal className="w-4 h-4" />
                          </button>
                          {!item.resolvedAt && (
                            <>
                              <button
                                onClick={() => handleRetry(item)}
                                className="p-2 rounded-lg hover:bg-muted text-muted-foreground/70 hover:text-primary transition-colors"
                                title="Retry"
                              >
                                <RotateCcw className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => openDeleteDialog(item)}
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
      )}

      <AutoRetryConfigModal
        isOpen={showAutoRetryConfig}
        onClose={() => setShowAutoRetryConfig(false)}
        stats={autoRetryStats}
        onSave={() => fetchItems()}
      />

      <ErrorDetailModal
        isOpen={!!detailItem}
        onClose={() => setDetailItem(null)}
        item={detailItem}
      />

      <BulkRetryModal
        isOpen={isBulkRetryModalOpen}
        onClose={() => setIsBulkRetryModalOpen(false)}
        selectedItems={items.filter((item) => selectedItems.has(item.id))}
        onConfirm={handleBulkRetry}
        isProcessing={isProcessing}
      />

      <ConfirmDialog
        open={!!itemToDelete}
        onClose={() => setItemToDelete(null)}
        onConfirm={handleDelete}
        title="Delete Item"
        description="Are you sure you want to permanently delete this item from the dead letter queue? This action cannot be undone."
        confirmText="Delete"
        variant="destructive"
        requireInput="DELETE"
      />
    </div>
  )
}
