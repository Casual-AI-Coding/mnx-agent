import { useState, useMemo, useCallback } from 'react'
import type { MediaRecord } from '../types'
import { filterRecordsBySearch } from '../utils'

export function useMediaFilters(records: MediaRecord[]) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [pageInput, setPageInput] = useState('')

  const filteredRecords = useMemo(() => {
    return filterRecordsBySearch(records, searchQuery)
  }, [records, searchQuery])

  const handleSelect = useCallback((id: string) => {
    const newSelected = new Set(selectedIds)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedIds(newSelected)
  }, [selectedIds])

  const handleSelectAll = useCallback((recordsToSelect: MediaRecord[]) => {
    if (selectedIds.size === recordsToSelect.length && recordsToSelect.length > 0) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(recordsToSelect.map(m => m.id)))
    }
  }, [selectedIds])

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set())
  }, [])

  const isAllSelected = useCallback((recordsToCheck: MediaRecord[]) => {
    return recordsToCheck.length > 0 && selectedIds.size === recordsToCheck.length
  }, [selectedIds])

  const isPartiallySelected = useCallback((recordsToCheck: MediaRecord[]) => {
    return selectedIds.size > 0 && selectedIds.size < recordsToCheck.length
  }, [selectedIds])

  return {
    searchQuery,
    setSearchQuery,
    selectedIds,
    setSelectedIds,
    pageInput,
    setPageInput,
    filteredRecords,
    handleSelect,
    handleSelectAll,
    clearSelection,
    isAllSelected,
    isPartiallySelected,
  }
}
