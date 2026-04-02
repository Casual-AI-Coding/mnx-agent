import { useState, useEffect, useRef } from 'react'
import { FolderOpen, Upload, Trash2, FileText, Image, Music, Video, File, RefreshCw, Search, X, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { useAppStore } from '@/stores/app'
import { usePagination } from '@/hooks/usePagination'
import { listFiles, uploadFile, deleteFile } from '@/lib/api/file'

interface FileItem {
  file_id: string
  file_name: string
  file_size: number
  created_at: string
  purpose?: string
}

const FILE_TYPE_ICONS: Record<string, React.ReactNode> = {
  'image': <Image className="w-5 h-5" />,
  'audio': <Music className="w-5 h-5" />,
  'video': <Video className="w-5 h-5" />,
  'text': <FileText className="w-5 h-5" />,
  'default': <File className="w-5 h-5" />,
}

function getFileIcon(fileName: string): React.ReactNode {
  const ext = fileName.split('.').pop()?.toLowerCase()
  if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext || '')) return FILE_TYPE_ICONS.image
  if (['mp3', 'wav', 'flac', 'aac', 'ogg'].includes(ext || '')) return FILE_TYPE_ICONS.audio
  if (['mp4', 'avi', 'mov', 'mkv', 'webm'].includes(ext || '')) return FILE_TYPE_ICONS.video
  if (['txt', 'json', 'xml', 'csv', 'md'].includes(ext || '')) return FILE_TYPE_ICONS.text
  return FILE_TYPE_ICONS.default
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
  const [files, setFiles] = useState<FileItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [page, setPage] = useState(1)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { apiKey } = useAppStore()

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">文件管理</h1>
          <p className="text-muted-foreground text-sm">
            管理上传的文件，支持 txt、zip、图片等格式
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={fetchFiles} disabled={isLoading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
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
        </div>
      </div>

      {uploading && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
              <span className="text-sm text-muted-foreground">{uploadProgress}%</span>
            </div>
          </CardContent>
        </Card>
      )}

      {error && (
        <Card className="border-destructive">
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
            <CardTitle className="flex items-center gap-2">
              <FolderOpen className="w-5 h-5" />
              文件列表
            </CardTitle>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="搜索文件..."
                  className="pl-10 w-64"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {files.length === 0 && !isLoading ? (
            <div className="text-center py-12 text-muted-foreground">
              <FolderOpen className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p>暂无文件</p>
              <p className="text-sm mt-2">点击上传文件按钮添加文件</p>
            </div>
          ) : (
            <div className="space-y-2">
              {pageFiles.map((file) => (
                <div
                  key={file.file_id}
                  className="flex items-center gap-4 p-3 border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                    {getFileIcon(file.file_name)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{file.file_name}</p>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span>{formatFileSize(file.file_size)}</span>
                      <span>•</span>
                      <span>{new Date(file.created_at).toLocaleString()}</span>
                      {file.purpose && (
                        <>
                          <span>•</span>
                          <Badge variant="outline">{file.purpose}</Badge>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(file.file_id)}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}

              {filteredFiles.length === 0 && files.length > 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Search className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>没有找到匹配的文件</p>
                </div>
              )}

              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-6 pt-4 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => p - 1)}
                    disabled={!hasPrevPage}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>

                  {pageNumbers.map((pageNum, idx) => (
                    pageNum === '...' ? (
                      <span key={idx} className="px-2 text-muted-foreground">...</span>
                    ) : (
                      <Button
                        key={idx}
                        variant={page === pageNum ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setPage(pageNum as number)}
                        className={page === pageNum ? 'bg-primary text-foreground' : ''}
                      >
                        {pageNum}
                      </Button>
                    )
                  ))}

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => p + 1)}
                    disabled={!hasNextPage}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
                <File className="w-5 h-5" />
              </div>
              <div>
                <p className="text-2xl font-bold">{files.length}</p>
                <p className="text-sm text-muted-foreground">文件总数</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-green-100 text-green-600 flex items-center justify-center">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {files.filter(f => f.file_name.endsWith('.txt')).length}
                </p>
                <p className="text-sm text-muted-foreground">文本文件</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center">
                <Image className="w-5 h-5" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {files.filter(f => /\.(jpg|jpeg|png|gif|webp)$/i.test(f.file_name)).length}
                </p>
                <p className="text-sm text-muted-foreground">图片文件</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center">
                <FolderOpen className="w-5 h-5" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {formatFileSize(files.reduce((acc, f) => acc + f.file_size, 0))}
                </p>
                <p className="text-sm text-muted-foreground">总大小</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
