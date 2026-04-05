import { useState, useMemo, useEffect } from 'react'
import { Image as ImageIcon, Calendar, Filter, X, Download, Trash2, Grid3X3, LayoutGrid, Clock } from 'lucide-react'
import Lightbox from 'yet-another-react-lightbox'
import Zoom from 'yet-another-react-lightbox/plugins/zoom'
import LightboxDownload from 'yet-another-react-lightbox/plugins/download'
import 'yet-another-react-lightbox/styles.css'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/Select'
import { Skeleton } from '@/components/ui/Skeleton'
import { useHistoryStore, type HistoryItem } from '@/stores/history'
import { cn } from '@/lib/utils'
import { IMAGE_MODELS } from '@/types'

type DateFilter = 'all' | 'week' | 'month'

interface ImageHistoryItem extends HistoryItem {
  type: 'image'
  outputUrl: string
  metadata?: {
    model?: string
    aspectRatio?: string
  }
}

export default function ImageGallery() {
  const { items, removeItem } = useHistoryStore()
  const [dateFilter, setDateFilter] = useState<DateFilter>('all')
  const [modelFilter, setModelFilter] = useState<string>('all')
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [lightboxIndex, setLightboxIndex] = useState(0)
  const [viewMode, setViewMode] = useState<'grid' | 'masonry'>('masonry')
  const [isLoading, setIsLoading] = useState(true)
  const [visibleCount, setVisibleCount] = useState(12)

  const LOAD_MORE_STEP = 12

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 300)
    return () => clearTimeout(timer)
  }, [])

  const imageItems = useMemo(() => {
    return items.filter((item): item is ImageHistoryItem => item.type === 'image' && !!item.outputUrl)
  }, [items])

  const filteredItems = useMemo(() => {
    let result = [...imageItems]

    if (dateFilter !== 'all') {
      const now = Date.now()
      const oneWeek = 7 * 24 * 60 * 60 * 1000
      const oneMonth = 30 * 24 * 60 * 60 * 1000

      result = result.filter(item => {
        if (dateFilter === 'week') {
          return now - item.timestamp < oneWeek
        } else if (dateFilter === 'month') {
          return now - item.timestamp < oneMonth
        }
        return true
      })
    }

    if (modelFilter !== 'all') {
      result = result.filter(item => item.metadata?.model === modelFilter)
    }

    return result
  }, [imageItems, dateFilter, modelFilter])

  const visibleImages = filteredItems.slice(0, visibleCount)
  const hasMoreImages = visibleCount < filteredItems.length

  const usedModels = useMemo(() => {
    const models = new Set<string>()
    imageItems.forEach(item => {
      if (item.metadata?.model) {
        models.add(item.metadata.model)
      }
    })
    return Array.from(models)
  }, [imageItems])

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp)
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getModelName = (modelId?: string) => {
    if (!modelId) return '未知模型'
    const model = IMAGE_MODELS.find(m => m.id === modelId)
    return model?.name || modelId
  }

  const handleDownload = async (url: string, index: number) => {
    try {
      const response = await fetch(url)
      const blob = await response.blob()
      const blobUrl = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = blobUrl
      a.download = `image-${Date.now()}-${index + 1}.png`
      a.click()
      URL.revokeObjectURL(blobUrl)
    } catch {
      window.open(url, '_blank')
    }
  }

  const handleDelete = (id: string) => {
    removeItem(id)
  }

  const openLightbox = (index: number) => {
    setLightboxIndex(index)
    setLightboxOpen(true)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary-600/20 flex items-center justify-center">
            <ImageIcon className="w-5 h-5 text-primary-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">图片库</h1>
            <p className="text-muted-foreground/70 text-sm">
              共 {filteredItems.length} 张图片
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-card/secondary/50 rounded-lg p-1">
          <button
            onClick={() => setViewMode('masonry')}
            className={cn(
              'p-2 rounded-md transition-colors',
              viewMode === 'masonry'
                ? 'bg-primary-600 text-foreground'
                : 'text-muted-foreground/70 hover:text-foreground'
            )}
            title="瀑布流"
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode('grid')}
            className={cn(
              'p-2 rounded-md transition-colors',
              viewMode === 'grid'
                ? 'bg-primary-600 text-foreground'
                : 'text-muted-foreground/70 hover:text-foreground'
            )}
            title="网格"
          >
            <Grid3X3 className="w-4 h-4" />
          </button>
        </div>
      </div>

      <Card className="bg-card/secondary/50 border-border/50">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-muted-foreground/70" />
              <span className="text-sm text-muted-foreground/70">筛选:</span>
            </div>

            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-muted-foreground/70" />
              <Select value={dateFilter} onValueChange={(v) => setDateFilter(v as DateFilter)}>
                <SelectTrigger className="w-[140px] h-8 bg-secondary/50 border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部时间</SelectItem>
                  <SelectItem value="week">本周</SelectItem>
                  <SelectItem value="month">本月</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {usedModels.length > 0 && (
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-muted-foreground/70" />
                <Select value={modelFilter} onValueChange={setModelFilter}>
                  <SelectTrigger className="w-[160px] h-8 bg-secondary/50 border-border">
                    <SelectValue placeholder="选择模型" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部模型</SelectItem>
                    {usedModels.map(modelId => (
                      <SelectItem key={modelId} value={modelId}>
                        {getModelName(modelId)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {(dateFilter !== 'all' || modelFilter !== 'all') && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setDateFilter('all')
                  setModelFilter('all')
                }}
                className="h-8 text-muted-foreground/70 hover:text-foreground"
              >
                <X className="w-4 h-4 mr-1" />
                清除筛选
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className={cn(
          viewMode === 'masonry'
            ? 'columns-2 md:columns-3 lg:columns-4 xl:columns-5 gap-4'
            : 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4'
        )}>
          {[...Array(8)].map((_, index) => (
            <div key={index} className={cn(
              'mb-4',
              viewMode === 'grid' && 'aspect-square'
            )}>
              <Card className="overflow-hidden bg-card/secondary border-border">
                <div className={cn(
                  'relative overflow-hidden',
                  viewMode === 'masonry' ? 'aspect-auto' : 'aspect-square'
                )}>
                  <Skeleton className="w-full h-full" />
                </div>
                <CardContent className="p-3 space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-3 w-16" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      ) : filteredItems.length > 0 ? (
        <>
          <div className={cn(
            viewMode === 'masonry'
              ? 'columns-2 md:columns-3 lg:columns-4 xl:columns-5 gap-4'
              : 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4'
          )}>
            <AnimatePresence mode="popLayout">
              {visibleImages.map((item, index) => (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.2 }}
                className={cn(
                  'group relative mb-4',
                  viewMode === 'grid' && 'aspect-square'
                )}
              >
                <Card className="overflow-hidden bg-card/secondary border-border hover:border-primary-500/50 transition-colors cursor-pointer">
                  <div
                    className={cn(
                      'relative overflow-hidden',
                      viewMode === 'masonry' ? 'aspect-auto' : 'aspect-square'
                    )}
                    onClick={() => openLightbox(index)}
                  >
                    <img
                      src={item.outputUrl}
                      alt={item.input}
                      className={cn(
                        'w-full object-cover transition-transform duration-300 group-hover:scale-105',
                        viewMode === 'masonry' ? '' : 'h-full'
                      )}
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-background/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDownload(item.outputUrl, index)
                        }}
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDelete(item.id)
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  <CardContent className="p-3 space-y-2">
                    <p className="text-xs text-muted-foreground line-clamp-2" title={item.input}>
                      {item.input}
                    </p>
                    <div className="flex items-center justify-between">
                      <Badge variant="secondary" className="text-[10px]">
                        {getModelName(item.metadata?.model)}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground/50">
                        {formatDate(item.timestamp)}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {hasMoreImages && (
          <div className="flex justify-center mt-6">
            <Button
              variant="outline"
              onClick={() => setVisibleCount(prev => prev + LOAD_MORE_STEP)}
              className="w-full max-w-xs"
            >
              加载更多
            </Button>
          </div>
        )}
      </>
      ) : (
        <Card className="bg-card/secondary/30 border-border/50">
          <CardContent className="flex flex-col items-center justify-center py-20">
            <div className="w-16 h-16 rounded-full bg-secondary/50 flex items-center justify-center mb-4">
              <ImageIcon className="w-8 h-8 text-muted-foreground/50" />
            </div>
            <h3 className="text-lg font-medium text-muted-foreground mb-2">
              暂无图片
            </h3>
            <p className="text-sm text-muted-foreground/50 text-center max-w-sm">
              {imageItems.length === 0
                ? '您还没有生成过任何图片。前往图片生成页面开始创作吧！'
                : '没有符合当前筛选条件的图片，请尝试调整筛选条件。'}
            </p>
            {imageItems.length === 0 && (
              <Button
                variant="default"
                className="mt-6"
                onClick={() => window.location.href = '/image'}
              >
                <ImageIcon className="w-4 h-4 mr-2" />
                去生成图片
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      <Lightbox
        open={lightboxOpen}
        close={() => setLightboxOpen(false)}
        index={lightboxIndex}
        slides={filteredItems.map(item => ({ src: item.outputUrl, title: item.input }))}
        plugins={[Zoom, LightboxDownload]}
      />
    </div>
  )
}
