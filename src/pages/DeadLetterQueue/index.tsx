import { useState, useEffect, useCallback } from 'react'
import { AlertTriangle } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import type { DeadLetterQueueItem } from '@/types/cron'
import {
  getDeadLetterQueue,
  retryDeadLetterQueueItem,
  deleteDeadLetterQueueItem,
  getAutoRetryStats,
  startAutoRetry,
  stopAutoRetry,
  type AutoRetryStats,
} from '@/lib/api/cron'
import { toast } from 'sonner'
import { DLQTable } from './DLQTable'
import { DLQFilters, DLQActions } from './DLQFilters'
import { DLQStatsCards, DLQAutoRetryCard } from './DLQStats'
import { ErrorDetailModal, AutoRetryConfigModal, BulkRetryModal } from './DLQModals'

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

  const filteredItems = items.filter((item) => {
    if (!showResolved && item.resolvedAt) return false
    if (taskTypeFilter !== 'all' && item.taskType !== taskTypeFilter) return false
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

  const taskTypes = Array.from(new Set(items.map((item) => item.taskType)))

  const toggleSelection = (id: string) => {
    const newSelected = new Set(selectedItems)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedItems(newSelected)
  }

  const toggleAllSelection = () => {
    const unresolvedItems = filteredItems.filter((item) => !item.resolvedAt)
    if (selectedItems.size === unresolvedItems.length && unresolvedItems.length > 0) {
      setSelectedItems(new Set())
    } else {
      setSelectedItems(new Set(unresolvedItems.map((item) => item.id)))
    }
  }

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

  const unresolvedCount = items.filter((item) => !item.resolvedAt).length
  const resolvedCount = items.filter((item) => item.resolvedAt).length

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<AlertTriangle className="w-5 h-5" />}
        title="Dead Letter Queue"
        description="View and manage failed tasks that exceeded their retry limit"
        gradient="orange-amber"
        actions={
          <DLQActions
            selectedCount={selectedItems.size}
            onBulkRetry={() => setIsBulkRetryModalOpen(true)}
            onRefresh={fetchItems}
          />
        }
      />

      <DLQAutoRetryCard
        autoRetryStats={autoRetryStats}
        onToggleAutoRetry={handleToggleAutoRetry}
        onConfigure={() => setShowAutoRetryConfig(true)}
      />

      <DLQStatsCards
        unresolvedCount={unresolvedCount}
        resolvedCount={resolvedCount}
        totalCount={items.length}
      />

      <DLQFilters
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        taskTypeFilter={taskTypeFilter}
        onTaskTypeFilterChange={setTaskTypeFilter}
        showResolved={showResolved}
        onShowResolvedChange={setShowResolved}
        taskTypes={taskTypes}
      />

      <DLQTable
        items={items}
        loading={loading}
        selectedItems={selectedItems}
        expandedItems={expandedItems}
        filteredItems={filteredItems}
        onToggleSelection={toggleSelection}
        onToggleAllSelection={toggleAllSelection}
        onToggleExpansion={toggleExpansion}
        onRetry={handleRetry}
        onDelete={setItemToDelete}
        onViewDetails={setDetailItem}
      />

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
