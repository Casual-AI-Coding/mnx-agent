import type { DeadLetterQueueItem } from '@/types/cron'
import type { AutoRetryStats } from '@/lib/api/cron'

export interface ErrorDetailModalProps {
  isOpen: boolean
  onClose: () => void
  item: DeadLetterQueueItem | null
}

export interface AutoRetryConfigModalProps {
  isOpen: boolean
  onClose: () => void
  stats: AutoRetryStats | null
  onSave: () => void
}

export interface BulkRetryModalProps {
  isOpen: boolean
  onClose: () => void
  selectedItems: DeadLetterQueueItem[]
  onConfirm: () => void
  isProcessing: boolean
}

export interface StatusBadgeProps {
  resolved: boolean
  resolution: string | null
}

export interface DLQTableProps {
  items: DeadLetterQueueItem[]
  loading: boolean
  selectedItems: Set<string>
  expandedItems: Set<string>
  filteredItems: DeadLetterQueueItem[]
  onToggleSelection: (id: string) => void
  onToggleAllSelection: () => void
  onToggleExpansion: (id: string) => void
  onRetry: (item: DeadLetterQueueItem) => void
  onDelete: (item: DeadLetterQueueItem) => void
  onViewDetails: (item: DeadLetterQueueItem) => void
}

export interface DLQFiltersProps {
  searchQuery: string
  onSearchChange: (value: string) => void
  taskTypeFilter: string
  onTaskTypeFilterChange: (value: string) => void
  showResolved: boolean
  onShowResolvedChange: (value: boolean) => void
  taskTypes: string[]
}

export interface DLQStatsCardsProps {
  unresolvedCount: number
  resolvedCount: number
  totalCount: number
}

export interface DLQAutoRetryCardProps {
  autoRetryStats: AutoRetryStats | null
  onToggleAutoRetry: (enabled: boolean) => void
  onConfigure: () => void
}

export interface DLQActionsProps {
  selectedCount: number
  onBulkRetry: () => void
  onRefresh: () => void
}
