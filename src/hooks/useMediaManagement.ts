import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import type { MediaType, MediaRecord, PaginationInfo } from '@/types/media'
import {
  listMedia,
  deleteMedia as deleteMediaApi,
  getMediaDownloadUrl,
  batchDeleteMedia,
  batchDownloadMedia,
  updateMedia,
  toggleFavorite,
  togglePublic,
  batchTogglePublic,
} from '@/lib/api/media'
import { toastSuccess, toastError } from '@/lib/toast'
import { useAudioStore } from '@/stores/audio'
import { useAuthStore } from '@/stores/auth'

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
  audioPreviewRecord: MediaRecord | null
  setAudioPreviewRecord: (record: MediaRecord | null) => void
  favoriteFilters: Set<'favorite' | 'non-favorite'>
  toggleFavoriteFilter: (filter: 'favorite' | 'non-favorite') => void
  publicFilters: Set<'private' | 'public' | 'others-public'>
  togglePublicFilter: (filter: 'private' | 'public' | 'others-public') => void
  handleTogglePublic: (mediaId: string) => Promise<void>
  handleBatchTogglePublic: (ids: string[], isPublic: boolean) => Promise<{ success: boolean; data: Array<{ id: string; success: boolean; data?: import('@/lib/api/media').MediaRecord; error?: string }> }>

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
  audioRecords: MediaRecord[]
  lightboxSlides: { src: string }[]
  pageNumbers: (number | string)[]

  // Callbacks
  handleSelectAll: () => void
  handleSelect: (id: string) => void
  handleBatchDelete: () => Promise<void>
  handleBatchDownload: () => Promise<void>
  fetchMedia: (isInitial?: boolean) => Promise<void>
  fetchTimelineMedia: (page: number, reset?: boolean) => Promise<void>
  handleDelete: (record: MediaRecord) => Promise<void>
  handleDownload: (record: MediaRecord) => void
  handlePreview: (record: MediaRecord) => void
  handlePageChange: (page: number) => void
  handleRename: (id: string, newName: string) => Promise<void>
  handleToggleFavorite: (mediaId: string) => Promise<void>
  handleTabChange: (tab: string) => void
}

export function useMediaManagement(): UseMediaManagementReturn {

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
  const [favoriteFilters, setFavoriteFilters] = useState<Set<'favorite' | 'non-favorite'>>(new Set(['favorite', 'non-favorite']))
  const [publicFilters, setPublicFilters] = useState<Set<'private' | 'public' | 'others-public'>>(new Set(['private', 'public', 'others-public']))
  const currentUser = useAuthStore((state) => state.user)

  // Ref to track pagination values (to avoid dependency issues with setPagination)
  const paginationRef = useRef(pagination)
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
  
  // Global audio store
  const {
    currentRecord: audioPreviewRecord,
    setCurrentRecord: setAudioPreviewRecord,
    setPlaylist,
    setSignedUrls: setGlobalSignedUrls,
    setSignedUrl,
  } = useAudioStore()

  // Timeline state
  const [timelineRecords, setTimelineRecords] = useState<MediaRecord[]>([])
  const [timelinePage, setTimelinePage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const loadMoreRef = useRef<HTMLDivElement>(null)

  // Track fetched IDs to avoid duplicate requests
  const fetchedIdsRef = useRef<Set<string>>(new Set())

  // Track previous page to avoid unnecessary fetches
  const prevPageRef = useRef(pagination.page)
  const prevSearchQueryRef = useRef(searchQuery)

  // Derived: filtered records based on search query
  const filteredRecords = records

  // Derived: image records for lightbox
  const imageRecords = useMemo(() => {
    const source = viewMode === 'timeline' ? timelineRecords : filteredRecords
    return source.filter(r => r.type === 'image')
  }, [viewMode, timelineRecords, filteredRecords])

  const audioRecords = useMemo(() => {
    const source = viewMode === 'timeline' ? timelineRecords : filteredRecords
    return source.filter(r => r.type === 'audio' || r.type === 'music').filter(r => signedUrls[r.id])
  }, [viewMode, timelineRecords, filteredRecords, signedUrls])

  // Sync playlist and signedUrls with global audio store
  useEffect(() => {
    setPlaylist(audioRecords)
    setGlobalSignedUrls(signedUrls)
  }, [audioRecords, signedUrls, setPlaylist, setGlobalSignedUrls])

  // Set signedUrl when user selects an audio to play
  useEffect(() => {
    if (audioPreviewRecord && signedUrls[audioPreviewRecord.id]) {
      setSignedUrl(signedUrls[audioPreviewRecord.id])
    }
  }, [audioPreviewRecord, signedUrls, setSignedUrl])

  // Derived: lightbox slides (only include images that have signed URLs)
  const lightboxSlides = useMemo(() =>
    imageRecords
      .filter(r => signedUrls[r.id])
      .map(r => ({
        src: signedUrls[r.id]
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

  // Sync pagination ref when pagination changes
  useEffect(() => {
    paginationRef.current = pagination
  }, [pagination])

  // Fetch media records
  const fetchMedia = useCallback(async (isInitial = false, forcePage?: number) => {
    setIsLoading(true)
    if (isInitial) setIsInitialLoad(true)
    setError(null)

    const page = forcePage ?? paginationRef.current.page

    try {
      const validTypes: MediaType[] = ['audio', 'image', 'video', 'music']
      const type = validTypes.includes(activeTab as MediaType) ? (activeTab as MediaType) : undefined

      // 计算favorite筛选参数
      let favoriteParam: boolean | undefined
      if (favoriteFilters.has('favorite') && !favoriteFilters.has('non-favorite')) {
        favoriteParam = true
      } else if (!favoriteFilters.has('favorite') && favoriteFilters.has('non-favorite')) {
        favoriteParam = false
      } else {
        favoriteParam = undefined
      }

      // 计算public筛选参数
      let isPublicParam: boolean | undefined
      let ownerIdParam: string | undefined
      let ownerIdNotParam: string | undefined

      const hasPrivate = publicFilters.has('private')
      const hasPublic = publicFilters.has('public')
      const hasOthersPublic = publicFilters.has('others-public')

      if (hasPrivate && !hasPublic && !hasOthersPublic) {
        isPublicParam = false
      } else if (!hasPrivate && hasPublic && !hasOthersPublic) {
        isPublicParam = true
        ownerIdParam = currentUser?.id
      } else if (!hasPrivate && !hasPublic && hasOthersPublic) {
        isPublicParam = true
        ownerIdNotParam = currentUser?.id
      } else if (hasPrivate && hasPublic && !hasOthersPublic) {
        // 私有 + 自己公开 = 自己所有
        ownerIdParam = currentUser?.id
      } else if (hasPrivate && !hasPublic && hasOthersPublic) {
        // 私有 + 他人公开 = 全部可见（后端visibility已限制为：自己的私有 + 所有公开）
        // 用户想要：自己私有 + 他人公开（不含自己公开）
        // 但这个组合无法精确实现，暂时返回全部可见
        isPublicParam = undefined
        ownerIdParam = undefined
        ownerIdNotParam = undefined
      } else if (!hasPrivate && hasPublic && hasOthersPublic) {
        // 自己公开 + 他人公开 = 所有公开
        isPublicParam = true
      } else {
        // 全选或全不选 = 全部
        isPublicParam = undefined
      }

      const response = await listMedia({
        type,
        search: searchQuery.trim() || undefined,
        page,
        limit: paginationRef.current.limit,
        favorite: favoriteParam,
        isPublic: isPublicParam,
        ownerId: ownerIdParam,
        ownerIdNot: ownerIdNotParam,
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
  }, [activeTab, searchQuery, favoriteFilters, publicFilters, currentUser?.id])

  // Fetch timeline media (infinite scroll)
  const fetchTimelineMedia = useCallback(async (page: number, reset = false) => {
    if (isLoadingMore) return

    setIsLoadingMore(true)
    try {
      const validTypes: MediaType[] = ['audio', 'image', 'video', 'music']
      const type = validTypes.includes(activeTab as MediaType) ? (activeTab as MediaType) : undefined

      let favoriteParam: boolean | undefined
      if (favoriteFilters.has('favorite') && !favoriteFilters.has('non-favorite')) {
        favoriteParam = true
      } else if (!favoriteFilters.has('favorite') && favoriteFilters.has('non-favorite')) {
        favoriteParam = false
      } else {
        favoriteParam = undefined
      }

      let isPublicParam: boolean | undefined
      let ownerIdParam: string | undefined
      let ownerIdNotParam: string | undefined

      const hasPrivate = publicFilters.has('private')
      const hasPublic = publicFilters.has('public')
      const hasOthersPublic = publicFilters.has('others-public')

      if (hasPrivate && !hasPublic && !hasOthersPublic) {
        isPublicParam = false
      } else if (!hasPrivate && hasPublic && !hasOthersPublic) {
        isPublicParam = true
        ownerIdParam = currentUser?.id
      } else if (!hasPrivate && !hasPublic && hasOthersPublic) {
        isPublicParam = true
        ownerIdNotParam = currentUser?.id
      } else if (hasPrivate && hasPublic && !hasOthersPublic) {
        ownerIdParam = currentUser?.id
      } else if (hasPrivate && !hasPublic && hasOthersPublic) {
        isPublicParam = undefined
        ownerIdParam = undefined
        ownerIdNotParam = undefined
      } else if (!hasPrivate && hasPublic && hasOthersPublic) {
        isPublicParam = true
      } else {
        isPublicParam = undefined
      }

      const response = await listMedia({
        type,
        search: searchQuery.trim() || undefined,
        page,
        limit: 20,
        favorite: favoriteParam,
        isPublic: isPublicParam,
        ownerId: ownerIdParam,
        ownerIdNot: ownerIdNotParam,
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
  }, [activeTab, searchQuery, favoriteFilters, publicFilters, currentUser?.id])

  // Handle single delete
  const handleDelete = useCallback(async (record: MediaRecord) => {
    try {
      await deleteMediaApi(record.id)

      setSelectedIds(prev => {
        const next = new Set(prev)
        next.delete(record.id)
        return next
      })

      const currentPage = paginationRef.current.page
      await fetchMedia(false, currentPage)

      setDeleteDialog({ isOpen: false, record: null })
      toastSuccess('删除成功')
    } catch (err) {
      setError(err instanceof Error ? err.message : '删除失败')
    }
  }, [fetchMedia])

  // Handle download
  const handleDownload = useCallback((record: MediaRecord) => {
    const url = signedUrls[record.id] || `/api/media/${record.id}/download`
    window.open(url, '_blank')
  }, [signedUrls])

  // Handle preview (for images)
  const handlePreview = useCallback((record: MediaRecord) => {
    if (record.type === 'image' && signedUrls[record.id]) {
      const slidesWithIds = imageRecords.filter(r => signedUrls[r.id])
      const index = slidesWithIds.findIndex(r => r.id === record.id)
      if (index >= 0) {
        setLightboxIndex(index)
        setLightboxOpen(true)
      }
    } else if ((record.type === 'audio' || record.type === 'music') && signedUrls[record.id]) {
      setAudioPreviewRecord(record)
    }
  }, [imageRecords, signedUrls])

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

      const deleteCount = selectedIds.size
      setSelectedIds(new Set())

      const currentPage = paginationRef.current.page
      await fetchMedia(false, currentPage)

      setBatchDeleteDialogOpen(false)
      toastSuccess('批量删除成功', `已删除 ${deleteCount} 个文件`)
    } catch (err) {
      setError(err instanceof Error ? err.message : '批量删除失败')
    } finally {
      setIsBatchDeleting(false)
    }
  }, [selectedIds, fetchMedia])

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

  // Track previous activeTab and page to detect changes
  const prevActiveTabRef = useRef(activeTab)
  const prevPageRef = useRef(pagination.page)
  const prevSearchQueryRef = useRef(searchQuery)
  const prevFavoriteFiltersRef = useRef(favoriteFilters)
  const prevPublicFiltersRef = useRef(publicFilters)

  // Initial fetch and refetch on tab/page changes only (filters/search need manual trigger)
  useEffect(() => {
    if (isInitialLoad || activeTab !== prevActiveTabRef.current || pagination.page !== prevPageRef.current) {
      const tabChanged = activeTab !== prevActiveTabRef.current
      const pageChanged = pagination.page !== prevPageRef.current
      
      if (tabChanged || pageChanged) {
        prevActiveTabRef.current = activeTab
        prevPageRef.current = pagination.page
        fetchMedia(false)
      }
    }
  }, [fetchMedia, isInitialLoad, activeTab, pagination.page])

  // Manual search trigger - applies current filters and search query
  const handleManualSearch = useCallback(() => {
    setPagination(prev => ({ ...prev, page: 1 }))
    prevSearchQueryRef.current = searchQuery
    prevFavoriteFiltersRef.current = favoriteFilters
    prevPublicFiltersRef.current = publicFilters
    
    // Ensure minimum loading animation time (350ms) to avoid jarring flash
    const minLoadTime = 350
    const startTime = Date.now()
    setIsLoading(true)
    
    fetchMedia(true, 1).then(() => {
      const elapsed = Date.now() - startTime
      const remaining = Math.max(0, minLoadTime - elapsed)
      if (remaining > 0) {
        setTimeout(() => setIsLoading(false), remaining)
      } else {
        setIsLoading(false)
      }
    })
  }, [fetchMedia, searchQuery, favoriteFilters, publicFilters])

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

  // Fetch signed URLs for playable media (image, audio, music) in records
  useEffect(() => {
    if (records.length === 0) return

    const playableRecords = records.filter(r =>
      (r.type === 'image' || r.type === 'audio' || r.type === 'music') && !fetchedIdsRef.current.has(r.id)
    )
    if (playableRecords.length === 0) return

    playableRecords.forEach(r => fetchedIdsRef.current.add(r.id))

    Promise.all(
      playableRecords.map(async (r) => {
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
  }, [records])

  // Fetch signed URLs for playable media (image, audio, music) in timeline records
  useEffect(() => {
    if (timelineRecords.length === 0) return

    const playableRecords = timelineRecords.filter(r =>
      (r.type === 'image' || r.type === 'audio' || r.type === 'music') && !fetchedIdsRef.current.has(r.id)
    )
    if (playableRecords.length === 0) return

    playableRecords.forEach(r => fetchedIdsRef.current.add(r.id))

    Promise.all(
      playableRecords.map(async (r) => {
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
  }, [timelineRecords])

  const handleRename = useCallback(async (id: string, newName: string) => {
    await updateMedia(id, { original_name: newName })
    setRecords(prev => prev.map(r => 
      r.id === id ? { ...r, original_name: newName } : r
    ))
    setTimelineRecords(prev => prev.map(r =>
      r.id === id ? { ...r, original_name: newName } : r
    ))
  }, [setRecords, setTimelineRecords])

  const handleToggleFavorite = useCallback(async (mediaId: string) => {
    const currentFavorite = records.find(r => r.id === mediaId)?.is_favorite ?? false
    const newFavorite = !currentFavorite

    setRecords(prev => prev.map(item =>
      item.id === mediaId
        ? { ...item, is_favorite: newFavorite }
        : item
    ))

    setTimelineRecords(prev => prev.map(item =>
      item.id === mediaId
        ? { ...item, is_favorite: newFavorite }
        : item
    ))

    try {
      const result = await toggleFavorite(mediaId)

      setRecords(prev => prev.map(item =>
        item.id === mediaId
          ? { ...item, is_favorite: result.data.isFavorite }
          : item
      ))

      setTimelineRecords(prev => prev.map(item =>
        item.id === mediaId
          ? { ...item, is_favorite: result.data.isFavorite }
          : item
      ))

      toastSuccess(result.data.action === 'added' ? '已收藏' : '已取消收藏')
    } catch (error) {
      setRecords(prev => prev.map(item =>
        item.id === mediaId
          ? { ...item, is_favorite: currentFavorite }
          : item
      ))

      setTimelineRecords(prev => prev.map(item =>
        item.id === mediaId
          ? { ...item, is_favorite: currentFavorite }
          : item
      ))

      console.error('Toggle favorite failed:', error)
      toastError('操作失败，请重试')
    }
  }, [records])

  const handleTogglePublic = useCallback(async (mediaId: string) => {
    const currentPublic = records.find(r => r.id === mediaId)?.is_public ?? false
    const newPublic = !currentPublic

    setRecords(prev => prev.map(item =>
      item.id === mediaId
        ? { ...item, is_public: newPublic }
        : item
    ))

    setTimelineRecords(prev => prev.map(item =>
      item.id === mediaId
        ? { ...item, is_public: newPublic }
        : item
    ))

    try {
      const result = await togglePublic(mediaId, newPublic)

      setRecords(prev => prev.map(item =>
        item.id === mediaId
          ? { ...item, is_public: result.data.is_public }
          : item
      ))

      setTimelineRecords(prev => prev.map(item =>
        item.id === mediaId
          ? { ...item, is_public: result.data.is_public }
          : item
      ))

      toastSuccess(newPublic ? '已设为公开' : '已设为私密')
    } catch (error) {
      setRecords(prev => prev.map(item =>
        item.id === mediaId
          ? { ...item, is_public: currentPublic }
          : item
      ))

      setTimelineRecords(prev => prev.map(item =>
        item.id === mediaId
          ? { ...item, is_public: currentPublic }
          : item
      ))

      console.error('Toggle public failed:', error)
      toastError('操作失败，请重试')
    }
  }, [records])

  const handleBatchTogglePublic = useCallback(async (ids: string[], isPublic: boolean) => {
    try {
      const result = await batchTogglePublic(ids, isPublic)

      const successIds = result.data.filter(r => r.success).map(r => r.id)

      setRecords(prev => prev.map(item =>
        successIds.includes(item.id)
          ? { ...item, is_public: isPublic }
          : item
      ))

      setTimelineRecords(prev => prev.map(item =>
        successIds.includes(item.id)
          ? { ...item, is_public: isPublic }
          : item
      ))

      const successCount = successIds.length
      toastSuccess(
        isPublic ? `已设为公开 (${successCount}/${ids.length})` : `已设为私密 (${successCount}/${ids.length})`
      )

      return result
    } catch (error) {
      console.error('Batch toggle public failed:', error)
      toastError('批量操作失败，请重试')
      throw error
    }
  }, [])

  const handleTabChange = useCallback((tab: string) => {
    setActiveTab(tab)
    setPagination(prev => ({ ...prev, page: 1 }))
  }, [])

  const toggleFavoriteFilter = useCallback((filter: 'favorite' | 'non-favorite') => {
    setFavoriteFilters(prev => {
      const next = new Set(prev)
      if (next.has(filter)) {
        next.delete(filter)
      } else {
        next.add(filter)
      }
      return next.size === 0 ? new Set(['favorite', 'non-favorite']) : next
    })
    setPagination(prev => ({ ...prev, page: 1 }))
  }, [])

  const togglePublicFilter = useCallback((filter: 'private' | 'public' | 'others-public') => {
    setPublicFilters(prev => {
      const next = new Set(prev)
      if (next.has(filter)) {
        next.delete(filter)
      } else {
        next.add(filter)
      }
      return next.size === 0 ? new Set(['private', 'public', 'others-public']) : next
    })
    setPagination(prev => ({ ...prev, page: 1 }))
  }, [])

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
    audioPreviewRecord,
    setAudioPreviewRecord,
    favoriteFilters,
    toggleFavoriteFilter,
    publicFilters,
    togglePublicFilter,
    handleTogglePublic,
    handleBatchTogglePublic,
    handleManualSearch,

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
    audioRecords,
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
    handleRename,
    handleToggleFavorite,
    handleTabChange,
  }
}
