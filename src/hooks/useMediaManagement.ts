import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import type { MediaType, MediaRecord, PaginationInfo } from '@/types/media'
import {
  listMedia,
  deleteMedia as deleteMediaApi,
  getMediaDownloadUrl,
  batchDeleteMedia,
  batchDownloadMedia,
} from '@/lib/api/media'
import { toastSuccess } from '@/lib/toast'
import { useSettingsStore } from '@/settings/store'

export interface DeleteDialogState {
  isOpen: boolean
  record: MediaRecord | null
}

export interface UseMediaManagementReturn {
  // State
  records: MediaRecord[]
  pagination: PaginationInfo
  isLoading: boolean
  isInitialLoad: boolean
  error: string | null
  setError: (error: string | null) => void
  searchQuery: string
  setSearchQuery: (query: string) => void
  activeTab: string
  setActiveTab: (tab: string) => void
  deleteDialog: DeleteDialogState
  setDeleteDialog: (dialog: DeleteDialogState) => void
  lightboxOpen: boolean
  setLightboxOpen: (open: boolean) => void
  lightboxIndex: number
  setLightboxIndex: (index: number) => void
  selectedIds: Set<string>
  setSelectedIds: (ids: Set<string>) => void
  signedUrls: Record<string, string>
  setSignedUrls: (urls: Record<string, string>) => void
  batchDeleteDialogOpen: boolean
  setBatchDeleteDialogOpen: (open: boolean) => void
  isBatchDeleting: boolean
  isBatchDownloading: boolean
  viewMode: 'table' | 'timeline' | 'card'
  setViewMode: (mode: 'table' | 'timeline' | 'card') => void
  pageInput: string
  setPageInput: (input: string) => void

  // Timeline state
  timelineRecords: MediaRecord[]
  setTimelineRecords: (records: MediaRecord[]) => void
  timelinePage: number
  setTimelinePage: (page: number) => void
  hasMore: boolean
  setHasMore: (hasMore: boolean) => void
  isLoadingMore: boolean
  setIsLoadingMore: (loading: boolean) => void
  loadMoreRef: React.RefObject<HTMLDivElement>

  // Derived state
  filteredRecords: MediaRecord[]
  imageRecords: MediaRecord[]
  lightboxSlides: { src: string }[]
  pageNumbers: (number | string)[]

  // Callbacks
  handleSelectAll: () => void
  handleSelect: (id: string) => void
  handleBatchDelete: () => Promise<void>
  handleBatchDownload: () => Promise<void>
  fetchMedia: (isInitial?: boolean) => Promise<void>
  fetchTimelineMedia: (page: number, reset?: boolean) => Promise<void>
  handleDelete: () => Promise<void>
  handleDownload: (record: MediaRecord) => void
  handlePreview: (record: MediaRecord) => void
  handlePageChange: (page: number) => void
}

export function useMediaManagement(): UseMediaManagementReturn {
  const { settings } = useSettingsStore()
  const apiKey = settings.api.minimaxKey

  // Core state
  const [records, setRecords] = useState<MediaRecord[]>([])
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  })
  const [isLoading, setIsLoading] = useState(false)
  const [isInitialLoad, setIsInitialLoad] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState('all')
  const [deleteDialog, setDeleteDialog] = useState<DeleteDialogState>({
    isOpen: false,
    record: null,
  })
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [lightboxIndex, setLightboxIndex] = useState(0)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({})
  const [batchDeleteDialogOpen, setBatchDeleteDialogOpen] = useState(false)
  const [isBatchDeleting, setIsBatchDeleting] = useState(false)
  const [isBatchDownloading, setIsBatchDownloading] = useState(false)
  const [viewMode, setViewMode] = useState<'table' | 'timeline' | 'card'>('table')
  const [pageInput, setPageInput] = useState('')

  // Timeline state
  const [timelineRecords, setTimelineRecords] = useState<MediaRecord[]>([])
  const [timelinePage, setTimelinePage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const loadMoreRef = useRef<HTMLDivElement>(null)

  // Derived: filtered records based on search query
  const filteredRecords = useMemo(() => {
    if (!searchQuery.trim()) return records
    return records.filter((record) =>
      (record.original_name || record.filename).toLowerCase().includes(searchQuery.toLowerCase())
    )
  }, [records, searchQuery])

  // Derived: image records for lightbox
  const imageRecords = useMemo(() => {
    const source = viewMode === 'timeline' ? timelineRecords : filteredRecords
    return source.filter(r => r.type === 'image')
  }, [viewMode, timelineRecords, filteredRecords])

  // Derived: lightbox slides
  const lightboxSlides = useMemo(() =>
    imageRecords.map(r => ({
      src: signedUrls[r.id] || `/api/media/${r.id}/download`
    })),
    [imageRecords, signedUrls]
  )

  // Derived: page numbers for pagination
  const pageNumbers = useMemo(() => {
    const pages: (number | string)[] = []
    const maxVisible = 5
    const currentPage = pagination.page
    const totalPages = pagination.totalPages

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i)
      }
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) {
          pages.push(i)
        }
        pages.push('...')
        pages.push(totalPages)
      } else if (currentPage >= totalPages - 2) {
        pages.push(1)
        pages.push('...')
        for (let i = totalPages - 3; i <= totalPages; i++) {
          pages.push(i)
        }
      } else {
        pages.push(1)
        pages.push('...')
        for (let i = currentPage - 1; i <= currentPage + 1; i++) {
          pages.push(i)
        }
        pages.push('...')
        pages.push(totalPages)
      }
    }

    return pages
  }, [pagination.page, pagination.totalPages])

  // Clear selection when tab or page changes
  useEffect(() => {
    setSelectedIds(new Set())
  }, [activeTab, pagination.page])

  // Fetch media records
  const fetchMedia = useCallback(async (isInitial = false) => {
    if (!apiKey) return

    setIsLoading(true)
    if (isInitial) setIsInitialLoad(true)
    setError(null)

    try {
      const type = activeTab === 'all' ? undefined : (activeTab as MediaType)
      const response = await listMedia({
        type,
        page: pagination.page,
        limit: pagination.limit,
      })

      if (response.success) {
        setRecords(response.data.records)
        setPagination(response.data.pagination)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取媒体列表失败')
    } finally {
      setIsLoading(false)
      setIsInitialLoad(false)
    }
  }, [apiKey, activeTab, pagination.page, pagination.limit])

  // Fetch timeline media (infinite scroll)
  const fetchTimelineMedia = useCallback(async (page: number, reset = false) => {
    if (!apiKey || isLoadingMore) return

    setIsLoadingMore(true)
    try {
      const type = activeTab === 'all' ? undefined : (activeTab as MediaType)
      const response = await listMedia({
        type,
        page,
        limit: 20,
      })

      if (response.success) {
        const newRecords = response.data.records
        if (reset) {
          setTimelineRecords(newRecords)
        } else {
          setTimelineRecords(prev => [...prev, ...newRecords])
        }
        setHasMore(page < response.data.pagination.totalPages)
        setTimelinePage(page)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取媒体列表失败')
    } finally {
      setIsLoadingMore(false)
    }
  }, [apiKey, activeTab, isLoadingMore])

  // Handle single delete
  const handleDelete = useCallback(async () => {
    if (!deleteDialog.record) return

    try {
      await deleteMediaApi(deleteDialog.record.id)
      setRecords((prev) => prev.filter((r) => r.id !== deleteDialog.record!.id))
      setDeleteDialog({ isOpen: false, record: null })
      toastSuccess('删除成功')
    } catch (err) {
      setError(err instanceof Error ? err.message : '删除失败')
    }
  }, [deleteDialog.record])

  // Handle download
  const handleDownload = useCallback((record: MediaRecord) => {
    const url = signedUrls[record.id] || `/api/media/${record.id}/download`
    window.open(url, '_blank')
  }, [signedUrls])

  // Handle preview (for images)
  const handlePreview = useCallback((record: MediaRecord) => {
    if (record.type === 'image') {
      const index = imageRecords.findIndex(r => r.id === record.id)
      setLightboxIndex(index >= 0 ? index : 0)
      setLightboxOpen(true)
    }
  }, [imageRecords])

  // Handle page change
  const handlePageChange = useCallback((page: number) => {
    if (page >= 1 && page <= pagination.totalPages) {
      setPagination((prev) => ({ ...prev, page }))
    }
  }, [pagination.totalPages])

  // Handle select all
  const handleSelectAll = useCallback(() => {
    if (selectedIds.size === filteredRecords.length && filteredRecords.length > 0) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filteredRecords.map(m => m.id)))
    }
  }, [selectedIds, filteredRecords])

  // Handle single select
  const handleSelect = useCallback((id: string) => {
    const newSelected = new Set(selectedIds)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedIds(newSelected)
  }, [selectedIds])

  // Handle batch delete
  const handleBatchDelete = useCallback(async () => {
    if (selectedIds.size === 0) return

    setIsBatchDeleting(true)
    try {
      await batchDeleteMedia(Array.from(selectedIds))
      setRecords((prev) => prev.filter((r) => !selectedIds.has(r.id)))
      setSelectedIds(new Set())
      setBatchDeleteDialogOpen(false)
      toastSuccess('批量删除成功', `已删除 ${selectedIds.size} 个文件`)
    } catch (err) {
      setError(err instanceof Error ? err.message : '批量删除失败')
    } finally {
      setIsBatchDeleting(false)
    }
  }, [selectedIds])

  // Handle batch download
  const handleBatchDownload = useCallback(async () => {
    if (selectedIds.size === 0) return

    setIsBatchDownloading(true)
    try {
      const blob = await batchDownloadMedia(Array.from(selectedIds))
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `media_batch_${Date.now()}.zip`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    } catch (err) {
      setError(err instanceof Error ? err.message : '批量下载失败')
    } finally {
      setIsBatchDownloading(false)
    }
  }, [selectedIds])

  // Initial load
  useEffect(() => {
    if (isInitialLoad) {
      fetchMedia(true)
    }
  }, [fetchMedia, isInitialLoad])

  // Reset pagination when tab changes
  useEffect(() => {
    if (!isInitialLoad) {
      setPagination((prev) => ({ ...prev, page: 1 }))
    }
  }, [activeTab, isInitialLoad])

  // Fetch data when tab or page changes
  useEffect(() => {
    if (!isInitialLoad) {
      fetchMedia(false)
    }
  }, [fetchMedia, isInitialLoad, activeTab, pagination.page])

  // Load timeline data when viewMode changes to timeline
  useEffect(() => {
    if (viewMode === 'timeline' && timelineRecords.length === 0) {
      fetchTimelineMedia(1, true)
    }
  }, [viewMode, timelineRecords.length, fetchTimelineMedia])

  // Reset timeline when tab or viewMode changes
  useEffect(() => {
    if (viewMode === 'timeline') {
      setTimelineRecords([])
      setTimelinePage(1)
      setHasMore(true)
    }
  }, [activeTab, viewMode])

  // Intersection observer for infinite scroll in timeline mode
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoadingMore && viewMode === 'timeline') {
          fetchTimelineMedia(timelinePage + 1)
        }
      },
      { threshold: 0.1 }
    )

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current)
    }

    return () => observer.disconnect()
  }, [hasMore, isLoadingMore, timelinePage, viewMode, fetchTimelineMedia])

  // Fetch signed URLs for images in records
  useEffect(() => {
    if (records.length > 0) {
      const imageRecords = records.filter(r => r.type === 'image' && !signedUrls[r.id])
      if (imageRecords.length === 0) return

      Promise.all(
        imageRecords.map(async (r) => {
          try {
            const url = await getMediaDownloadUrl(r.id)
            return { id: r.id, url }
          } catch {
            return { id: r.id, url: '' }
          }
        })
      ).then(results => {
        setSignedUrls(prev => {
          const urlMap = { ...prev }
          results.forEach(r => { if (r.url) urlMap[r.id] = r.url })
          return urlMap
        })
      })
    }
  }, [records, signedUrls])

  // Fetch signed URLs for images in timeline records
  useEffect(() => {
    if (timelineRecords.length > 0) {
      const imageRecords = timelineRecords.filter(r => r.type === 'image' && !signedUrls[r.id])
      if (imageRecords.length === 0) return

      Promise.all(
        imageRecords.map(async (r) => {
          try {
            const url = await getMediaDownloadUrl(r.id)
            return { id: r.id, url }
          } catch {
            return { id: r.id, url: '' }
          }
        })
      ).then(results => {
        setSignedUrls(prev => {
          const urlMap = { ...prev }
          results.forEach(r => { if (r.url) urlMap[r.id] = r.url })
          return urlMap
        })
      })
    }
  }, [timelineRecords, signedUrls])

  return {
    // State
    records,
    pagination,
    isLoading,
    isInitialLoad,
    error,
    setError,
    searchQuery,
    setSearchQuery,
    activeTab,
    setActiveTab,
    deleteDialog,
    setDeleteDialog,
    lightboxOpen,
    setLightboxOpen,
    lightboxIndex,
    setLightboxIndex,
    selectedIds,
    setSelectedIds,
    signedUrls,
    setSignedUrls,
    batchDeleteDialogOpen,
    setBatchDeleteDialogOpen,
    isBatchDeleting,
    isBatchDownloading,
    viewMode,
    setViewMode,
    pageInput,
    setPageInput,

    // Timeline state
    timelineRecords,
    setTimelineRecords,
    timelinePage,
    setTimelinePage,
    hasMore,
    setHasMore,
    isLoadingMore,
    setIsLoadingMore,
    loadMoreRef,

    // Derived state
    filteredRecords,
    imageRecords,
    lightboxSlides,
    pageNumbers,

    // Callbacks
    handleSelectAll,
    handleSelect,
    handleBatchDelete,
    handleBatchDownload,
    fetchMedia,
    fetchTimelineMedia,
    handleDelete,
    handleDownload,
    handlePreview,
    handlePageChange,
  }
}
