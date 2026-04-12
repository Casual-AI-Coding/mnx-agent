import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, ChevronRight, ZoomIn, Download, Loader2, AlertCircle, RotateCcw } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ImageTask } from './ImageTaskCard'

export type { ImageTask }

interface ImageCarouselProps {
  tasks: ImageTask[]
  currentIndex: number
  onPrev: () => void
  onNext: () => void
  onRetry?: (index: number) => void
  onPreview?: (batchIndex: number, imageIndex: number) => void
  onDownload?: (url: string, filename: string) => void
  imageTitle?: string
  aspectRatio?: string
}

const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 300 : -300,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    x: direction < 0 ? 300 : -300,
    opacity: 0,
  }),
}

const imageVariants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.4, ease: [0.4, 0, 0.2, 1] },
  },
}

function getAspectRatioClass(aspectRatio: string) {
  switch (aspectRatio) {
    case '1:1': return 'aspect-square'
    case '16:9': case '21:9': return 'aspect-video'
    case '4:3': case '3:2': return 'aspect-[4/3]'
    case '2:3': case '3:4': case '9:16': return 'aspect-[3/4]'
    default: return 'aspect-square'
  }
}

function getGridCols(count: number) {
  if (count === 1) return 'grid-cols-1'
  if (count === 2) return 'grid-cols-2'
  if (count <= 4) return 'grid-cols-2 md:grid-cols-2'
  if (count <= 6) return 'grid-cols-2 md:grid-cols-3'
  return 'grid-cols-2 md:grid-cols-3 lg:grid-cols-3'
}

export function ImageCarousel({
  tasks,
  currentIndex,
  onPrev,
  onNext,
  onRetry,
  onPreview,
  onDownload,
  imageTitle = '',
  aspectRatio = '1:1',
}: ImageCarouselProps) {
  const [direction, setDirection] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (tasks.length <= 1) return
      if (!containerRef.current?.contains(document.activeElement)) return

      if (e.key === 'ArrowLeft') {
        setDirection(-1)
        onPrev()
      } else if (e.key === 'ArrowRight') {
        setDirection(1)
        onNext()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [currentIndex, tasks.length, onPrev, onNext])

  const goToPrevious = () => {
    if (currentIndex > 0) {
      setDirection(-1)
      onPrev()
    }
  }

  const goToNext = () => {
    if (currentIndex < tasks.length - 1) {
      setDirection(1)
      onNext()
    }
  }

  const handleDownloadClick = useCallback((url: string, imageIndex: number) => {
    if (!onDownload) return
    const sanitizedTitle = imageTitle.trim().replace(/[^\w\u4e00-\u9fa5\-]/g, '_')
    const filename = sanitizedTitle
      ? `${sanitizedTitle}_${currentIndex + 1}_${imageIndex + 1}.png`
      : `image_${Date.now()}_${currentIndex + 1}_${imageIndex + 1}.png`
    onDownload(url, filename)
  }, [onDownload, imageTitle, currentIndex])

  const completedCount = tasks.filter(t => t.status === 'completed').length
  const failedCount = tasks.filter(t => t.status === 'failed').length

  if (tasks.length === 0) return null

  const currentTask = tasks[currentIndex]
  const urls = currentTask.imageUrls || []

  return (
    <div className="space-y-4" ref={containerRef} tabIndex={-1}>
      <div className="relative">
        {tasks.length > 1 && (
          <>
            <button
              onClick={goToPrevious}
              disabled={currentIndex === 0}
              className={cn(
                "absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 z-10",
                "p-2 rounded-lg bg-card/80 border border-border hover:bg-card transition-colors",
                currentIndex === 0 && "opacity-50 cursor-not-allowed"
              )}
            >
              <ChevronLeft className="w-5 h-5 text-foreground" />
            </button>

            <button
              onClick={goToNext}
              disabled={currentIndex === tasks.length - 1}
              className={cn(
                "absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 z-10",
                "p-2 rounded-lg bg-card/80 border border-border hover:bg-card transition-colors",
                currentIndex === tasks.length - 1 && "opacity-50 cursor-not-allowed"
              )}
            >
              <ChevronRight className="w-5 h-5 text-foreground" />
            </button>
          </>
        )}

        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={currentIndex}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
            className="w-full"
          >
            {currentTask.status === 'generating' ? (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-accent/30 to-secondary/30 blur-3xl rounded-full animate-pulse" />
                  <div className="relative w-16 h-16">
                    <div className="absolute inset-0 border-2 border-accent/30 rounded-full animate-ping" />
                    <Loader2 className="absolute inset-0 w-full h-full text-accent-foreground animate-spin" />
                  </div>
                </div>
                <p className="mt-6 text-lg font-medium text-foreground">正在生成...</p>
                <p className="text-sm text-muted-foreground mt-2">Batch {currentIndex + 1} / {tasks.length}</p>
              </div>
            ) : currentTask.status === 'failed' ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-16 h-16 rounded-full bg-error/10 flex items-center justify-center mb-4">
                  <AlertCircle className="w-8 h-8 text-error" />
                </div>
                <p className="text-lg font-medium text-foreground mb-2">Batch {currentIndex + 1} 生成失败</p>
                <p className="text-sm text-muted-foreground mb-4 max-w-md">{currentTask.error || '未知错误'}</p>
                {onRetry && currentTask.retryCount < 3 && (
                  <button
                    onClick={() => onRetry(currentIndex)}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary transition-colors"
                  >
                    <RotateCcw className="w-4 h-4" />
                    重试
                  </button>
                )}
                {currentTask.retryCount >= 3 && (
                  <p className="text-xs text-muted-foreground">已多次重试失败，请检查参数后手动重试</p>
                )}
              </div>
            ) : urls.length > 0 ? (
              <motion.div
                className={`grid ${getGridCols(urls.length)} gap-4`}
                initial="hidden"
                animate="visible"
              >
                {urls.map((url, imageIndex) => (
                  <motion.div
                    key={url}
                    variants={imageVariants}
                    transition={{ delay: imageIndex * 0.1 }}
                    className="relative group"
                  >
                    <div className="absolute -inset-0.5 bg-gradient-to-r from-accent/20 to-secondary/20 rounded-xl blur opacity-0 group-hover:opacity-100 transition duration-300" />
                    <div
                      className="relative overflow-hidden rounded-xl border border-border/50 bg-background/50 cursor-pointer"
                      onClick={() => onPreview?.(currentIndex, imageIndex)}
                    >
                      <img
                        src={url}
                        alt={`Batch ${currentIndex + 1} - Image ${imageIndex + 1}`}
                        className={`w-full ${getAspectRatioClass(aspectRatio)} object-cover`}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/20 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 flex flex-col justify-end p-4">
                        <div className="flex gap-2">
                          <button
                            onClick={(e) => { e.stopPropagation(); onPreview?.(currentIndex, imageIndex); }}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-foreground/10 hover:bg-foreground/20 text-foreground text-sm font-medium transition-colors backdrop-blur-sm"
                          >
                            <ZoomIn className="w-4 h-4" />
                            预览
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDownloadClick(url, imageIndex); }}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-foreground/10 hover:bg-foreground/20 text-foreground text-sm font-medium transition-colors backdrop-blur-sm"
                          >
                            <Download className="w-4 h-4" />
                            下载
                          </button>
                        </div>
                      </div>
                      <div className="absolute top-3 left-3 px-2 py-1 rounded-md bg-background/80 backdrop-blur-sm text-xs font-medium text-muted-foreground/70 border border-border/50">
                        {imageIndex + 1} / {urls.length}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <p className="text-lg font-medium">等待生成...</p>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {tasks.length > 1 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-center gap-2"
        >
          <span className="text-sm text-muted-foreground mr-2">
            Batch {currentIndex + 1}/{tasks.length}
          </span>

          <div className="flex items-center gap-1">
            {tasks.map((task, index) => (
              <button
                key={task.id}
                onClick={() => {
                  setDirection(index > currentIndex ? 1 : -1)
                  const diff = Math.abs(index - currentIndex)
                  for (let i = 0; i < diff; i++) {
                    if (index > currentIndex) onNext()
                    else onPrev()
                  }
                }}
                className={cn(
                  "w-2 h-2 rounded-full transition-all duration-200",
                  index === currentIndex && "w-3 h-3",
                  task.status === 'completed' && "bg-success",
                  task.status === 'generating' && "bg-info animate-pulse",
                  task.status === 'failed' && "bg-error",
                  task.status === 'idle' && "bg-muted-foreground/30"
                )}
                aria-label={`跳转到 Batch ${index + 1}`}
              />
            ))}
          </div>

          {completedCount > 0 && (
            <span className="text-xs text-success ml-2">
              {completedCount} 完成
            </span>
          )}
          {failedCount > 0 && (
            <span className="text-xs text-error ml-2">
              {failedCount} 失败
            </span>
          )}
        </motion.div>
      )}
    </div>
  )
}