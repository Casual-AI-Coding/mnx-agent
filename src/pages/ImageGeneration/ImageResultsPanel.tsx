import { ChevronLeft, ChevronRight, Download, Grid3x3, Image as LucideImage, Lightbulb, Loader2, RefreshCw, X, ZoomIn } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import Lightbox from 'yet-another-react-lightbox'
import { cn } from '@/lib/utils'
import type { ImageTask } from '@/components/image/ImageTaskCard'

const imageVariants = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: 0.5,
      ease: [0.4, 0, 0.2, 1],
    },
  },
}

interface ImageResultsPanelProps {
  currentIndex: number
  emptyTip: string
  generatedImages: string[]
  getAspectRatioClass: () => string
  getGridCols: () => string
  getGridColsForBatch: (count: number) => string
  handleDownload: (url: string, filename: string) => void
  handleImagePreview: (index: number) => void
  imageTitle: string
  lightboxIndex: number
  lightboxOpen: boolean
  onCloseLightbox: () => void
  onOpenLightboxAt: (index: number) => void
  onRetryTask: (index: number) => void
  onSetCurrentIndex: (index: number) => void
  parallelCount: number
  readyLabel: string
  resultsLabel: string
  tasks: ImageTask[]
}

export function ImageResultsPanel({
  currentIndex,
  emptyTip,
  generatedImages,
  getAspectRatioClass,
  getGridCols,
  getGridColsForBatch,
  handleDownload,
  handleImagePreview,
  imageTitle,
  lightboxIndex,
  lightboxOpen,
  onCloseLightbox,
  onOpenLightboxAt,
  onRetryTask,
  onSetCurrentIndex,
  parallelCount,
  readyLabel,
  resultsLabel,
  tasks,
}: ImageResultsPanelProps) {
  return (
    <>
      <div className="relative h-full">
        <div className="absolute -inset-0.5 bg-gradient-to-br from-accent/20 via-primary/10 to-secondary/20 rounded-2xl blur opacity-50" />
        <div className="relative bg-card/60 backdrop-blur-xl border border-border/50 rounded-xl h-full min-h-[500px] overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
            <div className="flex items-center gap-2">
              <Grid3x3 className="w-4 h-4 text-accent-foreground" />
              <span className="text-sm font-medium text-foreground">{resultsLabel}</span>
            </div>
            {tasks.length > 0 ? (
              <div className="flex items-center gap-3">
                <button
                  onClick={() => onSetCurrentIndex(Math.max(0, currentIndex - 1))}
                  disabled={currentIndex === 0}
                  className={cn('p-1 rounded-md transition-colors', currentIndex === 0 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-muted')}
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <div className="flex items-center gap-1.5">
                  {tasks.map((task, idx) => (
                    <button
                      key={task.id}
                      onClick={() => onSetCurrentIndex(idx)}
                      className={cn(
                        'w-6 h-6 rounded-full flex items-center justify-center text-xs transition-all',
                        idx === currentIndex && task.status === 'generating' && 'ring-[3px] ring-blue-500 bg-blue-500/20 text-blue-500 font-bold',
                        idx === currentIndex && task.status === 'completed' && 'ring-[3px] ring-green-500 bg-green-500/20 text-green-600 font-bold',
                        idx === currentIndex && task.status === 'failed' && 'ring-[3px] ring-red-500 bg-red-500/20 text-red-600 font-bold',
                        idx === currentIndex && task.status === 'idle' && 'ring-[3px] ring-muted-foreground bg-muted text-muted-foreground font-bold',
                        idx !== currentIndex && task.status === 'idle' && 'bg-muted text-muted-foreground font-medium',
                        idx !== currentIndex && task.status === 'generating' && 'bg-blue-500/20 text-blue-500 animate-pulse font-medium',
                        idx !== currentIndex && task.status === 'completed' && 'bg-green-500/20 text-green-600 font-medium',
                        idx !== currentIndex && task.status === 'failed' && 'bg-red-500/20 text-red-600 font-medium'
                      )}
                    >
                      {task.status === 'generating' ? <Loader2 className="w-3 h-3 animate-spin" /> : task.status === 'failed' ? <X className="w-3 h-3" /> : idx + 1}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => onSetCurrentIndex(Math.min(tasks.length - 1, currentIndex + 1))}
                  disabled={currentIndex === tasks.length - 1}
                  className={cn('p-1 rounded-md transition-colors', currentIndex === tasks.length - 1 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-muted')}
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            ) : generatedImages.length > 0 && <span className="text-xs text-muted-foreground">{generatedImages.length} 张图片</span>}
          </div>

          <div className="p-4">
            <AnimatePresence mode="wait">
              {tasks.length > 0 && tasks[currentIndex]?.status === 'generating' ? (
                <motion.div key={`loading-${currentIndex}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center justify-center py-20">
                  <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-accent/30 to-secondary/30 blur-3xl rounded-full animate-pulse" />
                    <div className="relative w-20 h-20">
                      <div className="absolute inset-0 border-2 border-accent/30 rounded-full animate-ping" />
                      <div className="absolute inset-2 border-2 border-primary/40 rounded-full animate-ping" style={{ animationDelay: '0.2s' }} />
                      <div className="absolute inset-4 border-2 border-secondary/50 rounded-full animate-ping" style={{ animationDelay: '0.4s' }} />
                      <Loader2 className="absolute inset-0 w-full h-full text-accent-foreground animate-spin" />
                    </div>
                  </div>
                  <p className="mt-8 text-lg font-medium text-foreground">正在创造...</p>
                  <p className="text-sm text-muted-foreground mt-2">Batch {currentIndex + 1} 正在生成...</p>
                </motion.div>
              ) : tasks.length > 0 && tasks[currentIndex]?.status === 'failed' ? (
                <motion.div key={`failed-${currentIndex}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center justify-center py-20">
                  <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mb-4"><X className="w-8 h-8 text-red-500" /></div>
                  <p className="text-lg font-medium text-destructive">Batch {currentIndex + 1} 生成失败</p>
                  <div className="mt-4 p-4 rounded-lg bg-destructive/10 border border-destructive/30 max-w-md"><p className="text-sm text-destructive/80 font-medium mb-2">错误信息：</p><p className="text-sm text-destructive">{tasks[currentIndex]?.error || '未知错误'}</p></div>
                  {tasks[currentIndex]?.requestParams && <div className="mt-4 p-4 rounded-lg bg-muted/30 border border-border/50 max-w-lg w-full"><p className="text-sm text-muted-foreground font-medium mb-3">请求参数：</p><div className="space-y-1 text-xs"><p><span className="text-muted-foreground">model:</span> <span className="text-foreground">{tasks[currentIndex].requestParams!.model}</span></p><p><span className="text-muted-foreground">prompt:</span> <span className="text-foreground">{tasks[currentIndex].requestParams!.prompt.slice(0, 50)}{tasks[currentIndex].requestParams!.prompt.length > 50 ? '...' : ''}</span></p><p><span className="text-muted-foreground">n:</span> <span className="text-foreground">{tasks[currentIndex].requestParams!.n}</span></p><p><span className="text-muted-foreground">aspect_ratio:</span> <span className="text-foreground">{tasks[currentIndex].requestParams!.aspect_ratio}</span></p>{tasks[currentIndex].requestParams!.seed && <p><span className="text-muted-foreground">seed:</span> <span className="text-foreground">{tasks[currentIndex].requestParams!.seed}</span></p>}</div></div>}
                  {tasks[currentIndex]?.apiResponse && <div className="mt-4 p-4 rounded-lg bg-red-500/10 border border-red-500/30 max-w-lg w-full"><p className="text-sm text-red-500/80 font-medium mb-3">API 响应（后端出参）：</p><div className="space-y-1 text-xs"><p><span className="text-red-500/70">success:</span> <span className="text-red-600">{String(tasks[currentIndex].apiResponse!.success)}</span></p>{tasks[currentIndex].apiResponse!.error?.status_code !== undefined && <p><span className="text-red-500/70">error.status_code:</span> <span className="text-red-600">{tasks[currentIndex].apiResponse!.error!.status_code}</span></p>}{tasks[currentIndex].apiResponse!.error?.status_msg && <p><span className="text-red-500/70">error.status_msg:</span> <span className="text-red-600">{tasks[currentIndex].apiResponse!.error!.status_msg}</span></p>}{tasks[currentIndex].apiResponse!.data && <>{tasks[currentIndex].apiResponse!.data!.created !== undefined && <p><span className="text-red-500/70">data.created:</span> <span className="text-red-600">{tasks[currentIndex].apiResponse!.data!.created}</span></p>}{tasks[currentIndex].apiResponse!.data!.image_urls !== undefined && <p><span className="text-red-500/70">data.image_urls:</span> <span className="text-red-600">{tasks[currentIndex].apiResponse!.data!.image_urls!.length} 个 URL</span></p>}</>}{tasks[currentIndex].apiResponse!.raw !== undefined && tasks[currentIndex].apiResponse!.raw !== null && <div className="text-xs text-red-500/60 mt-2 max-h-40 overflow-auto"><span className="font-medium">完整响应 (raw):</span><pre className="whitespace-pre-wrap mt-1">{JSON.stringify(tasks[currentIndex].apiResponse!.raw, null, 2).slice(0, 500)}</pre></div>}</div></div>}
                  {tasks[currentIndex]?.retryCount >= 3 && <p className="mt-4 text-xs text-muted-foreground">已多次重试失败，建议检查参数或稍后再试</p>}
                  <button onClick={() => onRetryTask(currentIndex)} disabled={tasks[currentIndex]?.retryCount >= 3} className={cn('mt-4 px-4 py-2 rounded-lg text-sm font-medium transition-colors', tasks[currentIndex]?.retryCount >= 3 ? 'bg-muted text-muted-foreground cursor-not-allowed' : 'bg-primary/10 text-primary hover:bg-primary/20')}><RefreshCw className="w-4 h-4 mr-2 inline" />重试生成</button>
                </motion.div>
              ) : tasks.length > 0 && tasks[currentIndex]?.imageUrls ? (
                <motion.div key={`batch-${currentIndex}`} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className={`grid ${getGridColsForBatch(tasks[currentIndex].imageUrls.length)} gap-4`}>
                  {tasks[currentIndex].imageUrls.map((url, index) => (
                    <motion.div key={url} variants={imageVariants} initial="hidden" animate="visible" transition={{ delay: index * 0.1 }} className="relative group">
                      <div className="absolute -inset-0.5 bg-gradient-to-r from-accent/20 to-secondary/20 rounded-xl blur opacity-0 group-hover:opacity-100 transition duration-300" />
                      <div className="relative overflow-hidden rounded-xl border border-border/50 bg-background/50 cursor-pointer" onClick={() => onOpenLightboxAt(index)}>
                        <img src={url} alt={`Generated ${index + 1}`} className={`w-full ${getAspectRatioClass()} object-cover`} />
                        <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/20 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 flex flex-col justify-end p-4"><div className="flex gap-2"><button onClick={e => { e.stopPropagation(); onOpenLightboxAt(index) }} className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-foreground/10 hover:bg-foreground/20 text-foreground text-sm font-medium transition-colors backdrop-blur-sm"><ZoomIn className="w-4 h-4" />预览</button><button onClick={e => { e.stopPropagation(); handleDownload(url, imageTitle.trim() ? `${imageTitle.trim().replace(/[^\w\u4e00-\u9fa5\-]/g, '_')} (${currentIndex + 1}-${index + 1}).png` : `image_${currentIndex + 1}-${index + 1}.png`) }} className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-foreground/10 hover:bg-foreground/20 text-foreground text-sm font-medium transition-colors backdrop-blur-sm"><Download className="w-4 h-4" />下载</button></div></div>
                        <div className="absolute top-3 left-3 px-2 py-1 rounded-md bg-background/80 backdrop-blur-sm text-xs font-medium text-muted-foreground/70 border border-border/50">{index + 1} / {tasks[currentIndex]?.imageUrls?.length ?? 0}</div>
                      </div>
                    </motion.div>
                  ))}
                </motion.div>
              ) : generatedImages.length > 0 && parallelCount === 1 ? (
                <motion.div key="results" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className={`grid ${getGridCols()} gap-4`}>
                  {generatedImages.map((url, index) => (
                    <motion.div key={url} variants={imageVariants} initial="hidden" animate="visible" transition={{ delay: index * 0.1 }} className="relative group">
                      <div className="absolute -inset-0.5 bg-gradient-to-r from-accent/20 to-secondary/20 rounded-xl blur opacity-0 group-hover:opacity-100 transition duration-300" />
                      <div className="relative overflow-hidden rounded-xl border border-border/50 bg-background/50 cursor-pointer" onClick={() => handleImagePreview(index)}>
                        <img src={url} alt={`Generated ${index + 1}`} className={`w-full ${getAspectRatioClass()} object-cover`} />
                        <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/20 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 flex flex-col justify-end p-4"><div className="flex gap-2"><button onClick={e => { e.stopPropagation(); handleImagePreview(index) }} className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-foreground/10 hover:bg-foreground/20 text-foreground text-sm font-medium transition-colors backdrop-blur-sm"><ZoomIn className="w-4 h-4" />预览</button><button onClick={e => { e.stopPropagation(); handleDownload(url, imageTitle.trim() ? `${imageTitle.trim().replace(/[^\w\u4e00-\u9fa5\-]/g, '_')} (${index + 1}).png` : `image_${index + 1}.png`) }} className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-foreground/10 hover:bg-foreground/20 text-foreground text-sm font-medium transition-colors backdrop-blur-sm"><Download className="w-4 h-4" />下载</button></div></div>
                        <div className="absolute top-3 left-3 px-2 py-1 rounded-md bg-background/80 backdrop-blur-sm text-xs font-medium text-muted-foreground/70 border border-border/50">{index + 1} / {generatedImages.length}</div>
                      </div>
                    </motion.div>
                  ))}
                </motion.div>
              ) : (
                <motion.div key="empty" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                  <div className="relative"><div className="absolute inset-0 bg-accent/10 blur-3xl rounded-full" /><LucideImage className="w-16 h-16 relative text-muted-foreground/50" /></div>
                  <p className="mt-6 text-lg font-medium text-muted-foreground/70">{readyLabel}</p>
                  <p className="text-sm text-muted-foreground/50 mt-2 max-w-sm text-center">{emptyTip}</p>
                  <div className="mt-8 flex flex-wrap gap-2 justify-center">{['添加细节', '指定风格', '描述光线', '设置场景'].map(tip => <span key={tip} className="px-3 py-1 rounded-full bg-secondary/50 text-xs text-muted-foreground border border-border"><Lightbulb className="w-3 h-3 inline mr-1" />{tip}</span>)}</div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      <Lightbox open={lightboxOpen} close={onCloseLightbox} index={lightboxIndex} slides={tasks.length > 0 && tasks[currentIndex]?.imageUrls ? tasks[currentIndex].imageUrls.map(url => ({ src: url })) : generatedImages.map(url => ({ src: url }))} />
    </>
  )
}
