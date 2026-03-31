import { useState, useEffect, useMemo, useCallback } from 'react'
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

async function deleteMedia(id: string): Promise<void> {
  await apiClient.client_.delete(`/media/${id}`)
}

function getDownloadUrl(id: string): string {
  return `/api/media/${id}/download`
}

function getPreviewUrl(filepath: string): string {
  return `/api/media/file/${filepath}`
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
  const [lightboxSrc, setLightboxSrc] = useState('')
  const { apiKey } = useAppStore()

  // Filter records by search query (client-side filtering)
  const filteredRecords = useMemo(() => {
    if (!searchQuery.trim()) return records
    return records.filter((record) =>
      (record.original_name || record.filename).toLowerCase().includes(searchQuery.toLowerCase())
    )
  }, [records, searchQuery])

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

  // Handle delete
  const handleDelete = async () => {
    if (!deleteDialog.record) return

    try {
      await deleteMedia(deleteDialog.record.id)
      setRecords((prev) => prev.filter((r) => r.id !== deleteDialog.record!.id))
      setDeleteDialog({ isOpen: false, record: null })
    } catch (err) {
      setError(err instanceof Error ? err.message : '删除失败')
    }
  }

  // Handle download
  const handleDownload = (record: MediaRecord) => {
    const url = getDownloadUrl(record.id)
    window.open(url, '_blank')
  }

  // Handle preview (for images)
  const handlePreview = (record: MediaRecord) => {
    if (record.type === 'image') {
      const url = getPreviewUrl(record.filepath)
      setLightboxSrc(url)
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">媒体管理</h1>
          <p className="text-muted-foreground mt-1">管理生成的音频、图片、视频和音乐文件</p>
        </div>
        <Button variant="outline" onClick={() => fetchMedia(false)} disabled={isLoading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          刷新
        </Button>
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
          {/* Error Message */}
          {error && (
            <div className="mb-4 p-4 bg-destructive/10 text-destructive rounded-lg flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              <span>{error}</span>
              <button onClick={() => setError(null)} className="ml-auto">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Table */}
          <div className={`border rounded-lg overflow-hidden transition-opacity duration-200 ${isLoading && !isInitialLoad ? 'opacity-50' : 'opacity-100'}`}>
            <table className="w-full">
              <thead className="bg-muted">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">文件名</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">类型</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">来源</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">大小</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">创建时间</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {isInitialLoad ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
                      <p className="text-muted-foreground mt-2">加载中...</p>
                    </td>
                  </tr>
                ) : filteredRecords.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                      {searchQuery ? '没有找到匹配的文件' : '暂无媒体文件'}
                    </td>
                  </tr>
                ) : (
                  filteredRecords.map((record) => (
                    <tr key={record.id} className="hover:bg-muted/50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {getTypeIcon(record.type)}
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
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination.totalPages > 0 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-muted-foreground">
                共 {pagination.total} 条记录，第 {pagination.page} / {pagination.totalPages} 页
              </p>
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
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmDialog
        isOpen={deleteDialog.isOpen}
        onClose={() => setDeleteDialog({ isOpen: false, record: null })}
        onConfirm={handleDelete}
        filename={deleteDialog.record?.original_name || deleteDialog.record?.filename || ''}
      />

      {/* Lightbox for Image Preview */}
      <Lightbox
        open={lightboxOpen}
        close={() => setLightboxOpen(false)}
        slides={[{ src: lightboxSrc }]}
      />
    </div>
  )
}
