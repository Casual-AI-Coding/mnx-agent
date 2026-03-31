import { useMemo, useCallback } from 'react'

interface UsePaginationOptions {
  totalItems: number
  itemsPerPage: number
  currentPage: number
  onPageChange: (page: number) => void
}

interface UsePaginationResult<T> {
  currentPage: number
  totalPages: number
  paginatedItems: T[]
  goToPage: (page: number) => void
  nextPage: () => void
  prevPage: () => void
  hasNextPage: boolean
  hasPrevPage: boolean
}

export function usePagination<T>(
  items: T[],
  options: UsePaginationOptions
): UsePaginationResult<T> {
  const { totalItems, itemsPerPage, currentPage, onPageChange } = options

  const totalPages = useMemo(() => {
    return Math.ceil(totalItems / itemsPerPage)
  }, [totalItems, itemsPerPage])

  const paginatedItems = useMemo(() => {
    const startIdx = (currentPage - 1) * itemsPerPage
    return items.slice(startIdx, startIdx + itemsPerPage)
  }, [items, currentPage, itemsPerPage])

  const goToPage = useCallback(
    (page: number) => {
      if (page >= 1 && page <= totalPages) {
        onPageChange(page)
      }
    },
    [totalPages, onPageChange]
  )

  const nextPage = useCallback(() => {
    if (currentPage < totalPages) {
      onPageChange(currentPage + 1)
    }
  }, [currentPage, totalPages, onPageChange])

  const prevPage = useCallback(() => {
    if (currentPage > 1) {
      onPageChange(currentPage - 1)
    }
  }, [currentPage, onPageChange])

  const hasNextPage = currentPage < totalPages
  const hasPrevPage = currentPage > 1

  return {
    currentPage,
    totalPages,
    paginatedItems,
    goToPage,
    nextPage,
    prevPage,
    hasNextPage,
    hasPrevPage,
  }
}
