import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import {
  Image,
  Music,
  Video,
  FileAudio,
  Search,
  Trash2,
  Download,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  X,
  Eye,
  RefreshCw,
  Loader2,
  CheckSquare,
  Square,
  LayoutGrid,
  Calendar,
  List,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs'
import Lightbox from 'yet-another-react-lightbox'
import 'yet-another-react-lightbox/styles.css'
import { apiClient } from '@/lib/api/client'
import { useAppStore } from '@/stores/app'
import { 
  BatchOperationsToolbar, 
  BatchDeleteDialog,
} from '@/components/media/BatchOperationsToolbar'
import { 
  batchDeleteMedia, 
  batchDownloadMedia,
  deleteMedia,
  getMediaDownloadUrl,
} from '@/lib/api/media'
import { toastSuccess } from '@/lib/toast'
import { cn } from '@/lib/utils'

// ============================================================================
// Types
// ============================================================================

type MediaType = 'audio' | 'image' | 'video' | 'music'
type MediaSource = 'voice_sync' | 'voice_async' | 'image_generation' | 'video_generation' | 'music_generation'

interface MediaRecord {
  id: string
  filename: string
  original_name: string | null
  filepath: string
  type: MediaType
  mime_type: string | null
  size_bytes: number
  source: MediaSource | null
  task_id: string | null
  metadata: Record<string, unknown> | null
  is_deleted: boolean
  created_at: string
  updated_at: string
  deleted_at: string | null
}

interface PaginationInfo {
  page: number
  limit: number
  total: number
  totalPages: number
}

interface MediaListResponse {
  success: boolean
  data: {
    records: MediaRecord[]
    pagination: PaginationInfo
  }
}

// ============================================================================
// Constants
// ============================================================================

const MEDIA_TABS: { value: string; label: string; icon: React.ReactNode }[] = [
  { value: 'all', label: '全部', icon: <RefreshCw className="w-4 h-4" /> },
  { value: 'image', label: '图片', icon: <Image className="w-4 h-4" /> },
  { value: 'audio', label: '音频', icon: <FileAudio className="w-4 h-4" /> },
  { value: 'video', label: '视频', icon: <Video className="w-4 h-4" /> },
  { value: 'music', label: '音乐', icon: <Music className="w-4 h-4" /> },
]

const TYPE_VARIANTS: Record<MediaType, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  image: 'default',
  audio: 'secondary',
  video: 'destructive',
  music: 'outline',
}

const TYPE_LABELS: Record<MediaType, string> = {
  image: '图片',
  audio: '音频',
  video: '视频',
  music: '音乐',
}

const SOURCE_LABELS: Record<MediaSource, string> = {
  voice_sync: '语音同步',
  voice_async: '语音异步',
  image_generation: '图像生成',
  video_generation: '视频生成',
  music_generation: '音乐生成',
}

const TYPE_GRADIENTS: Record<MediaType, string> = {
  image: 'bg-muted/50',
  audio: 'bg-blue-950/50',
  video: 'bg-destructive-950/50',
  music: 'bg-purple-950/50',
}

// ============================================================================
// Helper Functions
// ============================================================================

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatDateHeader(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  })
}

function getDateKey(dateStr: string): string {
  const date = new Date(dateStr)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function getTypeIcon(type: MediaType): React.ReactNode {
  switch (type) {
    case 'image':
      return <Image className="w-4 h-4" />
    case 'audio':
      return <FileAudio className="w-4 h-4" />
    case 'video':
      return <Video className="w-4 h-4" />
    case 'music':
      return <Music className="w-4 h-4" />
    default:
      return <FileAudio className="w-4 h-4" />
  }
}

function getPageNumbers(currentPage: number, totalPages: number): (number | string)[] {
  const pages: (number | string)[] = []
  const maxVisible = 5

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
}

// ============================================================================
// API Functions
// ============================================================================

async function listMedia(params: {
  type?: MediaType
  page: number
  limit: number
}): Promise<MediaListResponse> {
  const { type, page, limit } = params
  const queryParams = new URLSearchParams()
  if (type) queryParams.append('type', type)
  queryParams.append('page', String(page))
  queryParams.append('limit', String(limit))

  const response = await apiClient.client_.get(`/media?${queryParams.toString()}`)
  return response.data
}

async function deleteMediaRecord(id: string): Promise<void> {
  await apiClient.client_.delete(`/media/${id}`)
}

function getDownloadUrl(id: string): string {
  return `/api/media/${id}/download`
}

// ============================================================================
// Components
// ============================================================================

function DeleteConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  filename,
}: {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  filename: string
}) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-background rounded-lg shadow-lg p-6 max-w-md w-full mx-4">
        <div className="flex items-start gap-4">
          <div className="p-2 bg-destructive/10 rounded-full">
            <AlertCircle className="w-6 h-6 text-destructive" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold mb-2">确认删除</h3>
            <p className="text-muted-foreground mb-4">
              确定要删除文件 <span className="font-medium text-foreground">{filename}</span> 吗？此操作无法撤销。
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={onClose}>
                取消
              </Button>
              <Button variant="destructive" onClick={onConfirm}>
                删除
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function MediaCard({
  record,
  signedUrl,
  isSelected,
  onSelect,
  onPreview,
  onDownload,
  onDelete,
}: {
  record: MediaRecord
  signedUrl?: string
  isSelected: boolean
  onSelect: () => void
  onPreview: () => void
  onDownload: () => void
  onDelete: () => void
}) {
  const [showActions, setShowActions] = useState(false)

  return (
    <div
      className={`relative aspect-[4/3] rounded-lg overflow-hidden cursor-pointer transition-all duration-200 ${
        isSelected ? 'ring-2 ring-primary ring-offset-2 ring-offset-background' : ''
      } hover:scale-[1.02] hover:shadow-xl`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
      onClick={() => onSelect()}
    >
      {record.type === 'image' && signedUrl ? (
        <img
          src={signedUrl}
          alt={record.original_name || record.filename}
          className="absolute inset-0 w-full h-full object-cover"
        />
      ) : (
        <div className={`absolute inset-0 ${TYPE_GRADIENTS[record.type]} flex items-center justify-center`}>
          <div className="text-foreground/30 scale-150">{getTypeIcon(record.type)}</div>
        </div>
      )}

      <div
        className={`absolute top-2 left-2 z-10 transition-opacity duration-200 ${
          showActions || isSelected ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={(e) => {
          e.stopPropagation()
          onSelect()
        }}
      >
        <div className={`w-6 h-6 rounded-md flex items-center justify-center transition-colors ${
          isSelected ? 'bg-primary' : 'bg-black/50 hover:bg-black/70'
        }`}>
          {isSelected ? (
            <CheckSquare className="w-4 h-4 text-foreground" />
          ) : (
            <Square className="w-4 h-4 text-foreground/70" />
          )}
        </div>
      </div>

      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/50 to-transparent pt-12 pb-3 px-3">
        <div className="flex items-end justify-between gap-2">
          <div className="min-w-0 flex-1">
            <Badge variant="secondary" className="text-xs mb-1.5">
              {TYPE_LABELS[record.type]}
            </Badge>
            <p className="text-foreground text-sm font-medium truncate" title={record.original_name || record.filename}>
              {record.original_name || record.filename}
            </p>
            <p className="text-foreground/60 text-xs mt-0.5">
              {formatFileSize(record.size_bytes)}
            </p>
          </div>

          <div
            className={`flex items-center gap-1 transition-all duration-200 flex-shrink-0 ${
              showActions ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
            }`}
          >
            {record.type === 'image' && (
              <Button
                variant="secondary"
                size="sm"
                className="h-7 px-2 bg-white/20 hover:bg-white/30 text-foreground border-0"
                onClick={(e) => {
                  e.stopPropagation()
                  onPreview()
                }}
              >
                <Eye className="w-3.5 h-3.5" />
              </Button>
            )}
            <Button
              variant="secondary"
              size="sm"
              className="h-7 px-2 bg-white/20 hover:bg-white/30 text-foreground border-0"
              onClick={(e) => {
                e.stopPropagation()
                onDownload()
              }}
            >
              <Download className="w-3.5 h-3.5" />
            </Button>
            <Button
              variant="secondary"
              size="sm"
              className="h-7 px-2 bg-white/20 hover:bg-white/30 text-red-300 hover:text-red-200 border-0"
              onClick={(e) => {
                e.stopPropagation()
                onDelete()
              }}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

function TimelineItem({
  record,
  signedUrl,
  isSelected,
  onSelect,
  onPreview,
  onDownload,
  onDelete,
}: {
  record: MediaRecord
  signedUrl?: string
  isSelected: boolean
  onSelect: () => void
  onPreview: () => void
  onDownload: () => void
  onDelete: () => void
}) {
  return (
    <div
      className={`flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors ${
        isSelected ? 'bg-primary/10' : ''
      }`}
      onClick={() => onSelect()}
    >
      <button
        onClick={(e) => {
          e.stopPropagation()
          onSelect()
        }}
        className="flex-shrink-0"
      >
        {isSelected ? (
          <CheckSquare className="w-5 h-5 text-primary" />
        ) : (
          <Square className="w-5 h-5 text-muted-foreground" />
        )}
      </button>

      {record.type === 'image' && signedUrl ? (
        <img
          src={signedUrl}
          alt={record.original_name || record.filename}
          className="w-14 h-14 object-cover rounded border border-border flex-shrink-0"
        />
      ) : (
        <div className={`w-14 h-14 rounded border border-border flex items-center justify-center flex-shrink-0 ${TYPE_GRADIENTS[record.type]}`}>
          {getTypeIcon(record.type)}
        </div>
      )}

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <Badge variant={TYPE_VARIANTS[record.type]} className="text-xs">
            {TYPE_LABELS[record.type]}
          </Badge>
          <span className="text-sm text-muted-foreground">
            {formatFileSize(record.size_bytes)}
          </span>
        </div>
        <p className="font-medium truncate mt-1" title={record.original_name || record.filename}>
          {record.original_name || record.filename}
        </p>
        <p className="text-xs text-muted-foreground">
          {new Date(record.created_at).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>

      <div className="flex items-center gap-1 flex-shrink-0">
        {record.type === 'image' && (
          <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); onPreview() }}>
            <Eye className="w-4 h-4" />
          </Button>
        )}
        <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); onDownload() }}>
          <Download className="w-4 h-4" />
        </Button>
        <Button variant="ghost" size="sm" className="text-destructive" onClick={(e) => { e.stopPropagation(); onDelete() }}>
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    </div>
  )
}

// ============================================================================
// Main Component
// ============================================================================

export default function MediaManagement() {
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
  const [deleteDialog, setDeleteDialog] = useState<{ isOpen: boolean; record: MediaRecord | null }>({
    isOpen: false,
    record: null,
  })
const [lightboxOpen, setLightboxOpen] = useState(false)
  const [lightboxIndex, setLightboxIndex] = useState(0)
  const { apiKey } = useAppStore()

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({})
  const [batchDeleteDialogOpen, setBatchDeleteDialogOpen] = useState(false)
  const [isBatchDeleting, setIsBatchDeleting] = useState(false)
  const [isBatchDownloading, setIsBatchDownloading] = useState(false)
  const [viewMode, setViewMode] = useState<'table' | 'timeline' | 'card'>('table')
  const [pageInput, setPageInput] = useState('')

  const [timelineRecords, setTimelineRecords] = useState<MediaRecord[]>([])
  const [timelinePage, setTimelinePage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const loadMoreRef = useRef<HTMLDivElement>(null)

  const handleSelectAll = () => {
    if (selectedIds.size === filteredRecords.length && filteredRecords.length > 0) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filteredRecords.map(m => m.id)))
    }
  }

  const handleSelect = (id: string) => {
    const newSelected = new Set(selectedIds)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedIds(newSelected)
  }

  useEffect(() => {
    setSelectedIds(new Set())
  }, [activeTab, pagination.page])

  const handleBatchDelete = async () => {
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
  }

  const handleBatchDownload = async () => {
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
  }

  const filteredRecords = useMemo(() => {
    if (!searchQuery.trim()) return records
    return records.filter((record) =>
      (record.original_name || record.filename).toLowerCase().includes(searchQuery.toLowerCase())
    )
  }, [records, searchQuery])

  const imageRecords = useMemo(() => {
    const source = viewMode === 'timeline' ? timelineRecords : filteredRecords
    return source.filter(r => r.type === 'image')
  }, [viewMode, timelineRecords, filteredRecords])

  const lightboxSlides = useMemo(() => 
    imageRecords.map(r => ({
      src: signedUrls[r.id] || `/api/media/${r.id}/download`
    })),
    [imageRecords, signedUrls]
  )

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

  useEffect(() => {
    if (viewMode === 'timeline' && timelineRecords.length === 0) {
      fetchTimelineMedia(1, true)
    }
  }, [viewMode])

  useEffect(() => {
    if (viewMode === 'timeline') {
      setTimelineRecords([])
      setTimelinePage(1)
      setHasMore(true)
    }
  }, [activeTab, viewMode])

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

  useEffect(() => {
    if (timelineRecords.length > 0) {
      const imageRecords = timelineRecords.filter(r => r.type === 'image' && !signedUrls[r.id])
      if (imageRecords.length > 0) {
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
    }
  }, [timelineRecords])

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

  useEffect(() => {
    if (isInitialLoad) {
      fetchMedia(true)
    }
  }, [fetchMedia, isInitialLoad])

  useEffect(() => {
    if (!isInitialLoad) {
      setPagination((prev) => ({ ...prev, page: 1 }))
    }
  }, [activeTab])

  useEffect(() => {
    if (!isInitialLoad) {
      fetchMedia(false)
    }
  }, [activeTab, pagination.page])

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
  }, [records])

  // Handle single delete
  const handleDelete = async () => {
    if (!deleteDialog.record) return

    try {
      await deleteMediaRecord(deleteDialog.record.id)
      setRecords((prev) => prev.filter((r) => r.id !== deleteDialog.record!.id))
      setDeleteDialog({ isOpen: false, record: null })
      toastSuccess('删除成功')
    } catch (err) {
      setError(err instanceof Error ? err.message : '删除失败')
    }
  }

  // Handle download
  const handleDownload = (record: MediaRecord) => {
    const url = signedUrls[record.id] || getDownloadUrl(record.id)
    window.open(url, '_blank')
  }

  // Handle preview (for images)
  const handlePreview = (record: MediaRecord) => {
    if (record.type === 'image') {
      const index = imageRecords.findIndex(r => r.id === record.id)
      setLightboxIndex(index >= 0 ? index : 0)
      setLightboxOpen(true)
    }
  }

  // Handle page change
  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= pagination.totalPages) {
      setPagination((prev) => ({ ...prev, page }))
    }
  }

  const pageNumbers = getPageNumbers(pagination.page, pagination.totalPages)

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">媒体管理</h1>
          <p className="text-muted-foreground/70 mt-1">管理生成的音频、图片、视频和音乐文件</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-muted/50 rounded-lg p-1">
            <Button
              variant={viewMode === 'table' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('table')}
              className="h-8 px-3"
            >
              <List className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === 'card' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('card')}
              className="h-8 px-3"
            >
              <LayoutGrid className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === 'timeline' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('timeline')}
              className="h-8 px-3"
            >
              <Calendar className="w-4 h-4" />
            </Button>
          </div>
          <Button variant="outline" onClick={() => fetchMedia(false)} disabled={isLoading}>
            <RefreshCw className={cn('w-4 h-4 mr-2', isLoading && 'animate-spin')} />
            刷新
          </Button>
        </div>
      </div>

      {/* Tabs and Search */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList>
                {MEDIA_TABS.map((tab) => (
                  <TabsTrigger key={tab.value} value={tab.value}>
                    <span className="flex items-center gap-2">
                      {tab.icon}
                      {tab.label}
                    </span>
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="搜索文件名..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 w-full sm:w-64"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                >
                  <X className="w-4 h-4 text-muted-foreground hover:text-foreground" />
                </button>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {error && (
            <div className="mb-4 p-4 bg-destructive/10 text-destructive rounded-lg flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              <span>{error}</span>
              <button onClick={() => setError(null)} className="ml-auto">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          <div className={`transition-opacity duration-200 ${isLoading && !isInitialLoad ? 'opacity-50' : 'opacity-100'}`}>
            {isInitialLoad ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                <p className="text-muted-foreground mt-2">加载中...</p>
              </div>
            ) : filteredRecords.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                {searchQuery ? '没有找到匹配的文件' : '暂无媒体文件'}
              </div>
            ) : viewMode === 'card' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredRecords.map((record) => (
                  <MediaCard
                    key={record.id}
                    record={record}
                    signedUrl={signedUrls[record.id]}
                    isSelected={selectedIds.has(record.id)}
                    onSelect={() => handleSelect(record.id)}
                    onPreview={() => handlePreview(record)}
                    onDownload={() => handleDownload(record)}
                    onDelete={() => setDeleteDialog({ isOpen: true, record })}
                  />
                ))}
              </div>
            ) : viewMode === 'timeline' ? (
              <div className="border rounded-lg overflow-hidden">
                {timelineRecords.length === 0 && isLoadingMore ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                    <p className="text-muted-foreground mt-2">加载中...</p>
                  </div>
                ) : timelineRecords.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    暂无媒体文件
                  </div>
                ) : (
                  <>
                    {(() => {
                      let lastDateKey = ''
                      return timelineRecords.map((record) => {
                        const dateKey = getDateKey(record.created_at)
                        const showDateHeader = dateKey !== lastDateKey
                        lastDateKey = dateKey
                        
                        return (
                          <div key={record.id}>
                            {showDateHeader && (
                              <div className="sticky top-0 z-10 flex items-center gap-3 px-4 py-2 bg-muted border-b text-sm font-medium">
                                <Calendar className="w-4 h-4 text-muted-foreground" />
                                <span>{formatDateHeader(record.created_at)}</span>
                              </div>
                            )}
                            <TimelineItem
                              record={record}
                              signedUrl={signedUrls[record.id]}
                              isSelected={selectedIds.has(record.id)}
                              onSelect={() => handleSelect(record.id)}
                              onPreview={() => handlePreview(record)}
                              onDownload={() => handleDownload(record)}
                              onDelete={() => setDeleteDialog({ isOpen: true, record })}
                            />
                          </div>
                        )
                      })
                    })()}
                    <div ref={loadMoreRef} className="flex justify-center py-4">
                      {isLoadingMore && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Loader2 className="w-5 h-5 animate-spin" />
                          <span>加载更多...</span>
                        </div>
                      )}
                      {!hasMore && timelineRecords.length > 0 && (
                        <span className="text-muted-foreground text-sm">已加载全部</span>
                      )}
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-muted">
                    <tr>
                      <th className="px-4 py-3 text-left">
                        <button
                          onClick={handleSelectAll}
                          className="flex items-center justify-center w-5 h-5 rounded border border-muted-foreground/30 hover:border-primary/50 transition-colors"
                          disabled={filteredRecords.length === 0}
                          aria-label={selectedIds.size === filteredRecords.length && filteredRecords.length > 0 ? '取消全选' : '全选'}
                        >
                          {selectedIds.size === filteredRecords.length && filteredRecords.length > 0 ? (
                            <CheckSquare className="w-4 h-4 text-primary" />
                          ) : selectedIds.size > 0 ? (
                            <div className="w-3 h-3 bg-primary rounded-sm" />
                          ) : (
                            <Square className="w-4 h-4 text-muted-foreground" />
                          )}
                        </button>
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">文件名</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">类型</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">来源</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">大小</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">创建时间</th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filteredRecords.map((record) => (
                      <tr
                        key={record.id}
                        className={`hover:bg-muted/50 ${selectedIds.has(record.id) ? 'bg-primary/5' : ''}`}
                      >
                        <td className="px-4 py-3">
                          <button
                            onClick={() => handleSelect(record.id)}
                            className="flex items-center justify-center w-5 h-5 rounded border border-muted-foreground/30 hover:border-primary/50 transition-colors"
                            aria-label={selectedIds.has(record.id) ? '取消选择' : '选择'}
                          >
                            {selectedIds.has(record.id) ? (
                              <CheckSquare className="w-4 h-4 text-primary" />
                            ) : (
                              <Square className="w-4 h-4 text-muted-foreground" />
                            )}
                          </button>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            {record.type === 'image' ? (
                              <img
                                src={signedUrls[record.id] || ''}
                                alt={record.original_name || record.filename}
                                className="w-10 h-10 object-cover rounded border border-border"
                              />
                            ) : (
                              <div className="w-10 h-10 flex items-center justify-center rounded border border-border bg-muted/50">
                                {getTypeIcon(record.type)}
                              </div>
                            )}
                            <span className="font-medium truncate max-w-[200px]" title={record.original_name || record.filename}>
                              {record.original_name || record.filename}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={TYPE_VARIANTS[record.type]}>
                            {TYPE_LABELS[record.type]}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {record.source ? SOURCE_LABELS[record.source] || record.source : '-'}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {formatFileSize(record.size_bytes)}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {formatDate(record.created_at)}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-2">
                            {record.type === 'image' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handlePreview(record)}
                                title="预览"
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDownload(record)}
                              title="下载"
                            >
                              <Download className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:text-destructive"
                              onClick={() => setDeleteDialog({ isOpen: true, record })}
                              title="删除"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Pagination */}
          {pagination.totalPages > 0 && viewMode !== 'timeline' && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-muted-foreground">
                共 {pagination.total} 条记录，第 {pagination.page} / {pagination.totalPages} 页
              </p>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">跳转到</span>
                  <Input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={pageInput}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, '')
                      setPageInput(value)
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        const page = parseInt(pageInput)
                        if (page >= 1 && page <= pagination.totalPages) {
                          handlePageChange(page)
                          setPageInput('')
                        }
                      }
                    }}
                    placeholder={String(pagination.page)}
                    className="w-16 h-8 text-center"
                  />
                  <span className="text-sm text-muted-foreground">页</span>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(pagination.page - 1)}
                    disabled={pagination.page === 1}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  {pageNumbers.map((page, index) => (
                    <Button
                      key={index}
                      variant={page === pagination.page ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => typeof page === 'number' && handlePageChange(page)}
                      disabled={typeof page !== 'number'}
                      className={typeof page !== 'number' ? 'cursor-default' : ''}
                    >
                      {page}
                    </Button>
                  ))}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(pagination.page + 1)}
                    disabled={pagination.page === pagination.totalPages}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <DeleteConfirmDialog
        isOpen={deleteDialog.isOpen}
        onClose={() => setDeleteDialog({ isOpen: false, record: null })}
        onConfirm={handleDelete}
        filename={deleteDialog.record?.original_name || deleteDialog.record?.filename || ''}
      />

      <BatchDeleteDialog
        isOpen={batchDeleteDialogOpen}
        onClose={() => setBatchDeleteDialogOpen(false)}
        onConfirm={handleBatchDelete}
        selectedCount={selectedIds.size}
        isDeleting={isBatchDeleting}
      />

      <BatchOperationsToolbar
        selectedCount={selectedIds.size}
        onDelete={() => setBatchDeleteDialogOpen(true)}
        onDownload={handleBatchDownload}
        onClearSelection={() => setSelectedIds(new Set())}
        isDeleting={isBatchDeleting}
        isDownloading={isBatchDownloading}
      />

      <Lightbox
        open={lightboxOpen}
        close={() => setLightboxOpen(false)}
        index={lightboxIndex}
        on={{ view: ({ index }) => setLightboxIndex(index) }}
        slides={lightboxSlides}
      />
    </div>
  )
}
