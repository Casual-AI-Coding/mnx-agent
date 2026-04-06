import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { FolderOpen, Upload, Trash2, FileText, Image, Music, Video, File, RefreshCw, Search, X, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { PageHeader } from '@/components/shared/PageHeader'
import { useSettingsStore } from '@/settings/store'
import { usePagination } from '@/hooks/usePagination'
import { listFiles, uploadFile, deleteFile } from '@/lib/api/file'
import { cn } from '@/lib/utils'
import { services, status } from '@/themes/tokens'

interface FileItem {
  file_id: string
  file_name: string
  file_size: number
  created_at: string
  purpose?: string
}

const FILE_TYPE_CONFIG: Record<string, { icon: typeof File; color: string }> = {
  image: { icon: Image, color: services.image.icon },
  audio: { icon: Music, color: services.music.icon },
  video: { icon: Video, color: services.video.icon },
  text: { icon: FileText, color: status.success.icon },
  default: { icon: File, color: 'text-muted-foreground' },
}

function getFileTypeConfig(fileName: string) {
  const ext = fileName.split('.').pop()?.toLowerCase()
  if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext || '')) return FILE_TYPE_CONFIG.image
  if (['mp3', 'wav', 'flac', 'aac', 'ogg'].includes(ext || '')) return FILE_TYPE_CONFIG.audio
  if (['mp4', 'avi', 'mov', 'mkv', 'webm'].includes(ext || '')) return FILE_TYPE_CONFIG.video
  if (['txt', 'json', 'xml', 'csv', 'md'].includes(ext || '')) return FILE_TYPE_CONFIG.text
  return FILE_TYPE_CONFIG.default
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
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

export default function FileManagement() {
  const { t } = useTranslation()
  const [files, setFiles] = useState<FileItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [page, setPage] = useState(1)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { settings } = useSettingsStore()
  const apiKey = settings.api.minimaxKey

  const ITEMS_PER_PAGE = 20

  const fetchFiles = async () => {
    if (!apiKey) return

    setIsLoading(true)
    setError(null)

    try {
      const data = await listFiles()
      setFiles(data.files || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取文件列表失败')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchFiles()
  }, [apiKey])

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !apiKey) return

    setUploading(true)
    setUploadProgress(0)
    setError(null)

    try {
      await uploadFile(file)
      await fetchFiles()
    } catch (err) {
      setError(err instanceof Error ? err.message : '上传失败')
    } finally {
      setUploading(false)
      setUploadProgress(0)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleDelete = async (fileId: string) => {
    if (!apiKey) return

    try {
      await deleteFile(fileId)
      setFiles(prev => prev.filter(f => f.file_id !== fileId))
    } catch (err) {
      setError(err instanceof Error ? err.message : '删除失败')
    }
  }

  const filteredFiles = files.filter(file =>
    (file.file_name || '').toLowerCase().includes(searchQuery.toLowerCase())
  )

  const { paginatedItems: pageFiles, totalPages, hasNextPage, hasPrevPage } = usePagination(filteredFiles, {
    totalItems: filteredFiles.length,
    itemsPerPage: ITEMS_PER_PAGE,
    currentPage: page,
    onPageChange: setPage,
  })

  const pageNumbers = getPageNumbers(page, totalPages)

  const totalSize = files.reduce((acc, f) => acc + f.file_size, 0)
  const textCount = files.filter(f => f.file_name.endsWith('.txt')).length
  const imageCount = files.filter(f => /\.(jpg|jpeg|png|gif|webp)$/i.test(f.file_name)).length

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<FolderOpen className="w-5 h-5" />}
        title={t('files.title', '文件管理')}
        description={t('files.subtitle', '管理上传的文件，支持 txt、zip、图片等格式')}
        gradient="green-emerald"
        actions={
          <>
            <Button variant="outline" onClick={fetchFiles} disabled={isLoading}>
              <RefreshCw className={cn('w-4 h-4 mr-2', isLoading && 'animate-spin')} />
              刷新
            </Button>
            <Button onClick={() => fileInputRef.current?.click()} disabled={uploading}>
              <Upload className="w-4 h-4 mr-2" />
              {uploading ? '上传中...' : '上传文件'}
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileUpload}
              className="hidden"
            />
          </>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <StatCard
          title="文件总数"
          value={files.length}
          icon={File}
          color={services.text.icon}
        />
        <StatCard
          title="文本文件"
          value={textCount}
          icon={FileText}
          color={status.success.icon}
        />
        <StatCard
          title="图片文件"
          value={imageCount}
          icon={Image}
          color={services.image.icon}
        />
        <StatCard
          title="总大小"
          value={formatFileSize(totalSize)}
          icon={FolderOpen}
          color={status.warning.icon}
        />
      </div>

      {uploading && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <div className="h-2 bg-muted/50 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all duration-300 rounded-full"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
              <span className="text-sm text-muted-foreground/70">{uploadProgress}%</span>
            </div>
          </CardContent>
        </Card>
      )}

      {error && (
        <Card className="border-destructive/50">
          <CardContent className="p-4 flex items-center gap-2 text-destructive">
            <AlertCircle className="w-5 h-5" />
            {error}
            <Button
              variant="ghost"
              size="sm"
              className="ml-auto"
              onClick={() => setError(null)}
            >
              <X className="w-4 h-4" />
            </Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">文件列表</CardTitle>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="搜索文件..."
                className="pl-9 w-64"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {files.length === 0 && !isLoading ? (
            <div className="text-center py-12 text-muted-foreground/70">
              <FolderOpen className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p>暂无文件</p>
              <p className="text-sm mt-2">点击上传文件按钮添加文件</p>
            </div>
          ) : (
            <div>
              <div className="divide-y divide-border">
                {pageFiles.map((file) => {
                  const typeConfig = getFileTypeConfig(file.file_name)
                  const Icon = typeConfig.icon
                  return (
                    <div
                      key={file.file_id}
                      className="flex items-center gap-4 px-6 py-3 hover:bg-muted/20 transition-colors"
                    >
                      <div className={cn('w-9 h-9 rounded-lg bg-muted/50 flex items-center justify-center', typeConfig.color)}>
                        <Icon className="w-4 h-4" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate text-sm">{file.file_name}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground/50">
                          <span>{formatFileSize(file.file_size)}</span>
                          <span>•</span>
                          <span>{new Date(file.created_at).toLocaleString()}</span>
                          {file.purpose && (
                            <>
                              <span>•</span>
                              <Badge variant="outline" className="text-xs">{file.purpose}</Badge>
                            </>
                          )}
                        </div>
                      </div>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(file.file_id)}
                        className="h-8 text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  )
                })}
              </div>

              {filteredFiles.length === 0 && files.length > 0 && (
                <div className="text-center py-8 text-muted-foreground/70">
                  <Search className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>没有找到匹配的文件</p>
                </div>
              )}

              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 py-4 border-t border-border">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setPage(p => p - 1)}
                    disabled={!hasPrevPage}
                    className="h-8"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>

                  {pageNumbers.map((pageNum, idx) => (
                    pageNum === '...' ? (
                      <span key={idx} className="px-2 text-muted-foreground/50">...</span>
                    ) : (
                      <Button
                        key={idx}
                        variant={page === pageNum ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setPage(pageNum as number)}
                        className="h-8 w-8 p-0"
                      >
                        {pageNum}
                      </Button>
                    )
                  ))}

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setPage(p => p + 1)}
                    disabled={!hasNextPage}
                    className="h-8"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function StatCard({
  title,
  value,
  icon: Icon,
  color,
}: {
  title: string
  value: string | number
  icon: typeof File
  color: string
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className={cn('p-2 rounded-lg bg-muted/50', color)}>
              <Icon className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground/70">{title}</p>
              <p className="text-xl font-bold">{value}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}